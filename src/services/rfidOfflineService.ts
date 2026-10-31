import { supabase } from '../supabaseClient';
import {
    buildRfidUidCandidates,
    buildRfidUidPrefixCandidates,
    canonicalQrTokenForMatch,
    extractAttendanceUidFromQrPayload,
    sanitizeRfidUid,
} from '../utils/rfidUtils';

const DB_NAME = 'rfid_attendance_db';
const DB_VERSION = 5;
const STORE_MAPPINGS = 'mappings';
const STORE_QUEUE = 'scan_queue';
const STORE_CONFIG = 'config';
const STORE_DAILY_HISTORY = 'daily_history';
const KEY_ACTIVE_SESSION = 'active_session';
const KEY_ATTN_SETTINGS = 'attn_settings';
const NATIVE_RFID_CACHE_PREFIX = 'native_rfid_mappings_';
const NATIVE_ATTN_SETTINGS_PREFIX = 'native_attn_settings_';
const NATIVE_ACTIVE_SESSION_PREFIX = 'native_active_session_';
const NATIVE_DAILY_HISTORY_PREFIX = 'native_daily_history_';
const WEB_RFID_CACHE_PREFIX = 'web_rfid_mappings_';

export interface RFIDMapping {
    rfid_uid: string;
    person_id: number;
    name: string;
    type: 'student' | 'employee';
    attendance_mode?: 'rfid_required' | 'manual_only' | 'hybrid' | null;
    class_name?: string;
    section_name?: string;
    class_id?: number;
    section_id?: number;
    roll_number?: string;
    role?: string;
    picture_url?: string;
    father_name?: string;
    status?: string;
    face_embedding?: string | number[] | Float32Array | null;
    face_embedding_dim?: number;
    qr_uid?: string | null;
}

export interface QueuedScan {
    id?: number;
    rfid_uid: string;
    person_id: number;
    person_type: 'student' | 'employee';
    school_id: number;
    session_id: number | null;
    date: string;
    timestamp: string;
    scan_type?: 'in' | 'out';
    class_id?: number;
    section_id?: number;
    platform?: 'web' | 'electron' | 'mobile';
    sync_status?: 'pending' | 'synced';
    sequence_order?: number;
    synced_at?: string | null;
    source: 'rfid-offline';
    status?: string;
}

type RuntimePlatform = 'web' | 'electron' | 'mobile';
type ScanMode = 'online' | 'offline';
type ScanHistoryAction = 'present' | 'late' | 'checkout' | 'ignored' | 'already_checked_out';

export interface CachedAttendanceHistoryItem {
    key: string;
    school_id: number;
    date: string;
    person_id: number;
    person_type: 'student' | 'employee';
    name: string;
    father_name?: string;
    roll_number?: string;
    role?: string;
    class_id?: number;
    section_id?: number;
    class_name?: string;
    section_name?: string;
    picture_url?: string;
    status?: string | null;
    check_in_time?: string | null;
    check_out_time?: string | null;
    late_count?: number | null;
    source?: string | null;
    updated_at?: string;
}

class RFIDOfflineService {
    private async fetchAndCacheImage(url: string): Promise<string | null> {
        if (!url || url.startsWith('data:')) return url;
        try {
            const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
            if (!response.ok) return null;
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('Failed to fetch and cache image:', url, error);
            return null;
        }
    }

    private db: IDBDatabase | null = null;
    private inMemoryTodayScans: Map<string, { status: string; check_in_time: string; check_out_time: string | null }> = new Map();
    private memoryMappingsByUid: Map<string, RFIDMapping> = new Map();
    private memoryUniqueMappings: RFIDMapping[] = [];
    private memoryMappingsByPersonKey: Map<string, RFIDMapping> = new Map();
    private memoryConfig: Map<string, any> = new Map();
    private memoryDailyHistory: Map<string, CachedAttendanceHistoryItem> = new Map();
    private hydratedHistoryDates: Set<string> = new Set();
    private lastMappingsFetchedAt: number = 0;
    private lastSessionRefreshAt: number = 0;
    private lastSettingsRefreshAt: number = 0;
    private lastHolidaysRefreshAt: number = 0;
    private lastSlowNetworkAt: number = 0;
    private lastHistoryRefresh: number = 0;
    private historyRefreshInterval: number = 60000;
    private cachedServerTimestamp: { timestamp: string; fetchedAt: number } | null = null;
    private serverTimestampCacheDuration: number = 30000;
    // Mutex: prevents concurrent cacheMappings calls from racing and corrupting the store
    private cacheMappingsPromise: Promise<void> | null = null;

    private registerMappingInMemory(mapping: RFIDMapping, extraKeys?: Iterable<string>): void {
        if (!mapping) return;
        const personKey = `${mapping.type}_${mapping.person_id}`;
        const existing = this.memoryMappingsByPersonKey.get(personKey);
        if (existing?.picture_url?.startsWith('data:') && (!mapping.picture_url || !mapping.picture_url.startsWith('data:'))) {
            mapping.picture_url = existing.picture_url;
        }
        const normalizedMode = this.normalizeAttendanceMode(mapping.attendance_mode, true);
        const normalizedMapping: RFIDMapping = {
            ...mapping,
            attendance_mode: normalizedMode,
        };
        this.memoryMappingsByPersonKey.set(personKey, normalizedMapping);

        const keys = new Set<string>();
        if (mapping.rfid_uid) {
            keys.add(mapping.rfid_uid);
            buildRfidUidCandidates(mapping.rfid_uid).forEach(u => keys.add(u));
            const cq = canonicalQrTokenForMatch(mapping.rfid_uid);
            if (cq.length >= 4) keys.add(cq);
        }
        if (mapping.qr_uid) {
            const qRaw = String(mapping.qr_uid).trim();
            if (qRaw) {
                const canon = canonicalQrTokenForMatch(qRaw);
                if (canon.length >= 4) keys.add(canon);
                buildRfidUidCandidates(qRaw).forEach(u => keys.add(u));
            }
        }
        if (extraKeys) {
            Array.from(extraKeys).forEach(k => {
                if (k) keys.add(k);
            });
        }
        keys.forEach(uid => {
            this.memoryMappingsByUid.set(uid, normalizedMapping);
        });
    }

    private rebuildUniqueMappingsList(): void {
        this.memoryUniqueMappings = Array.from(this.memoryMappingsByPersonKey.values());
    }

    private async persistNativeBackgroundCache(
        schoolId: string,
        mappings: RFIDMapping[],
        settings?: any,
        sessionId?: number | null
    ): Promise<void> {
        // No-op on web-only website
    }

    private persistWebFallbackMappings(schoolId: string, mappings: RFIDMapping[]): void {
        try {
            localStorage.setItem(`${WEB_RFID_CACHE_PREFIX}${schoolId}`, JSON.stringify(mappings));
        } catch (error) {
            console.warn('Failed to persist web RFID fallback cache:', error);
        }
    }

    private readWebFallbackMappings(schoolId: string): RFIDMapping[] {
        try {
            const raw = localStorage.getItem(`${WEB_RFID_CACHE_PREFIX}${schoolId}`);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Failed to read web RFID fallback cache:', error);
            return [];
        }
    }

    private async readNativeFallbackMappings(schoolId: string): Promise<RFIDMapping[]> {
        return [];
    }

    private async replaceIndexedDbMappings(mappings: RFIDMapping[]): Promise<void> {
        mappings.forEach(m => this.registerMappingInMemory(m));
        this.rebuildUniqueMappingsList();

        const db = await this.getDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_MAPPINGS, 'readwrite');
            const store = tx.objectStore(STORE_MAPPINGS);
            store.clear();

            mappings.forEach(mapping => {
                if (mapping?.rfid_uid) {
                    const normalizedMode = this.normalizeAttendanceMode(mapping.attendance_mode, true);
                    const uidCandidates = buildRfidUidCandidates(mapping.rfid_uid);

                    uidCandidates.forEach((uidCandidate) => {
                        store.put({
                            ...mapping,
                            rfid_uid: uidCandidate,
                            attendance_mode: normalizedMode,
                        });
                    });
                }
            });

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    private async rehydrateMappingsFromFallbackCache(schoolId: string): Promise<boolean> {
        const webMappings = this.readWebFallbackMappings(schoolId);
        const nativeMappings = await this.readNativeFallbackMappings(schoolId);
        const mergedMappings = [...webMappings, ...nativeMappings].filter(mapping => !!mapping?.rfid_uid);

        if (mergedMappings.length === 0) {
            return false;
        }

        const uniqueMappings = Array.from(
            new Map(mergedMappings.flatMap(mapping => {
                const uidCandidates = buildRfidUidCandidates(mapping.rfid_uid);
                return uidCandidates.map(uidCandidate => [uidCandidate, {
                    ...mapping,
                    rfid_uid: uidCandidate,
                }] as const);
            })).values()
        );

        await this.replaceIndexedDbMappings(uniqueMappings);
        return true;
    }

    private async persistNativeDailyHistory(
        schoolId: number | string,
        date: string,
        historyItems: CachedAttendanceHistoryItem[]
    ): Promise<void> {
        // No-op on web-only website
    }

    private buildDailyHistoryKey(
        schoolId: number | string,
        date: string,
        personType: 'student' | 'employee',
        personId: number | string
    ): string {
        return `${schoolId}:${date}:${personType}:${personId}`;
    }

    private isEmployeeActiveAttendance(existing: {
        status?: string | null;
        check_in_time?: string | null;
        check_out_time?: string | null;
    } | null | undefined): boolean {
        if (!existing) return false;

        const normalizedStatus = (existing.status || '').toLowerCase();
        return (normalizedStatus === 'present' || normalizedStatus === 'late') && !existing.check_out_time;
    }

    private normalizeAttendanceMode(
        attendanceMode: 'rfid_required' | 'manual_only' | 'hybrid' | null | undefined,
        hasCard: boolean
    ): 'rfid_required' | 'manual_only' | 'hybrid' {
        // Card-assigned people should not be blocked by stale legacy manual-only values.
        // Treat them as hybrid so manual marking, RFID scans, and backend automation can coexist.
        if (hasCard && (!attendanceMode || attendanceMode === 'manual_only')) {
            return 'hybrid';
        }

        return attendanceMode || (hasCard ? 'hybrid' : 'manual_only');
    }

    private getRuntimePlatform(): RuntimePlatform {
        return 'web';
    }

    private normalizeTimeValue(value?: string | null): string | null {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
    }

    private addMinutesToTime(timeValue?: string | null, minutesToAdd: number = 0): string | null {
        const normalized = this.normalizeTimeValue(timeValue);
        if (!normalized) return null;

        const [hoursRaw, minutesRaw, secondsRaw] = normalized.split(':').map(Number);
        const totalSeconds = ((hoursRaw * 60) + minutesRaw + minutesToAdd) * 60 + (secondsRaw || 0);
        const daySeconds = ((totalSeconds % 86400) + 86400) % 86400;
        const hours = Math.floor(daySeconds / 3600);
        const minutes = Math.floor((daySeconds % 3600) / 60);
        const seconds = daySeconds % 60;

        return [hours, minutes, seconds].map(part => String(part).padStart(2, '0')).join(':');
    }

    private getLocalTimestampParts(timestamp: string, timezone?: string | null): { date: string; time: string } {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone || 'Asia/Karachi',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        });

        const partMap = formatter.formatToParts(new Date(timestamp)).reduce<Record<string, string>>((acc, part) => {
            if (part.type !== 'literal') {
                acc[part.type] = part.value;
            }
            return acc;
        }, {});

        return {
            date: `${partMap.year}-${partMap.month}-${partMap.day}`,
            time: `${partMap.hour}:${partMap.minute}:${partMap.second}`,
        };
    }

    private compareTimestampToLocalTime(timestamp: string, targetDate: string, targetTime?: string | null, timezone?: string | null): number {
        const normalizedTargetTime = this.normalizeTimeValue(targetTime);
        if (!normalizedTargetTime) return 1;

        const localParts = this.getLocalTimestampParts(timestamp, timezone);
        if (localParts.date < targetDate) return -1;
        if (localParts.date > targetDate) return 1;
        if (localParts.time < normalizedTargetTime) return -1;
        if (localParts.time > normalizedTargetTime) return 1;
        return 0;
    }

    private computeAttendanceStatus(
        personType: 'student' | 'employee',
        timestamp: string,
        targetDate: string,
        settings: any
    ): 'present' | 'late' {
        if (!settings) return 'present';

        const timezone = settings.timezone || 'Asia/Karachi';
        const markLateEnabled = personType === 'student'
            ? settings.student_mark_late_enabled !== false
            : settings.staff_mark_late_enabled !== false;

        if (!markLateEnabled) return 'present';

        const startTime = personType === 'student' ? settings.student_start_time : settings.staff_start_time;
        const lateThreshold = this.addMinutesToTime(startTime, Number(settings.grace_period_minutes || 0));

        if (!lateThreshold) return 'present';

        return this.compareTimestampToLocalTime(timestamp, targetDate, lateThreshold, timezone) > 0 ? 'late' : 'present';
    }

    private isCheckoutAllowed(timestamp: string, targetDate: string, settings: any): boolean {
        const checkoutTime = this.normalizeTimeValue(settings?.staff_end_time);
        if (!checkoutTime) return true;
        return this.compareTimestampToLocalTime(timestamp, targetDate, checkoutTime, settings?.timezone || 'Asia/Karachi') >= 0;
    }

    private async getServerTimestamp(): Promise<string | null> {
        const now = Date.now();
        if (this.cachedServerTimestamp && (now - this.cachedServerTimestamp.fetchedAt) < this.serverTimestampCacheDuration) {
            return this.cachedServerTimestamp.timestamp;
        }

        try {
            const { data, error } = await supabase.rpc('get_server_timestamp');
            if (error) return null;
            let timestamp: string | null = null;
            if (typeof data === 'string') timestamp = data;
            else if (data && typeof data === 'object' && typeof (data as any).timestamp === 'string') timestamp = (data as any).timestamp;
            
            if (timestamp) {
                this.cachedServerTimestamp = { timestamp, fetchedAt: now };
            }
            return timestamp;
        } catch (error) {
            return null;
        }
    }

    public async getActiveSessionId(schoolId: number): Promise<number | null> {
        const cachedSession = await this.getConfig(KEY_ACTIVE_SESSION);
        const now = Date.now();

        if (navigator.onLine && (now - this.lastSessionRefreshAt > 120000 || !cachedSession)) {
            this.lastSessionRefreshAt = now;
            (async () => {
                try {
                    const { data: session } = await supabase
                        .from('sessions')
                        .select('id')
                        .eq('school_id', schoolId)
                        .eq('is_active', true)
                        .maybeSingle();

                    if (session?.id) {
                        await this.cacheConfig(KEY_ACTIVE_SESSION, session.id);
                    }
                } catch (e) {}
            })();
        }

        return cachedSession ? Number(cachedSession) : null;
    }

    public async getAttendanceSettings(schoolId: number): Promise<any> {
        const cachedSettings = await this.getConfig(KEY_ATTN_SETTINGS);
        const now = Date.now();

        if (navigator.onLine && (now - this.lastSettingsRefreshAt > 120000 || !cachedSettings)) {
            this.lastSettingsRefreshAt = now;
            (async () => {
                try {
                    const { data: onlineSettings } = await supabase
                        .from('attendance_settings')
                        .select('*')
                        .eq('school_id', schoolId)
                        .maybeSingle();

                    if (onlineSettings) {
                        await this.cacheConfig(KEY_ATTN_SETTINGS, onlineSettings);
                    }
                } catch (e) {}
            })();
        }

        return cachedSettings;
    }

    private attendanceOnDemandMap: Map<number, boolean> = new Map();

    public setAttendanceOnDemand(schoolId: number, enabled: boolean): void {
        const numericId = Number(schoolId);
        this.attendanceOnDemandMap.set(numericId, enabled);
        try {
            localStorage.setItem(`attendance_on_demand_${numericId}`, enabled ? 'true' : 'false');
        } catch (e) {}
    }

    public isAttendanceOnDemand(schoolId: number): boolean {
        const numericId = Number(schoolId);
        if (this.attendanceOnDemandMap.has(numericId)) {
            return !!this.attendanceOnDemandMap.get(numericId);
        }
        try {
            const val = localStorage.getItem(`attendance_on_demand_${numericId}`);
            const enabled = val === 'true';
            this.attendanceOnDemandMap.set(numericId, enabled);
            return enabled;
        } catch (e) {
            return false;
        }
    }

    public async checkIsSundayOrHoliday(
        schoolId: number,
        targetDate?: string,
        ignoreDemandOverride: boolean = false
    ): Promise<{ isNonWorkingDay: boolean; isCalendarNonWorkingDay: boolean; reason?: string }> {
        const dateStr = targetDate || new Date().toISOString().slice(0, 10);
        let calendarReason: string | undefined = undefined;
        let isCalendarNonWorkingDay = false;

        // 1. Check if Sunday (0ms synchronous)
        const [year, month, day] = dateStr.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const d = new Date(year, month - 1, day);
            if (d.getDay() === 0) {
                isCalendarNonWorkingDay = true;
                calendarReason = 'Sunday';
            }
        }

        // 2. Check if Holiday using fast local/memory cache first, refreshing in background
        if (!isCalendarNonWorkingDay && schoolId) {
            try {
                const holidaysKey = `holidays_${schoolId}`;
                const cachedHolidays = await this.getConfig(holidaysKey);
                if (Array.isArray(cachedHolidays)) {
                    const match = cachedHolidays.find((h: any) => h.start_date <= dateStr && h.end_date >= dateStr);
                    if (match) {
                        isCalendarNonWorkingDay = true;
                        calendarReason = match.title || 'Holiday';
                    }
                }

                const now = Date.now();
                if (navigator.onLine && (now - this.lastHolidaysRefreshAt > 300000 || !Array.isArray(cachedHolidays))) {
                    this.lastHolidaysRefreshAt = now;
                    (async () => {
                        try {
                            const { data } = await supabase
                                .from('holidays')
                                .select('id, title, start_date, end_date')
                                .eq('school_id', Number(schoolId));
                            if (data) {
                                await this.cacheConfig(holidaysKey, data);
                            }
                        } catch (e) {}
                    })();
                }
            } catch (e) {
                console.warn('Error checking holiday status:', e);
            }
        }

        const demandActive = !ignoreDemandOverride && schoolId ? this.isAttendanceOnDemand(schoolId) : false;
        const isNonWorkingDay = isCalendarNonWorkingDay && !demandActive;

        return { isNonWorkingDay, isCalendarNonWorkingDay, reason: calendarReason };
    }

    private buildHistoryItem(schoolId: number, date: string, person: RFIDMapping, record: {
        status: string | null;
        check_in_time: string | null;
        check_out_time: string | null;
        late_count?: number | null;
        source: string | null;
        updated_at: string;
    }): CachedAttendanceHistoryItem {
        return {
            key: this.buildDailyHistoryKey(schoolId, date, person.type, person.person_id),
            school_id: schoolId,
            date,
            person_id: person.person_id,
            person_type: person.type,
            name: person.name,
            father_name: person.father_name,
            roll_number: person.roll_number,
            role: person.role,
            class_id: person.class_id,
            section_id: person.section_id,
            class_name: person.class_name,
            section_name: person.section_name,
            picture_url: person.picture_url,
            status: record.status,
            check_in_time: record.check_in_time,
            check_out_time: record.check_out_time,
            late_count: record.late_count,
            source: record.source,
            updated_at: record.updated_at,
        };
    }

    private async logScanHistory(entry: {
        schoolId: number;
        userId?: number | null;
        role?: 'student' | 'employee' | 'unknown';
        timestamp: string;
        platform: RuntimePlatform;
        mode: ScanMode;
        actionTaken: ScanHistoryAction;
        metadata?: Record<string, any>;
    }): Promise<void> {
        try {
            const { error } = await supabase.from('attendance_scan_history').insert({
                school_id: entry.schoolId,
                user_id: entry.userId ?? null,
                role: entry.role ?? 'unknown',
                timestamp: entry.timestamp,
                platform: entry.platform,
                mode: entry.mode,
                action_taken: entry.actionTaken,
                metadata: entry.metadata || {},
            });

            if (error) {
                console.warn('Failed to write attendance scan history:', error.message);
            }
        } catch (error) {
            console.warn('Failed to write attendance scan history:', error);
        }
    }

    private normalizeQueuedScan(scan: QueuedScan): QueuedScan {
        return {
            ...scan,
            platform: scan.platform || 'web',
            sync_status: scan.sync_status || 'pending',
            sequence_order: Number(scan.sequence_order || (scan.id ?? 0)),
            synced_at: scan.synced_at || null,
        };
    }

    public async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_MAPPINGS)) {
                    db.createObjectStore(STORE_MAPPINGS, { keyPath: 'rfid_uid' });
                }
                if (!db.objectStoreNames.contains(STORE_QUEUE)) {
                    db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(STORE_CONFIG)) {
                    db.createObjectStore(STORE_CONFIG);
                }
                if (!db.objectStoreNames.contains(STORE_DAILY_HISTORY)) {
                    const historyStore = db.createObjectStore(STORE_DAILY_HISTORY, { keyPath: 'key' });
                    historyStore.createIndex('by_school_date', ['school_id', 'date'], { unique: false });
                }

                if (db.objectStoreNames.contains(STORE_QUEUE)) {
                    const queueStore = request.transaction?.objectStore(STORE_QUEUE);
                    if (queueStore && !queueStore.indexNames.contains('by_sync_status')) {
                        queueStore.createIndex('by_sync_status', 'sync_status', { unique: false });
                    }
                    if (queueStore && !queueStore.indexNames.contains('by_school_date')) {
                        queueStore.createIndex('by_school_date', ['school_id', 'date'], { unique: false });
                    }
                }
            };

            request.onsuccess = (event: any) => {
                this.db = event.target.result;
                resolve(this.db!);
            };

            request.onerror = (event: any) => {
                reject('IndexedDB error: ' + event.target.error);
            };
        });
    }

    /**
     * Cache student and employee RFID mappings for offline lookup
     */
    async cacheMappings(schoolId: string, onProgress?: (curr: number, total: number, status: string) => void): Promise<void> {
        // Hydrate memory from existing local store immediately if empty so scans work right away
        if (this.memoryMappingsByUid.size === 0) {
            this.getAllMappings().catch(() => {});
        }

        // Skip redundant network fetch if mappings were already refreshed very recently (< 45s)
        if (
            navigator.onLine &&
            this.memoryUniqueMappings.length > 0 &&
            Date.now() - this.lastMappingsFetchedAt < 45000 &&
            !onProgress
        ) {
            return;
        }

        // If a cache refresh is already running, wait for it and skip re-running to avoid double store.clear()
        if (this.cacheMappingsPromise) {
            return this.cacheMappingsPromise;
        }
        this.cacheMappingsPromise = this._cacheMappingsImpl(schoolId, onProgress);
        try {
            await this.cacheMappingsPromise;
        } finally {
            this.cacheMappingsPromise = null;
        }
    }

    private async _cacheMappingsImpl(schoolId: string, onProgress?: (curr: number, total: number, status: string) => void): Promise<void> {
        if (!navigator.onLine) {
            await this.rehydrateMappingsFromFallbackCache(schoolId);
            return;
        }

        try {
            if (onProgress) onProgress(0, 100, 'Fetching students and staff...');
            // Fetch students, staff, session, settings, and holidays in parallel
            const [studentsRes, staffRes, sessionRes, settingsRes, holidaysRes] = await Promise.all([
                supabase
                    .from('students')
                    .select('id, name, father_name, rfid_uid, qr_uid, attendance_mode, roll_number, picture_url, status, class_id, section_id, classes:class_id(name), sections:section_id(name), face_embedding, face_embedding_dim')
                    .eq('school_id', schoolId),
                supabase
                    .from('staff')
                    .select('id, name, rfid_uid, qr_uid, attendance_mode, role, picture_url, status, face_embedding, face_embedding_dim')
                    .eq('school_id', schoolId),
                supabase
                    .from('sessions')
                    .select('id')
                    .eq('school_id', schoolId)
                    .eq('is_active', true)
                    .maybeSingle(),
                supabase
                    .from('attendance_settings')
                    .select('*')
                    .eq('school_id', schoolId)
                    .maybeSingle(),
                supabase
                    .from('holidays')
                    .select('id, title, start_date, end_date')
                    .eq('school_id', schoolId),
            ]);

            const students = studentsRes.data;
            const staff = staffRes.data;

            if (sessionRes.data?.id) {
                this.lastSessionRefreshAt = Date.now();
                await this.cacheConfig(KEY_ACTIVE_SESSION, sessionRes.data.id);
            }
            if (settingsRes.data) {
                this.lastSettingsRefreshAt = Date.now();
                await this.cacheConfig(KEY_ATTN_SETTINGS, settingsRes.data);
            }
            if (holidaysRes.data) {
                this.lastHolidaysRefreshAt = Date.now();
                await this.cacheConfig(`holidays_${schoolId}`, holidaysRes.data);
            }

            const db = await this.getDB();
            const tx = db.transaction(STORE_MAPPINGS, 'readwrite');
            const store = tx.objectStore(STORE_MAPPINGS);

            // Clear old mappings
            store.clear();

            // Add new mappings
            const serializedMappings: RFIDMapping[] = [];
            const totalCount = (students?.length || 0) + (staff?.length || 0);
            let processedCount = 0;

            if (onProgress) onProgress(0, totalCount, 'Storing local mappings...');

            students?.forEach(s => {
                const hasCard = !!(s.rfid_uid || (s as any).qr_uid);
                let rfidUid = (s.rfid_uid || (s as any).qr_uid || '') as string;
                if (!rfidUid || rfidUid.trim().length < 4) {
                    rfidUid = this.buildSyntheticFaceQueueUid(s.id);
                }
                const existingMem = this.memoryMappingsByPersonKey.get(`student_${s.id}`);
                const cachedPic = existingMem?.picture_url?.startsWith('data:') ? existingMem.picture_url : s.picture_url;
                const mapping: RFIDMapping = {
                    rfid_uid: rfidUid,
                    person_id: s.id,
                    name: s.name,
                    type: 'student',
                    attendance_mode: this.normalizeAttendanceMode((s as any).attendance_mode, hasCard || !!(s as any).face_embedding),
                    class_name: (s.classes as any)?.name,
                    section_name: (s.sections as any)?.name,
                    class_id: s.class_id,
                    section_id: s.section_id,
                    roll_number: s.roll_number,
                    picture_url: cachedPic,
                    father_name: s.father_name,
                    status: (s as any).status || 'active',
                    face_embedding: (s as any).face_embedding,
                    face_embedding_dim: (s as any).face_embedding_dim,
                    qr_uid: (s as any).qr_uid,
                };
                const uidKeys = new Set<string>();
                if (s.rfid_uid) {
                    buildRfidUidCandidates(s.rfid_uid).forEach(uid => uidKeys.add(uid));
                }
                if ((s as any).qr_uid) {
                    const qRaw = String((s as any).qr_uid).trim();
                    if (qRaw) {
                        const canon = canonicalQrTokenForMatch(qRaw);
                        if (canon.length >= 4) uidKeys.add(canon);
                        buildRfidUidCandidates(qRaw).forEach(uid => uidKeys.add(uid));
                    }
                }
                if (rfidUid) {
                    uidKeys.add(rfidUid);
                    buildRfidUidCandidates(rfidUid).forEach(uid => uidKeys.add(uid));
                }
                this.registerMappingInMemory(mapping, uidKeys);
                uidKeys.forEach(uid => store.put({ ...mapping, rfid_uid: uid }));
                serializedMappings.push(mapping);

                processedCount++;
                if (onProgress && processedCount % 20 === 0) {
                    onProgress(processedCount, totalCount, `Processing students... (${processedCount}/${totalCount})`);
                }
            });

            staff?.forEach(s => {
                const hasCard = !!(s.rfid_uid || (s as any).qr_uid);
                let rfidUid = (s.rfid_uid || (s as any).qr_uid || '') as string;
                if (!rfidUid || rfidUid.trim().length < 4) {
                    rfidUid = this.buildSyntheticFaceQueueUid(s.id);
                }
                const existingMem = this.memoryMappingsByPersonKey.get(`employee_${s.id}`);
                const cachedPic = existingMem?.picture_url?.startsWith('data:') ? existingMem.picture_url : s.picture_url;
                const mapping: RFIDMapping = {
                    rfid_uid: rfidUid,
                    person_id: s.id,
                    name: s.name,
                    type: 'employee',
                    attendance_mode: this.normalizeAttendanceMode((s as any).attendance_mode, hasCard || !!(s as any).face_embedding),
                    role: s.role,
                    picture_url: cachedPic,
                    status: (s as any).status || 'active',
                    face_embedding: (s as any).face_embedding,
                    face_embedding_dim: (s as any).face_embedding_dim,
                    qr_uid: (s as any).qr_uid,
                };
                const uidKeys = new Set<string>();
                if (s.rfid_uid) {
                    buildRfidUidCandidates(s.rfid_uid).forEach(uid => uidKeys.add(uid));
                }
                if ((s as any).qr_uid) {
                    const qRaw = String((s as any).qr_uid).trim();
                    if (qRaw) {
                        const canon = canonicalQrTokenForMatch(qRaw);
                        if (canon.length >= 4) uidKeys.add(canon);
                        buildRfidUidCandidates(qRaw).forEach(uid => uidKeys.add(uid));
                    }
                }
                if (rfidUid) {
                    uidKeys.add(rfidUid);
                    buildRfidUidCandidates(rfidUid).forEach(uid => uidKeys.add(uid));
                }
                this.registerMappingInMemory(mapping, uidKeys);
                uidKeys.forEach(uid => store.put({ ...mapping, rfid_uid: uid }));
                serializedMappings.push(mapping);

                processedCount++;
                if (onProgress && processedCount % 5 === 0) {
                    onProgress(processedCount, totalCount, `Processing staff... (${processedCount}/${totalCount})`);
                }
            });

            this.rebuildUniqueMappingsList();
            this.lastMappingsFetchedAt = Date.now();

            if (onProgress) onProgress(totalCount, totalCount, 'Ready for scanning!');

            this.persistWebFallbackMappings(schoolId, serializedMappings);
            await this.persistNativeBackgroundCache(
                schoolId,
                serializedMappings,
                settingsRes.data || null,
                sessionRes.data?.id || null
            );

            // Cache images in the background without blocking scan readiness
            const cacheImagesInBackground = async (mappings: RFIDMapping[]) => {
                const pendingImages = mappings.filter(m => m.picture_url && !m.picture_url.startsWith('data:'));
                if (pendingImages.length === 0) return;

                const chunkSize = 6;
                for (let i = 0; i < pendingImages.length; i += chunkSize) {
                    if (!navigator.onLine) break;
                    const chunk = pendingImages.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(async (m) => {
                        if (m.picture_url && !m.picture_url.startsWith('data:')) {
                            const cached = await this.fetchAndCacheImage(m.picture_url);
                            if (cached) {
                                m.picture_url = cached;
                                this.registerMappingInMemory(m);
                                const uidKeysImg = new Set<string>();
                                buildRfidUidCandidates(m.rfid_uid).forEach(u => uidKeysImg.add(u));
                                const cq = canonicalQrTokenForMatch(m.rfid_uid);
                                if (cq.length >= 4) uidKeysImg.add(cq);
                                try {
                                    const txImg = db.transaction(STORE_MAPPINGS, 'readwrite');
                                    const storeImg = txImg.objectStore(STORE_MAPPINGS);
                                    uidKeysImg.forEach(uid => storeImg.put({ ...m, rfid_uid: uid }));
                                } catch (_) {}
                            }
                        }
                    }));
                }
                this.rebuildUniqueMappingsList();
            };

            void cacheImagesInBackground(serializedMappings);
        } catch (error) {
            console.error('Failed to cache RFID mappings:', error);
        }
    }

    async cacheConfig(key: string, value: any): Promise<void> {
        this.memoryConfig.set(key, value);
        const db = await this.getDB();
        const tx = db.transaction(STORE_CONFIG, 'readwrite');
        tx.objectStore(STORE_CONFIG).put(value, key);
    }

    async getConfig(key: string): Promise<any> {
        if (this.memoryConfig.has(key)) {
            return this.memoryConfig.get(key);
        }
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_CONFIG, 'readonly');
            const request = tx.objectStore(STORE_CONFIG).get(key);
            request.onsuccess = () => {
                if (request.result !== undefined) {
                    this.memoryConfig.set(key, request.result);
                }
                resolve(request.result);
            };
            request.onerror = () => resolve(null);
        });
    }

    async getCachedDailyAttendanceHistory(schoolId: number, date: string): Promise<CachedAttendanceHistoryItem[]> {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_DAILY_HISTORY, 'readonly');
            const store = tx.objectStore(STORE_DAILY_HISTORY);
            const index = store.index('by_school_date');
            const request = index.getAll([schoolId, date]);
            request.onsuccess = () => {
                const items = (request.result || []) as CachedAttendanceHistoryItem[];
                items.forEach(item => {
                    this.memoryDailyHistory.set(item.key, item);
                });
                this.hydratedHistoryDates.add(`${schoolId}:${date}`);
                items.sort((a, b) => {
                    const timeA = a.check_out_time || a.check_in_time || '';
                    const timeB = b.check_out_time || b.check_in_time || '';
                    return timeB.localeCompare(timeA);
                });
                resolve(items);
            };
            request.onerror = () => resolve([]);
        });
    }

    async cacheDailyAttendanceHistory(schoolId: number, date: string): Promise<CachedAttendanceHistoryItem[]> {
        if (!navigator.onLine) {
            return this.getCachedDailyAttendanceHistory(schoolId, date);
        }

        const [studentAttendanceResult, staffAttendanceResult] = await Promise.all([
            supabase
                .from('attendance_records')
                .select('student_id, status, check_in_time, check_out_time, source, class_id, section_id')
                .eq('school_id', schoolId)
                .eq('date', date),
            supabase
                .from('staff_attendance_records')
                .select('staff_id, status, check_in_time, check_out_time, source')
                .eq('school_id', schoolId)
                .eq('date', date)
        ]);

        if (studentAttendanceResult.error) throw studentAttendanceResult.error;
        if (staffAttendanceResult.error) throw staffAttendanceResult.error;

        const studentAttendance = studentAttendanceResult.data || [];
        const staffAttendance = staffAttendanceResult.data || [];

        const missingStudentIds: number[] = [];
        const missingStaffIds: number[] = [];

        studentAttendance.forEach(item => {
            const id = Number(item.student_id);
            if (Number.isFinite(id) && !this.memoryMappingsByPersonKey.has(`student_${id}`)) {
                missingStudentIds.push(id);
            }
        });
        staffAttendance.forEach(item => {
            const id = Number(item.staff_id);
            if (Number.isFinite(id) && !this.memoryMappingsByPersonKey.has(`employee_${id}`)) {
                missingStaffIds.push(id);
            }
        });

        const uniqueMissingStudentIds = Array.from(new Set(missingStudentIds));
        const uniqueMissingStaffIds = Array.from(new Set(missingStaffIds));

        const [studentsResult, staffResult] = await Promise.all([
            uniqueMissingStudentIds.length > 0
                ? supabase
                    .from('students')
                    .select('id, name, father_name, roll_number, picture_url, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                    .eq('school_id', schoolId)
                    .in('id', uniqueMissingStudentIds)
                : Promise.resolve({ data: [], error: null } as any),
            uniqueMissingStaffIds.length > 0
                ? supabase
                    .from('staff')
                    .select('id, name, role, picture_url')
                    .eq('school_id', schoolId)
                    .in('id', uniqueMissingStaffIds)
                : Promise.resolve({ data: [], error: null } as any)
        ]);

        if (studentsResult.error) throw studentsResult.error;
        if (staffResult.error) throw staffResult.error;

        const studentsById = new Map<number, any>(
            (studentsResult.data || []).map((student: any) => [Number(student.id), student])
        );
        const staffById = new Map<number, any>(
            (staffResult.data || []).map((staff: any) => [Number(staff.id), staff])
        );

        const historyItems: CachedAttendanceHistoryItem[] = [
            ...studentAttendance.map((record: any) => {
                const sid = Number(record.student_id);
                const memStudent = this.memoryMappingsByPersonKey.get(`student_${sid}`);
                const student = studentsById.get(sid);
                const classId = record.class_id ?? memStudent?.class_id ?? student?.class_id;
                const sectionId = record.section_id ?? memStudent?.section_id ?? student?.section_id;
                return {
                    key: this.buildDailyHistoryKey(schoolId, date, 'student', sid),
                    school_id: schoolId,
                    date,
                    person_id: sid,
                    person_type: 'student' as const,
                    name: memStudent?.name || student?.name || `Student ${sid}`,
                    father_name: memStudent?.father_name ?? student?.father_name,
                    roll_number: memStudent?.roll_number ?? student?.roll_number,
                    class_id: classId ?? undefined,
                    section_id: sectionId ?? undefined,
                    class_name: memStudent?.class_name ?? student?.classes?.name,
                    section_name: memStudent?.section_name ?? student?.sections?.name,
                    picture_url: memStudent?.picture_url ?? student?.picture_url,
                    status: record.status,
                    check_in_time: record.check_in_time,
                    check_out_time: record.check_out_time,
                    source: record.source,
                    updated_at: new Date().toISOString(),
                };
            }),
            ...staffAttendance.map((record: any) => {
                const stid = Number(record.staff_id);
                const memStaff = this.memoryMappingsByPersonKey.get(`employee_${stid}`);
                const staff = staffById.get(stid);
                return {
                    key: this.buildDailyHistoryKey(schoolId, date, 'employee', stid),
                    school_id: schoolId,
                    date,
                    person_id: stid,
                    person_type: 'employee' as const,
                    name: memStaff?.name || staff?.name || `Staff ${stid}`,
                    role: memStaff?.role ?? staff?.role,
                    picture_url: memStaff?.picture_url ?? staff?.picture_url,
                    status: record.status,
                    check_in_time: record.check_in_time,
                    check_out_time: record.check_out_time,
                    source: record.source,
                    updated_at: new Date().toISOString(),
                };
            }),
        ];

        const [existing, pendingQueue] = await Promise.all([
            this.getCachedDailyAttendanceHistory(schoolId, date),
            this.getQueue(),
        ]);

        // Preserve any pending local offline scans not yet synced to the server
        const serverKeys = new Set(historyItems.map(item => item.key));
        for (const q of pendingQueue) {
            if (Number(q.school_id) === Number(schoolId) && q.date === date) {
                const qKey = this.buildDailyHistoryKey(schoolId, date, q.person_type, q.person_id);
                if (!serverKeys.has(qKey)) {
                    const localExisting = existing.find(e => e.key === qKey) || this.memoryDailyHistory.get(qKey);
                    if (localExisting) {
                        historyItems.push(localExisting);
                        serverKeys.add(qKey);
                    }
                }
            }
        }

        const existingKeys = existing.map(item => item.key);
        existingKeys.forEach(key => this.memoryDailyHistory.delete(key));
        historyItems.forEach(item => this.memoryDailyHistory.set(item.key, item));
        this.hydratedHistoryDates.add(`${schoolId}:${date}`);

        const db = await this.getDB();

        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_DAILY_HISTORY, 'readwrite');
            const store = tx.objectStore(STORE_DAILY_HISTORY);

            existingKeys.forEach(key => store.delete(key));
            historyItems.forEach(item => store.put(item));

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });

        historyItems.sort((a, b) => {
            const timeA = a.check_out_time || a.check_in_time || '';
            const timeB = b.check_out_time || b.check_in_time || '';
            return timeB.localeCompare(timeA);
        });

        return historyItems;
    }

    async upsertCachedAttendanceHistoryItem(item: CachedAttendanceHistoryItem): Promise<void> {
        const normalizedItem = {
            ...item,
            updated_at: item.updated_at || new Date().toISOString(),
        };
        this.memoryDailyHistory.set(normalizedItem.key, normalizedItem);

        const db = await this.getDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_DAILY_HISTORY, 'readwrite');
            tx.objectStore(STORE_DAILY_HISTORY).put(normalizedItem);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    /**
     * Get all unique cached mappings
     */
    async getAllMappings(): Promise<RFIDMapping[]> {
        if (this.memoryUniqueMappings.length > 0) {
            return this.memoryUniqueMappings;
        }
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_MAPPINGS, 'readonly');
            const store = tx.objectStore(STORE_MAPPINGS);
            const request = store.getAll();
            request.onsuccess = () => {
                const list = (request.result || []) as RFIDMapping[];
                for (const item of list) {
                    this.registerMappingInMemory(item);
                }
                this.rebuildUniqueMappingsList();
                resolve(this.memoryUniqueMappings);
            };
            request.onerror = () => resolve([]);
        });
    }

    /**
     * Lookup a person by RFID UID from local cache (0ms in-memory fast path)
     */
    async lookupRFID(scanInput: string): Promise<RFIDMapping | null> {
        const rawCanon = canonicalQrTokenForMatch(scanInput);
        const hexKey = extractAttendanceUidFromQrPayload(scanInput) || sanitizeRfidUid(scanInput);
        const candidates = hexKey.length >= 4 ? buildRfidUidCandidates(hexKey) : [];
        const prefixCandidates = hexKey.length >= 4 ? buildRfidUidPrefixCandidates(hexKey) : [];

        const lookupFromMemory = (): RFIDMapping | null => {
            if (rawCanon.length >= 4) {
                const match = this.memoryMappingsByUid.get(rawCanon);
                if (match) return match;
            }
            for (const cand of candidates) {
                const match = this.memoryMappingsByUid.get(cand);
                if (match) return match;
            }
            for (const prefix of prefixCandidates) {
                const match = this.memoryUniqueMappings.find(m => m.rfid_uid && m.rfid_uid.startsWith(prefix));
                if (match) return match;
            }
            return null;
        };

        if (this.memoryMappingsByUid.size > 0) {
            const fastHit = lookupFromMemory();
            if (fastHit) return fastHit;
        } else {
            await this.getAllMappings();
            const hydratedHit = lookupFromMemory();
            if (hydratedHit) return hydratedHit;
        }

        return null;
    }

    /**
     * Queue a scan locally when offline or as a fallback
     */
    async queueScan(scan: QueuedScan): Promise<number | undefined> {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_QUEUE, 'readwrite');
            const store = tx.objectStore(STORE_QUEUE);
            const req = store.add(this.normalizeQueuedScan({
                ...scan,
                platform: scan.platform || this.getRuntimePlatform(),
                sync_status: 'pending',
                sequence_order: scan.sequence_order || Date.now(),
                synced_at: null,
            }));
            req.onsuccess = () => resolve(typeof req.result === 'number' ? req.result : undefined);
            req.onerror = () => resolve(undefined);
        });
    }

    /**
     * Get all queued scans
     */
    async getQueue(): Promise<QueuedScan[]> {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_QUEUE, 'readonly');
            const store = tx.objectStore(STORE_QUEUE);
            const request = store.getAll();
            request.onsuccess = () => {
                const pending = ((request.result || []) as QueuedScan[])
                    .map(item => this.normalizeQueuedScan(item))
                    .filter(item => item.sync_status !== 'synced')
                    .sort((a, b) => {
                        const sequenceDiff = Number(a.sequence_order || 0) - Number(b.sequence_order || 0);
                        if (sequenceDiff !== 0) return sequenceDiff;
                        return a.timestamp.localeCompare(b.timestamp);
                    });
                resolve(pending);
            };
            request.onerror = () => resolve([]);
        });
    }

    /**
     * Mark a queued scan as synced while keeping it in local history for the day.
     */
    async markQueueItemSynced(id: number): Promise<void> {
        const db = await this.getDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_QUEUE, 'readwrite');
            const store = tx.objectStore(STORE_QUEUE);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const existing = getRequest.result as QueuedScan | undefined;
                if (!existing) {
                    resolve();
                    return;
                }

                store.put({
                    ...this.normalizeQueuedScan(existing),
                    sync_status: 'synced',
                    synced_at: new Date().toISOString(),
                });
            };

            getRequest.onerror = () => reject(getRequest.error);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    private async applyScanToServer(params: {
        person: RFIDMapping;
        schoolId: number;
        date: string;
        timestamp: string;
        sessionId: number | null;
        settings: any;
        mode: ScanMode;
        platform: RuntimePlatform;
        skipInitialSelect?: boolean;
    }): Promise<{ success: boolean; type: MarkResultType; attendance_status?: string; recorded_time?: string; actionTaken: ScanHistoryAction }> {
        const { person, schoolId, date, timestamp, sessionId, settings, mode, platform, skipInitialSelect } = params;
        const table = person.type === 'student' ? 'attendance_records' : 'staff_attendance_records';
        const idCol = person.type === 'student' ? 'student_id' : 'staff_id';
        const computedStatus = this.computeAttendanceStatus(person.type, timestamp, date, settings);
        const recordSource = mode === 'offline' ? 'rfid-offline' : 'rfid';

        const buildInsertPayload = () => {
            const payload: any = {
                [idCol]: person.person_id,
                school_id: schoolId,
                session_id: sessionId,
                date,
                status: computedStatus,
                source: recordSource,
                check_in_time: timestamp,
            };
            if (person.type === 'employee' && settings) {
                if (settings.staff_start_time) payload.expected_arrival_time = settings.staff_start_time;
                if (settings.staff_end_time) payload.expected_departure_time = settings.staff_end_time;
            }
            if (person.type === 'student') {
                if (person.class_id) payload.class_id = person.class_id;
                if (person.section_id) payload.section_id = person.section_id;
            }
            return payload;
        };

        // Fast 1-round-trip path when local history knows there is no existing record for today
        if (skipInitialSelect) {
            const payload = buildInsertPayload();
            const { error: fastInsertError } = await supabase.from(table).insert(payload);
            if (!fastInsertError) {
                this.upsertCachedAttendanceHistoryItem(this.buildHistoryItem(schoolId, date, person, {
                    status: computedStatus,
                    check_in_time: timestamp,
                    check_out_time: null,
                    source: recordSource,
                    updated_at: timestamp,
                })).catch(() => {});

                this.logScanHistory({
                    schoolId,
                    userId: person.person_id,
                    role: person.type,
                    timestamp,
                    platform,
                    mode,
                    actionTaken: computedStatus === 'late' ? 'late' : 'present',
                    metadata: { attendance_table: table },
                }).catch(() => {});

                return {
                    success: true,
                    type: 'new',
                    attendance_status: computedStatus,
                    recorded_time: timestamp,
                    actionTaken: computedStatus === 'late' ? 'late' : 'present',
                };
            }
            if (fastInsertError.code !== '23505') {
                throw fastInsertError;
            }
            // If 23505 (unique conflict), fall through to SELECT to handle existing row
        }

        const { data: existing, error: existingError } = await supabase
            .from(table)
            .select('id, status, source, check_in_time, check_out_time, expected_arrival_time, expected_departure_time')
            .eq(idCol, person.person_id)
            .eq('date', date)
            .eq('school_id', schoolId)
            .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
            if (person.type === 'employee' && this.isEmployeeActiveAttendance(existing)) {
                if (!this.isCheckoutAllowed(timestamp, date, settings)) {
                    this.logScanHistory({
                        schoolId,
                        userId: person.person_id,
                        role: person.type,
                        timestamp,
                        platform,
                        mode,
                        actionTaken: 'ignored',
                        metadata: { reason: 'checkout_too_early', attendance_table: table, attendance_record_id: existing.id },
                    }).catch(() => {});
                    return { success: false, type: 'error_checkout_early', attendance_status: existing.status || computedStatus, recorded_time: existing.check_in_time || timestamp, actionTaken: 'ignored' };
                }

                const updatePayload: any = { check_out_time: timestamp };
                if (person.type === 'employee' && settings) {
                    if (!existing.expected_arrival_time && settings.staff_start_time) {
                        updatePayload.expected_arrival_time = settings.staff_start_time;
                    }
                    if (!existing.expected_departure_time && settings.staff_end_time) {
                        updatePayload.expected_departure_time = settings.staff_end_time;
                    }
                }

                const { error: outError } = await supabase
                    .from(table)
                    .update(updatePayload)
                    .eq('id', existing.id)
                    .is('check_out_time', null);

                if (outError) throw outError;

                this.upsertCachedAttendanceHistoryItem(this.buildHistoryItem(schoolId, date, person, {
                    status: existing.status,
                    check_in_time: existing.check_in_time,
                    check_out_time: timestamp,
                    source: existing.source || recordSource,
                    updated_at: timestamp,
                })).catch(() => {});

                this.logScanHistory({
                    schoolId,
                    userId: person.person_id,
                    role: person.type,
                    timestamp,
                    platform,
                    mode,
                    actionTaken: 'checkout',
                    metadata: { attendance_table: table, attendance_record_id: existing.id },
                }).catch(() => {});

                return { success: true, type: 'out', attendance_status: existing.status || computedStatus, recorded_time: timestamp, actionTaken: 'checkout' };
            }

            if (person.type === 'employee' && existing.check_out_time) {
                this.upsertCachedAttendanceHistoryItem(this.buildHistoryItem(schoolId, date, person, {
                    status: existing.status,
                    check_in_time: existing.check_in_time,
                    check_out_time: existing.check_out_time,
                    source: existing.source || recordSource,
                    updated_at: timestamp,
                })).catch(() => {});

                this.logScanHistory({
                    schoolId,
                    userId: person.person_id,
                    role: person.type,
                    timestamp,
                    platform,
                    mode,
                    actionTaken: 'already_checked_out',
                    metadata: { attendance_table: table, attendance_record_id: existing.id },
                }).catch(() => {});
                return { success: true, type: 'already_out', attendance_status: existing.status || computedStatus, recorded_time: existing.check_out_time, actionTaken: 'already_checked_out' };
            }

            if (existing.status === 'absent' || (!existing.check_in_time && !this.isEmployeeActiveAttendance(existing))) {
                const updatePayload: any = {
                    session_id: sessionId,
                    status: computedStatus,
                    source: recordSource,
                    check_in_time: timestamp,
                    check_out_time: null,
                };

                if (person.type === 'employee' && settings) {
                    if (settings.staff_start_time) updatePayload.expected_arrival_time = settings.staff_start_time;
                    if (settings.staff_end_time) updatePayload.expected_departure_time = settings.staff_end_time;
                }

                if (person.type === 'student') {
                    if (person.class_id) updatePayload.class_id = person.class_id;
                    if (person.section_id) updatePayload.section_id = person.section_id;
                }

                const { error: updateError } = await supabase
                    .from(table)
                    .update(updatePayload)
                    .eq('id', existing.id);

                if (updateError) throw updateError;

                this.upsertCachedAttendanceHistoryItem(this.buildHistoryItem(schoolId, date, person, {
                    status: computedStatus,
                    check_in_time: timestamp,
                    check_out_time: null,
                    source: recordSource,
                    updated_at: timestamp,
                })).catch(() => {});

                this.logScanHistory({
                    schoolId,
                    userId: person.person_id,
                    role: person.type,
                    timestamp,
                    platform,
                    mode,
                    actionTaken: computedStatus === 'late' ? 'late' : 'present',
                    metadata: { attendance_table: table, attendance_record_id: existing.id, restored_from_absent: true },
                }).catch(() => {});

                return { success: true, type: 'new', attendance_status: computedStatus, recorded_time: timestamp, actionTaken: computedStatus === 'late' ? 'late' : 'present' };
            }

            this.upsertCachedAttendanceHistoryItem(this.buildHistoryItem(schoolId, date, person, {
                status: existing.status || computedStatus,
                check_in_time: existing.check_in_time || timestamp,
                check_out_time: existing.check_out_time || null,
                source: existing.source || recordSource,
                updated_at: timestamp,
            })).catch(() => {});

            this.logScanHistory({
                schoolId,
                userId: person.person_id,
                role: person.type,
                timestamp,
                platform,
                mode,
                actionTaken: 'ignored',
                metadata: { reason: 'duplicate_scan', attendance_table: table, attendance_record_id: existing.id },
            }).catch(() => {});

            return { success: true, type: 'already', attendance_status: existing.status || computedStatus, recorded_time: existing.check_in_time || timestamp, actionTaken: 'ignored' };
        }

        const payload = buildInsertPayload();
        const { error: insertError } = await supabase.from(table).insert(payload);
        if (insertError && insertError.code !== '23505') throw insertError;

        if (insertError?.code === '23505') {
            this.logScanHistory({
                schoolId,
                userId: person.person_id,
                role: person.type,
                timestamp,
                platform,
                mode,
                actionTaken: 'ignored',
                metadata: { reason: 'unique_conflict_duplicate', attendance_table: table },
            }).catch(() => {});
            return { success: true, type: 'already', attendance_status: computedStatus, recorded_time: timestamp, actionTaken: 'ignored' };
        }

        this.upsertCachedAttendanceHistoryItem(this.buildHistoryItem(schoolId, date, person, {
            status: computedStatus,
            check_in_time: timestamp,
            check_out_time: null,
            source: recordSource,
            updated_at: timestamp,
        })).catch(() => {});

        this.logScanHistory({
            schoolId,
            userId: person.person_id,
            role: person.type,
            timestamp,
            platform,
            mode,
            actionTaken: computedStatus === 'late' ? 'late' : 'present',
            metadata: { attendance_table: table },
        }).catch(() => {});

        return { success: true, type: 'new', attendance_status: computedStatus, recorded_time: timestamp, actionTaken: computedStatus === 'late' ? 'late' : 'present' };
    }

    /**
     * Sync queued scans with Supabase
     */
    async syncQueue(onProgress?: (current: number, total: number) => void, silent: boolean = false): Promise<{ success: number; failed: number }> {
        if (!navigator.onLine) return { success: 0, failed: 0 };

        const queue = await this.getQueue();
        if (queue.length === 0) return { success: 0, failed: 0 };

        let successCount = 0;
        let failedCount = 0;
        const total = queue.length;
        const datesToRefresh = new Set<string>();
        const schoolCache = new Map<number, { settings: any; sessionId: number | null }>();

        const getSchoolCache = async (schoolId: number) => {
            if (schoolCache.has(schoolId)) return schoolCache.get(schoolId)!;
            const settings = await this.getAttendanceSettings(schoolId);
            const sessionId = await this.getActiveSessionId(schoolId);
            const cache = { settings, sessionId };
            schoolCache.set(schoolId, cache);
            return cache;
        };

        for (let i = 0; i < total; i++) {
            const scan = this.normalizeQueuedScan(queue[i]);
            if (onProgress) onProgress(i + 1, total);

            try {
                const { settings, sessionId } = await getSchoolCache(scan.school_id);
                const effectiveSessionId = scan.session_id || sessionId;
                const person: RFIDMapping = {
                    rfid_uid: scan.rfid_uid,
                    person_id: scan.person_id,
                    type: scan.person_type,
                    name: scan.person_type === 'student' ? `Student ${scan.person_id}` : `Staff ${scan.person_id}`,
                    class_id: scan.class_id,
                    section_id: scan.section_id,
                };

                await this.applyScanToServer({
                    person,
                    schoolId: scan.school_id,
                    date: scan.date,
                    timestamp: scan.timestamp,
                    sessionId: effectiveSessionId,
                    settings,
                    mode: 'offline',
                    platform: scan.platform || 'web',
                });

                if (scan.id) await this.markQueueItemSynced(scan.id);
                datesToRefresh.add(`${scan.school_id}:${scan.date}`);
                successCount++;
            } catch (error) {
                console.error('Error syncing individual queue item:', error);
                failedCount++;
            }
        }

        for (const key of Array.from(datesToRefresh)) {
            const [schoolIdRaw, date] = key.split(':');
            const parsedSchoolId = Number(schoolIdRaw);
            if (!parsedSchoolId || !date) continue;

            try {
                await this.cacheDailyAttendanceHistory(parsedSchoolId, date);
            } catch (error) {
                console.warn('Failed to refresh cached attendance history after sync:', error);
            }
        }

        window.dispatchEvent(new CustomEvent('offline-sync-completed', {
            detail: { success: successCount, failed: failedCount, silent }
        }));

        return { success: successCount, failed: failedCount };
    }

    /**
     * Unified method to mark attendance via RFID UID.
     * Handles both online and offline tagging.
     */
    async markAttendance(uid: string, schoolId: number, targetDate?: string): Promise<{ success: boolean; person: RFIDMapping | null; type: MarkResultType; attendance_status?: string; recorded_time?: string }> {
        const rawTrim = String(uid ?? '').trim();
        const hexFromPayload = extractAttendanceUidFromQrPayload(rawTrim);
        const cleanUID =
            hexFromPayload.length >= 4 ? hexFromPayload : sanitizeRfidUid(rawTrim);
        const qrCanonical = canonicalQrTokenForMatch(rawTrim);
        const hasHex = cleanUID.length >= 4;
        const hasQrToken = qrCanonical.length >= 4;

        if (!hasHex && !hasQrToken) {
            return { success: false, person: null, type: 'error' };
        }

        const uidCandidates = hasHex ? buildRfidUidCandidates(cleanUID) : [];
        const uidCandidatesCI = hasHex
            ? Array.from(new Set(uidCandidates.concat(uidCandidates.map(c => c.toLowerCase()))))
            : [];

        const platform = this.getRuntimePlatform();

        try {
            // 1. Lookup the person (0ms in-memory fast path + IndexedDB fallback)
            let person: RFIDMapping | null = await this.lookupRFID(rawTrim);

            if (!person && !navigator.onLine) {
                const restored = await this.rehydrateMappingsFromFallbackCache(String(schoolId));
                if (restored) {
                    person = await this.lookupRFID(rawTrim);
                }
            }

            // Online fallback lookup bounded by a fast timeout so slow internet doesn't stall unknown card scans
            if (!person && navigator.onLine) {
                const onlineLookup = async (): Promise<RFIDMapping | null> => {
                    let found: RFIDMapping | null = null;
                    if (hasHex) {
                        const [studentRes, staffRes, studentQrRes, staffQrRes] = await Promise.all([
                            supabase.from('students')
                                .select('id, name, father_name, roll_number, picture_url, status, attendance_mode, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                                .eq('school_id', schoolId).in('rfid_uid', uidCandidatesCI).maybeSingle(),
                            supabase.from('staff')
                                .select('id, name, picture_url, role, status, attendance_mode')
                                .eq('school_id', schoolId).in('rfid_uid', uidCandidatesCI).maybeSingle(),
                            supabase.from('students')
                                .select('id, name, father_name, roll_number, picture_url, status, attendance_mode, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                                .eq('school_id', schoolId).in('qr_uid', uidCandidatesCI).maybeSingle(),
                            supabase.from('staff')
                                .select('id, name, picture_url, role, status, attendance_mode')
                                .eq('school_id', schoolId).in('qr_uid', uidCandidatesCI).maybeSingle(),
                        ]);

                        const student = studentRes.data || studentQrRes.data;
                        const staff = staffRes.data || staffQrRes.data;

                        if (student) {
                            found = {
                                rfid_uid: cleanUID,
                                person_id: student.id,
                                name: student.name,
                                type: 'student',
                                attendance_mode: this.normalizeAttendanceMode((student as any).attendance_mode, true),
                                picture_url: student.picture_url,
                                father_name: (student as any).father_name,
                                roll_number: (student as any).roll_number,
                                class_name: (student as any).classes?.name,
                                section_name: (student as any).sections?.name,
                                class_id: student.class_id,
                                section_id: student.section_id,
                                status: (student as any).status || 'active',
                            };
                        } else if (staff) {
                            found = {
                                rfid_uid: cleanUID,
                                person_id: staff.id,
                                name: staff.name,
                                type: 'employee',
                                attendance_mode: this.normalizeAttendanceMode((staff as any).attendance_mode, true),
                                picture_url: staff.picture_url,
                                role: staff.role,
                                status: (staff as any).status || 'active',
                            };
                        }
                    }

                    if (!found && hasQrToken) {
                        const [studentRawQrRes, staffRawQrRes] = await Promise.all([
                            supabase.from('students')
                                .select('id, name, father_name, roll_number, picture_url, status, attendance_mode, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                                .eq('school_id', schoolId)
                                .eq('qr_uid', qrCanonical)
                                .maybeSingle(),
                            supabase.from('staff')
                                .select('id, name, picture_url, role, status, attendance_mode')
                                .eq('school_id', schoolId)
                                .eq('qr_uid', qrCanonical)
                                .maybeSingle(),
                        ]);

                        if (studentRawQrRes.data) {
                            const studentRawQr = studentRawQrRes.data;
                            found = {
                                rfid_uid: hasHex ? cleanUID : qrCanonical,
                                person_id: studentRawQr.id,
                                name: studentRawQr.name,
                                type: 'student',
                                attendance_mode: this.normalizeAttendanceMode((studentRawQr as any).attendance_mode, true),
                                picture_url: studentRawQr.picture_url,
                                father_name: (studentRawQr as any).father_name,
                                roll_number: (studentRawQr as any).roll_number,
                                class_name: (studentRawQr as any).classes?.name,
                                section_name: (studentRawQr as any).sections?.name,
                                class_id: studentRawQr.class_id,
                                section_id: studentRawQr.section_id,
                                status: (studentRawQr as any).status || 'active',
                            };
                        } else if (staffRawQrRes.data) {
                            const staffRawQr = staffRawQrRes.data;
                            found = {
                                rfid_uid: hasHex ? cleanUID : qrCanonical,
                                person_id: staffRawQr.id,
                                name: staffRawQr.name,
                                type: 'employee',
                                attendance_mode: this.normalizeAttendanceMode((staffRawQr as any).attendance_mode, true),
                                picture_url: staffRawQr.picture_url,
                                role: staffRawQr.role,
                                status: (staffRawQr as any).status || 'active',
                            };
                        }
                    }

                    if (found) {
                        this.registerMappingInMemory(found, [rawTrim, cleanUID, qrCanonical]);
                        this.rebuildUniqueMappingsList();
                    }
                    return found;
                };

                const lookupTimeoutMs = Date.now() - this.lastSlowNetworkAt < 30000 ? 400 : 1200;
                person = await Promise.race([
                    onlineLookup().catch(() => null),
                    new Promise<null>(resolve => setTimeout(() => resolve(null), lookupTimeoutMs)),
                ]);
            }

            if (!person) {
                if (navigator.onLine) {
                    this.logScanHistory({
                        schoolId,
                        userId: null,
                        role: 'unknown',
                        timestamp: new Date().toISOString(),
                        platform,
                        mode: 'online',
                        actionTaken: 'ignored',
                        metadata: { reason: 'unknown_card', rfid_uid: hasHex ? cleanUID : qrCanonical, raw_scan: rawTrim },
                    }).catch(() => {});
                }
                return { success: false, person: null, type: 'error' };
            }

            return await this.runAttendancePipelineAfterIdentification(
                person as RFIDMapping,
                schoolId,
                targetDate,
                cleanUID,
                platform,
            );

        } catch (error) {
            // Person lookup itself failed
            console.error('RFID markAttendance person lookup failed:', error);
            return { success: false, person: null, type: 'error' };
        }
    }



    /**
     * Explicitly cache attendance settings to local IndexedDB.
     * Called from the UI when settings are saved so offline scans use up-to-date rules.
     */
    async cacheAttendanceSettings(settings: any): Promise<void> {
        await this.cacheConfig(KEY_ATTN_SETTINGS, settings);
    }

    private buildSyntheticFaceQueueUid(personId: number): string {
        let h = '';
        let x = (personId ^ 0x9e3779b9) >>> 0;
        for (let i = 0; i < 32; i++) {
            x = Math.imul(x, 1664525) + 1013904223;
            h += ((x >>> (i % 28)) & 15).toString(16).toUpperCase();
        }
        return h;
    }

    private async runAttendancePipelineAfterIdentification(
        resolvedPerson: RFIDMapping,
        schoolId: number,
        targetDate: string | undefined,
        cleanUID: string,
        platform: RuntimePlatform,
        forceOffline: boolean = false,
    ): Promise<{ success: boolean; person: RFIDMapping | null; type: MarkResultType; attendance_status?: string; recorded_time?: string }> {
        const effectiveAttendanceMode = this.normalizeAttendanceMode(resolvedPerson.attendance_mode, true);

        if (navigator.onLine && resolvedPerson.attendance_mode !== effectiveAttendanceMode) {
            const peopleTable = resolvedPerson.type === 'student' ? 'students' : 'staff';
            const modeToSet = effectiveAttendanceMode;
            const personId = resolvedPerson.person_id;
            supabase.from(peopleTable).update({ attendance_mode: modeToSet })
                .eq('id', personId).eq('school_id', schoolId).then(({ error }) => {
                    if (!error) {
                        resolvedPerson.attendance_mode = modeToSet;
                    }
                });
        }

        const now = new Date().toISOString();

        if (effectiveAttendanceMode === 'manual_only') {
            if (navigator.onLine) {
                this.logScanHistory({
                    schoolId,
                    userId: resolvedPerson.person_id,
                    role: resolvedPerson.type,
                    timestamp: now,
                    platform,
                    mode: 'online',
                    actionTaken: 'ignored',
                    metadata: { reason: 'manual_only_policy' },
                }).catch(() => {});
            }
            return { success: false, person: resolvedPerson, type: 'error_manual_only' };
        }

        // 1b. Check if person is active
        if (resolvedPerson.status && resolvedPerson.status !== 'active') {
            if (navigator.onLine) {
                this.logScanHistory({
                    schoolId,
                    userId: resolvedPerson.person_id,
                    role: resolvedPerson.type,
                    timestamp: now,
                    platform,
                    mode: 'online',
                    actionTaken: 'ignored',
                    metadata: { reason: 'inactive_person', status: resolvedPerson.status },
                }).catch(() => {});
            }
            return { success: false, person: resolvedPerson, type: 'error_inactive' };
        }

        // 1c. Check if Sunday or Holiday (0ms memory-backed check)
        const targetDayDate = targetDate || now.slice(0, 10);
        const nonWorkingCheck = await this.checkIsSundayOrHoliday(schoolId, targetDayDate);
        if (nonWorkingCheck.isNonWorkingDay) {
            if (navigator.onLine) {
                this.logScanHistory({
                    schoolId,
                    userId: resolvedPerson.person_id,
                    role: resolvedPerson.type,
                    timestamp: now,
                    platform,
                    mode: 'online',
                    actionTaken: 'ignored',
                    metadata: { reason: 'non_working_day', day_reason: nonWorkingCheck.reason },
                }).catch(() => {});
            }
            return { success: false, person: resolvedPerson, type: 'error_holiday' };
        }

        const [settings, sessionId] = await Promise.all([
            this.getAttendanceSettings(schoolId),
            this.getActiveSessionId(schoolId),
        ]);
        const offlineSettings = settings || await this.getConfig(KEY_ATTN_SETTINGS);
        const offlineTimezone = offlineSettings?.timezone || 'Asia/Karachi';
        const localParts = this.getLocalTimestampParts(now, offlineTimezone);
        const offlineDate = targetDate || localParts.date;
        const currentPerson = resolvedPerson;
        const historyKey = this.buildDailyHistoryKey(schoolId, offlineDate, currentPerson.type, currentPerson.person_id);

        try {
            // Hydrate today's local history once per date so subsequent lookups are 0ms from memoryDailyHistory
            if (!this.hydratedHistoryDates.has(`${schoolId}:${offlineDate}`)) {
                const [existingHistory, pendingQueue] = await Promise.all([
                    this.getCachedDailyAttendanceHistory(schoolId, offlineDate),
                    this.getQueue(),
                ]);
                for (const q of pendingQueue) {
                    if (Number(q.school_id) === Number(schoolId) && q.date === offlineDate) {
                        const qKey = this.buildDailyHistoryKey(schoolId, offlineDate, q.person_type, q.person_id);
                        if (!this.memoryDailyHistory.has(qKey)) {
                            this.memoryDailyHistory.set(qKey, {
                                key: qKey,
                                school_id: schoolId,
                                date: offlineDate,
                                person_id: q.person_id,
                                person_type: q.person_type,
                                name: currentPerson.person_id === q.person_id ? currentPerson.name : `${q.person_type} ${q.person_id}`,
                                status: q.status || 'present',
                                check_in_time: q.timestamp || now,
                                check_out_time: q.scan_type === 'out' ? q.timestamp : null,
                            });
                        }
                    }
                }
            }

            const existingRecord = this.memoryDailyHistory.get(historyKey);
            const isOfflineMode = !navigator.onLine || forceOffline;

            // Fast 0ms short-circuit when local history already knows the scan is a duplicate or early checkout
            if (existingRecord && existingRecord.status !== 'absent' && (existingRecord.check_in_time || this.isEmployeeActiveAttendance(existingRecord))) {
                if (currentPerson.type === 'student') {
                    return {
                        success: true,
                        person: currentPerson,
                        type: isOfflineMode ? 'offline_already' : 'already',
                        attendance_status: existingRecord.status || 'present',
                        recorded_time: existingRecord.check_in_time || now,
                    };
                }
                if (currentPerson.type === 'employee' && existingRecord.check_out_time) {
                    return {
                        success: true,
                        person: currentPerson,
                        type: isOfflineMode ? 'offline_already_out' : 'already_out',
                        attendance_status: existingRecord.status || 'present',
                        recorded_time: existingRecord.check_out_time,
                    };
                }
                if (currentPerson.type === 'employee' && this.isEmployeeActiveAttendance(existingRecord)) {
                    if (!this.isCheckoutAllowed(now, offlineDate, offlineSettings)) {
                        return {
                            success: false,
                            person: currentPerson,
                            type: isOfflineMode ? 'offline_checkout_early' : 'error_checkout_early',
                            attendance_status: existingRecord.status || 'present',
                            recorded_time: existingRecord.check_in_time || now,
                        };
                    }
                }
            }

            // Helper to record scan locally + queue for background sync (used when offline OR when online network is slow)
            const recordLocallyAndQueue = async (useOnlineResultType: boolean): Promise<{
                success: boolean;
                person: RFIDMapping | null;
                type: MarkResultType;
                attendance_status?: string;
                recorded_time?: string;
                queuedId?: number;
            }> => {
                if (existingRecord && currentPerson.type === 'employee' && this.isEmployeeActiveAttendance(existingRecord)) {
                    const updatedItem = { ...existingRecord, check_out_time: now, updated_at: now };
                    const [, queuedId] = await Promise.all([
                        this.upsertCachedAttendanceHistoryItem(updatedItem),
                        this.queueScan({
                            rfid_uid: cleanUID,
                            person_id: currentPerson.person_id,
                            person_type: currentPerson.type,
                            school_id: schoolId,
                            session_id: sessionId,
                            date: offlineDate,
                            timestamp: now,
                            scan_type: 'out',
                            platform,
                            sync_status: 'pending',
                            sequence_order: Date.now(),
                            source: 'rfid-offline',
                            class_id: currentPerson.class_id,
                            section_id: currentPerson.section_id,
                        }),
                    ]);
                    return {
                        success: true,
                        person: currentPerson,
                        type: useOnlineResultType ? 'out' : 'offline_checkout',
                        attendance_status: existingRecord.status || 'present',
                        recorded_time: now,
                        queuedId,
                    };
                }

                const computedStatus = this.computeAttendanceStatus(currentPerson.type, now, offlineDate, offlineSettings);
                const newItem = this.buildHistoryItem(schoolId, offlineDate, currentPerson, {
                    status: computedStatus,
                    check_in_time: now,
                    check_out_time: null,
                    source: useOnlineResultType ? 'rfid' : 'rfid-offline',
                    updated_at: now,
                });
                const [, queuedId] = await Promise.all([
                    this.upsertCachedAttendanceHistoryItem(newItem),
                    this.queueScan({
                        rfid_uid: cleanUID,
                        person_id: currentPerson.person_id,
                        person_type: currentPerson.type,
                        school_id: schoolId,
                        session_id: sessionId,
                        date: offlineDate,
                        timestamp: now,
                        scan_type: 'in',
                        status: computedStatus,
                        platform,
                        sync_status: 'pending',
                        sequence_order: Date.now(),
                        source: 'rfid-offline',
                        class_id: currentPerson.class_id,
                        section_id: currentPerson.section_id,
                    }),
                ]);
                return {
                    success: true,
                    person: currentPerson,
                    type: useOnlineResultType
                        ? (computedStatus === 'late' ? 'online_late' : 'online_present')
                        : (computedStatus === 'late' ? 'offline_late' : 'offline_present'),
                    attendance_status: computedStatus,
                    recorded_time: now,
                    queuedId,
                };
            };

            if (!isOfflineMode) {
                const canSkipInitialSelect = !existingRecord;
                const serverPromise = this.applyScanToServer({
                    person: currentPerson,
                    schoolId,
                    date: offlineDate,
                    timestamp: now,
                    sessionId,
                    settings: offlineSettings,
                    mode: 'online',
                    platform,
                    skipInitialSelect: canSkipInitialSelect,
                });

                // Adaptive fast timeout: 800ms normally, 250ms if connection was recently slow
                const timeoutMs = Date.now() - this.lastSlowNetworkAt < 30000 ? 250 : 800;

                const raced = await Promise.race([
                    serverPromise
                        .then(res => ({ kind: 'server' as const, res }))
                        .catch(err => ({ kind: 'error' as const, err })),
                    new Promise<{ kind: 'timeout' }>(resolve => setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs)),
                ]);

                if (raced.kind === 'server') {
                    const serverResult = raced.res;
                    let mappedType: MarkResultType;
                    if (serverResult.type === 'new') {
                        mappedType = serverResult.attendance_status === 'late' ? 'online_late' : 'online_present';
                    } else if (serverResult.type === 'out') {
                        mappedType = 'out';
                    } else if (serverResult.type === 'already') {
                        mappedType = 'already';
                    } else if (serverResult.type === 'already_out') {
                        mappedType = 'already_out';
                    } else if (serverResult.type === 'error_checkout_early') {
                        mappedType = 'error_checkout_early';
                    } else {
                        mappedType = serverResult.type as MarkResultType;
                    }

                    return {
                        success: serverResult.success,
                        person: currentPerson,
                        type: mappedType,
                        attendance_status: serverResult.attendance_status,
                        recorded_time: serverResult.recorded_time,
                    };
                }

                // Slow connection or network error: immediately record locally + queue for sync
                this.lastSlowNetworkAt = Date.now();
                const localFallback = await recordLocallyAndQueue(false);

                if (raced.kind === 'timeout') {
                    // If the slow in-flight server request eventually succeeds, mark the queued item as synced
                    serverPromise
                        .then(async () => {
                            if (localFallback.queuedId !== undefined) {
                                await this.markQueueItemSynced(localFallback.queuedId);
                                window.dispatchEvent(new CustomEvent('offline-sync-completed', {
                                    detail: { success: 1, failed: 0, silent: true },
                                }));
                            }
                        })
                        .catch(() => {});
                }

                return localFallback;
            }

            // Offline path
            return await recordLocallyAndQueue(false);
        } catch (attendanceError) {
            console.error('RFID attendance logic failed:', attendanceError);
            return { success: false, person: currentPerson, type: 'error' };
        }
    }

    async markAttendanceWithPerson(
        person: RFIDMapping,
        schoolId: number,
        targetDate?: string,
        forceOffline: boolean = false,
    ): Promise<{ success: boolean; person: RFIDMapping | null; type: MarkResultType; attendance_status?: string; recorded_time?: string }> {
        const platform = this.getRuntimePlatform();
        let cleanUID = sanitizeRfidUid(person.rfid_uid);
        if (cleanUID.length < 4) {
            cleanUID = this.buildSyntheticFaceQueueUid(person.person_id);
        }
        return this.runAttendancePipelineAfterIdentification(person, schoolId, targetDate, cleanUID, platform, forceOffline);
    }

    async deleteAttendanceRecord(
        schoolId: number,
        personId: number | string,
        personType: 'student' | 'employee',
        date: string
    ): Promise<void> {
        const table = personType === 'student' ? 'attendance_records' : 'staff_attendance_records';
        const idCol = personType === 'student' ? 'student_id' : 'staff_id';
        const numericPersonId = Number(personId);
        const numericSchoolId = Number(schoolId);

        const historyKey = this.buildDailyHistoryKey(numericSchoolId, date, personType, numericPersonId);
        this.memoryDailyHistory.delete(historyKey);
        this.inMemoryTodayScans.delete(historyKey);

        // 1. Delete online from Supabase if connected (non-blocking if slow)
        if (navigator.onLine) {
            Promise.race([
                supabase
                    .from(table)
                    .delete()
                    .eq('school_id', numericSchoolId)
                    .eq(idCol, numericPersonId)
                    .eq('date', date),
                new Promise(resolve => setTimeout(resolve, 1500)),
            ]).catch((e) => {
                console.warn('Error deleting online attendance record:', e);
            });
        }

        // 2. Delete from IndexedDB STORE_DAILY_HISTORY
        try {
            const db = await this.getDB();
            await new Promise<void>((resolve) => {
                const tx = db.transaction(STORE_DAILY_HISTORY, 'readwrite');
                tx.objectStore(STORE_DAILY_HISTORY).delete(historyKey);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {}

        // 3. Remove pending queued scans for this person on date from STORE_QUEUE
        try {
            const db = await this.getDB();
            await new Promise<void>((resolve) => {
                const tx = db.transaction(STORE_QUEUE, 'readwrite');
                const store = tx.objectStore(STORE_QUEUE);
                const req = store.getAll();
                req.onsuccess = () => {
                    const list = (req.result || []) as QueuedScan[];
                    list.forEach(q => {
                        if (
                            Number(q.school_id) === numericSchoolId &&
                            q.date === date &&
                            q.person_type === personType &&
                            Number(q.person_id) === numericPersonId &&
                            q.id !== undefined
                        ) {
                            store.delete(q.id);
                        }
                    });
                };
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {}

        // 4. Remove from in-memory cache
        const mapKey = `${numericSchoolId}:${date}:${personType}:${numericPersonId}`;
        this.inMemoryTodayScans.delete(mapKey);
    }
}

export const rfidOfflineService = new RFIDOfflineService();


export type MarkResultType = 'new' | 'already' | 'error' | 'offline' | 'out' | 'error_checkout_early' | 'already_out' | 'error_inactive' | 'error_manual_only' | 'error_holiday' | 'offline_present' | 'offline_late' | 'offline_checkout' | 'offline_already' | 'offline_already_out' | 'offline_checkout_early' | 'online_present' | 'online_late';
