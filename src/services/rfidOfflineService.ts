import { Capacitor } from '@capacitor/core';
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
    private lastHistoryRefresh: number = 0;
    private historyRefreshInterval: number = 60000;
    private cachedServerTimestamp: { timestamp: string; fetchedAt: number } | null = null;
    private serverTimestampCacheDuration: number = 30000;
    // Mutex: prevents concurrent cacheMappings calls from racing and corrupting the store
    private cacheMappingsPromise: Promise<void> | null = null;

    private async persistNativeBackgroundCache(
        schoolId: string,
        mappings: RFIDMapping[],
        settings?: any,
        sessionId?: number | null
    ): Promise<void> {
        try {
            const { Capacitor } = await import('@capacitor/core');
            if (!Capacitor.isNativePlatform()) return;

            const { Preferences } = await import('@capacitor/preferences');
            if (!Preferences) return;

            await Preferences.set({
                key: `${NATIVE_RFID_CACHE_PREFIX}${schoolId}`,
                value: JSON.stringify(mappings),
            });

            if (settings) {
                await Preferences.set({
                    key: `${NATIVE_ATTN_SETTINGS_PREFIX}${schoolId}`,
                    value: JSON.stringify(settings),
                });
            }

            if (sessionId) {
                await Preferences.set({
                    key: `${NATIVE_ACTIVE_SESSION_PREFIX}${schoolId}`,
                    value: String(sessionId),
                });
            }
        } catch (error) {
            console.warn('Failed to persist native RFID background cache:', error);
        }
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
        try {
            if (!Capacitor.isNativePlatform()) return [];

            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key: `${NATIVE_RFID_CACHE_PREFIX}${schoolId}` });
            if (!value) return [];

            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Failed to read native RFID fallback cache:', error);
            return [];
        }
    }

    private async replaceIndexedDbMappings(mappings: RFIDMapping[]): Promise<void> {
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
        try {
            const { Capacitor } = await import('@capacitor/core');
            if (!Capacitor.isNativePlatform()) return;

            const { Preferences } = await import('@capacitor/preferences');
            if (!Preferences) return;

            await Preferences.set({
                key: `${NATIVE_DAILY_HISTORY_PREFIX}${schoolId}_${date}`,
                value: JSON.stringify(historyItems),
            });
        } catch (error) {
            console.warn('Failed to persist native RFID daily history cache:', error);
        }
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
        if (typeof window !== 'undefined' && window.electronAPI) {
            return 'electron';
        }
        if (Capacitor.isNativePlatform()) {
            return 'mobile';
        }
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

    private async getActiveSessionId(schoolId: number): Promise<number | null> {
        const cachedSession = await this.getConfig(KEY_ACTIVE_SESSION);
        
        if (navigator.onLine) {
            // Background refresh
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

    private async getAttendanceSettings(schoolId: number): Promise<any> {
        const cachedSettings = await this.getConfig(KEY_ATTN_SETTINGS);
        
        if (navigator.onLine) {
            // Background refresh
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

    private async getDB(): Promise<IDBDatabase> {
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
            // Fetch students
            const { data: students } = await supabase
                .from('students')
                .select('id, name, father_name, rfid_uid, qr_uid, attendance_mode, roll_number, picture_url, status, class_id, section_id, classes:class_id(name), sections:section_id(name), face_embedding, face_embedding_dim')
                .eq('school_id', schoolId);

            // Fetch staff
            const { data: staff } = await supabase
                .from('staff')
                .select('id, name, rfid_uid, qr_uid, attendance_mode, role, picture_url, status, face_embedding, face_embedding_dim')
                .eq('school_id', schoolId);

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
                    picture_url: s.picture_url,
                    father_name: s.father_name,
                    status: (s as any).status || 'active',
                    face_embedding: (s as any).face_embedding,
                    face_embedding_dim: (s as any).face_embedding_dim,
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
                const mapping: RFIDMapping = {
                    rfid_uid: rfidUid,
                    person_id: s.id,
                    name: s.name,
                    type: 'employee',
                    attendance_mode: this.normalizeAttendanceMode((s as any).attendance_mode, hasCard || !!(s as any).face_embedding),
                    role: s.role,
                    picture_url: s.picture_url,
                    status: (s as any).status || 'active',
                    face_embedding: (s as any).face_embedding,
                    face_embedding_dim: (s as any).face_embedding_dim,
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
                uidKeys.forEach(uid => store.put({ ...mapping, rfid_uid: uid }));
                serializedMappings.push(mapping);

                processedCount++;
                if (onProgress && processedCount % 5 === 0) {
                    onProgress(processedCount, totalCount, `Processing staff... (${processedCount}/${totalCount})`);
                }
            });

            if (onProgress) onProgress(totalCount, totalCount, 'Finalizing local storage...');

            // Use a chunked approach to fetch and cache images concurrently but without overloading
            const cacheImages = async (mappings: RFIDMapping[]) => {
                const totalImages = mappings.filter(m => m.picture_url && !m.picture_url.startsWith('data:')).length;
                if (totalImages === 0) return;

                let imageProcessedCount = 0;
                const chunks = [];
                const chunkSize = 5;
                for (let i = 0; i < mappings.length; i += chunkSize) {
                    chunks.push(mappings.slice(i, i + chunkSize));
                }

                if (onProgress) onProgress(0, totalImages, `Caching student images... (0/${totalImages})`);

                for (const chunk of chunks) {
                    await Promise.all(chunk.map(async (m) => {
                        if (m.picture_url && !m.picture_url.startsWith('data:')) {
                            const cached = await this.fetchAndCacheImage(m.picture_url);
                            if (cached) {
                                m.picture_url = cached;
                                const uidKeysImg = new Set<string>();
                                buildRfidUidCandidates(m.rfid_uid).forEach(u => uidKeysImg.add(u));
                                const cq = canonicalQrTokenForMatch(m.rfid_uid);
                                if (cq.length >= 4) uidKeysImg.add(cq);
                                const txImg = db.transaction(STORE_MAPPINGS, 'readwrite');
                                const storeImg = txImg.objectStore(STORE_MAPPINGS);
                                uidKeysImg.forEach(uid => storeImg.put({ ...m, rfid_uid: uid }));
                            }
                            imageProcessedCount++;
                            if (onProgress && imageProcessedCount % 5 === 0) {
                                onProgress(imageProcessedCount, totalImages, `Caching student images... (${imageProcessedCount}/${totalImages})`);
                            }
                        }
                    }));
                }
                if (onProgress) onProgress(totalImages, totalImages, 'Images cached successfully.');
            };

            // Await image caching so the UI shows the full progress of offline data preparation
            await cacheImages(serializedMappings);

            let sessionId: number | null = null;
            let settingsPayload: any = null;

            try {
                const { data: session } = await supabase
                    .from('sessions')
                    .select('id')
                    .eq('school_id', schoolId)
                    .eq('is_active', true)
                    .maybeSingle();
                if (session?.id) {
                    sessionId = session.id;
                    await this.cacheConfig(KEY_ACTIVE_SESSION, session.id);
                }

                const { data: settings } = await supabase
                    .from('attendance_settings')
                    .select('*')
                    .eq('school_id', schoolId)
                    .maybeSingle();
                if (settings) {
                    settingsPayload = settings;
                    await this.cacheConfig(KEY_ATTN_SETTINGS, settings);
                }
            } catch (e) {
                console.warn('Failed to cache active session or settings:', e);
            }

            this.persistWebFallbackMappings(schoolId, serializedMappings);
            await this.persistNativeBackgroundCache(schoolId, serializedMappings, settingsPayload, sessionId);
        } catch (error) {
            console.error('Failed to cache RFID mappings:', error);
        }
    }

    async cacheConfig(key: string, value: any): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(STORE_CONFIG, 'readwrite');
        tx.objectStore(STORE_CONFIG).put(value, key);
    }

    async getConfig(key: string): Promise<any> {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_CONFIG, 'readonly');
            const request = tx.objectStore(STORE_CONFIG).get(key);
            request.onsuccess = () => resolve(request.result);
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

        const studentIds = Array.from(new Set(
            studentAttendance
                .map(item => Number(item.student_id))
                .filter(id => Number.isFinite(id))
        ));
        const staffIds = Array.from(new Set(
            staffAttendance
                .map(item => Number(item.staff_id))
                .filter(id => Number.isFinite(id))
        ));

        const [studentsResult, staffResult] = await Promise.all([
            studentIds.length > 0
                ? supabase
                    .from('students')
                    .select('id, name, father_name, roll_number, picture_url, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                    .eq('school_id', schoolId)
                    .in('id', studentIds)
                : Promise.resolve({ data: [], error: null } as any),
            staffIds.length > 0
                ? supabase
                    .from('staff')
                    .select('id, name, role, picture_url')
                    .eq('school_id', schoolId)
                    .in('id', staffIds)
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
                const student = studentsById.get(Number(record.student_id));
                const classId = record.class_id ?? student?.class_id;
                const sectionId = record.section_id ?? student?.section_id;
                return {
                    key: this.buildDailyHistoryKey(schoolId, date, 'student', Number(record.student_id)),
                    school_id: schoolId,
                    date,
                    person_id: Number(record.student_id),
                    person_type: 'student' as const,
                    name: student?.name || `Student ${record.student_id}`,
                    father_name: student?.father_name,
                    roll_number: student?.roll_number,
                    class_id: classId ?? undefined,
                    section_id: sectionId ?? undefined,
                    class_name: student?.classes?.name,
                    section_name: student?.sections?.name,
                    picture_url: student?.picture_url,
                    status: record.status,
                    check_in_time: record.check_in_time,
                    check_out_time: record.check_out_time,
                    source: record.source,
                    updated_at: new Date().toISOString(),
                };
            }),
            ...staffAttendance.map((record: any) => {
                const staff = staffById.get(Number(record.staff_id));
                return {
                    key: this.buildDailyHistoryKey(schoolId, date, 'employee', Number(record.staff_id)),
                    school_id: schoolId,
                    date,
                    person_id: Number(record.staff_id),
                    person_type: 'employee' as const,
                    name: staff?.name || `Staff ${record.staff_id}`,
                    role: staff?.role,
                    picture_url: staff?.picture_url,
                    status: record.status,
                    check_in_time: record.check_in_time,
                    check_out_time: record.check_out_time,
                    source: record.source,
                    updated_at: new Date().toISOString(),
                };
            }),
        ];

        const existing = await this.getCachedDailyAttendanceHistory(schoolId, date);
        const existingKeys = existing.map(item => item.key);
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

        await this.persistNativeDailyHistory(schoolId, date, historyItems);

        return historyItems;
    }

    async upsertCachedAttendanceHistoryItem(item: CachedAttendanceHistoryItem): Promise<void> {
        const db = await this.getDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_DAILY_HISTORY, 'readwrite');
            tx.objectStore(STORE_DAILY_HISTORY).put({
                ...item,
                updated_at: item.updated_at || new Date().toISOString(),
            });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });

        const history = await this.getCachedDailyAttendanceHistory(item.school_id, item.date);
        await this.persistNativeDailyHistory(item.school_id, item.date, history);
    }

    /**
     * Get all unique cached mappings
     */
    async getAllMappings(): Promise<RFIDMapping[]> {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_MAPPINGS, 'readonly');
            const store = tx.objectStore(STORE_MAPPINGS);
            const request = store.getAll();
            request.onsuccess = () => {
                const list = (request.result || []) as RFIDMapping[];
                const seen = new Set<string>();
                const unique: RFIDMapping[] = [];
                for (const item of list) {
                    const key = `${item.type}_${item.person_id}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        unique.push(item);
                    }
                }
                resolve(unique);
            };
            request.onerror = () => resolve([]);
        });
    }

    /**
     * Lookup a person by RFID UID from local cache
     */
    async lookupRFID(scanInput: string): Promise<RFIDMapping | null> {
        const db = await this.getDB();
        const rawCanon = canonicalQrTokenForMatch(scanInput);
        const hexKey = extractAttendanceUidFromQrPayload(scanInput) || sanitizeRfidUid(scanInput);
        const candidates = hexKey.length >= 4 ? buildRfidUidCandidates(hexKey) : [];
        const prefixCandidates = hexKey.length >= 4 ? buildRfidUidPrefixCandidates(hexKey) : [];

        return new Promise((resolve) => {
            const tx = db.transaction(STORE_MAPPINGS, 'readonly');
            const store = tx.objectStore(STORE_MAPPINGS);
            let candidateIndex = 0;

            const tryRawCanonical = () => {
                if (rawCanon.length < 4) {
                    tryNextCandidate();
                    return;
                }
                const req = store.get(rawCanon);
                req.onsuccess = () => {
                    const result = req.result || null;
                    if (result) {
                        result.attendance_mode = this.normalizeAttendanceMode(result.attendance_mode, true);
                        resolve(result);
                        return;
                    }
                    tryNextCandidate();
                };
                req.onerror = () => tryNextCandidate();
            };

            const tryNextCandidate = () => {
                if (candidateIndex >= candidates.length) {
                    // Fallback to full store scan for prefix matches
                    const allRequest = store.getAll();
                    allRequest.onsuccess = () => {
                        const mappings = (allRequest.result || []) as RFIDMapping[];
                        for (const prefix of prefixCandidates) {
                            const match = mappings.find(m => m.rfid_uid && m.rfid_uid.startsWith(prefix));
                            if (match) {
                                match.attendance_mode = this.normalizeAttendanceMode(match.attendance_mode, true);
                                resolve(match);
                                return;
                            }
                        }
                        resolve(null);
                    };
                    allRequest.onerror = () => resolve(null);
                    return;
                }

                const request = store.get(candidates[candidateIndex]);
                candidateIndex += 1;

                request.onsuccess = () => {
                    const result = request.result || null;
                    if (result) {
                        result.attendance_mode = this.normalizeAttendanceMode(result.attendance_mode, true);
                        resolve(result);
                        return;
                    }

                    tryNextCandidate();
                };
                request.onerror = () => tryNextCandidate();
            };

            tryRawCanonical();
        });
    }

    /**
     * Queue a scan locally when offline or as a fallback
     */
    async queueScan(scan: QueuedScan): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        store.add(this.normalizeQueuedScan({
            ...scan,
            platform: scan.platform || this.getRuntimePlatform(),
            sync_status: 'pending',
            sequence_order: scan.sequence_order || Date.now(),
            synced_at: null,
        }));
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
    }): Promise<{ success: boolean; type: MarkResultType; attendance_status?: string; recorded_time?: string; actionTaken: ScanHistoryAction }> {
        const { person, schoolId, date, timestamp, sessionId, settings, mode, platform } = params;
        const table = person.type === 'student' ? 'attendance_records' : 'staff_attendance_records';
        const idCol = person.type === 'student' ? 'student_id' : 'staff_id';
        const computedStatus = this.computeAttendanceStatus(person.type, timestamp, date, settings);
        const recordSource = mode === 'offline' ? 'rfid-offline' : 'rfid';

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
                });

                return { success: true, type: 'out', attendance_status: existing.status || computedStatus, recorded_time: timestamp, actionTaken: 'checkout' };
            }

            if (person.type === 'employee' && existing.check_out_time) {
                this.logScanHistory({
                    schoolId,
                    userId: person.person_id,
                    role: person.type,
                    timestamp,
                    platform,
                    mode,
                    actionTaken: 'already_checked_out',
                    metadata: { attendance_table: table, attendance_record_id: existing.id },
                });
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

                // Store expected arrival/departure times from settings for staff
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
                });

                return { success: true, type: 'new', attendance_status: computedStatus, recorded_time: timestamp, actionTaken: computedStatus === 'late' ? 'late' : 'present' };
            }

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

        const payload: any = {
            [idCol]: person.person_id,
            school_id: schoolId,
            session_id: sessionId,
            date,
            status: computedStatus,
            source: recordSource,
            check_in_time: timestamp,
        };

        // Store expected arrival/departure times from settings for staff
        if (person.type === 'employee' && settings) {
            if (settings.staff_start_time) payload.expected_arrival_time = settings.staff_start_time;
            if (settings.staff_end_time) payload.expected_departure_time = settings.staff_end_time;
        }

        if (person.type === 'student') {
            if (person.class_id) payload.class_id = person.class_id;
            if (person.section_id) payload.section_id = person.section_id;
        }

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
            });
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
            // 1. Lookup the person (raw scan: hex + canonical QR keys in IndexedDB)
            const mapping = await this.lookupRFID(rawTrim);
            let person: RFIDMapping | null = mapping;

            if (!person && !navigator.onLine) {
                const restored = await this.rehydrateMappingsFromFallbackCache(String(schoolId));
                if (restored) {
                    person = await this.lookupRFID(rawTrim);
                }
            }

            if (!person && navigator.onLine && hasHex) {
                const { data: student } = await supabase.from('students')
                    .select('id, name, father_name, roll_number, picture_url, status, attendance_mode, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                    .eq('school_id', schoolId).in('rfid_uid', uidCandidatesCI).maybeSingle();

                if (student) {
                    person = {
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
                } else {
                    const { data: staff } = await supabase.from('staff')
                        .select('id, name, picture_url, role, status, attendance_mode')
                        .eq('school_id', schoolId).in('rfid_uid', uidCandidatesCI).maybeSingle();

                    if (staff) {
                        person = {
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

                if (!person) {
                    const { data: studentQr } = await supabase.from('students')
                        .select('id, name, father_name, roll_number, picture_url, status, attendance_mode, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                        .eq('school_id', schoolId).in('qr_uid', uidCandidatesCI).maybeSingle();

                    if (studentQr) {
                        person = {
                            rfid_uid: cleanUID,
                            person_id: studentQr.id,
                            name: studentQr.name,
                            type: 'student',
                            attendance_mode: this.normalizeAttendanceMode((studentQr as any).attendance_mode, true),
                            picture_url: studentQr.picture_url,
                            father_name: (studentQr as any).father_name,
                            roll_number: (studentQr as any).roll_number,
                            class_name: (studentQr as any).classes?.name,
                            section_name: (studentQr as any).sections?.name,
                            class_id: studentQr.class_id,
                            section_id: studentQr.section_id,
                            status: (studentQr as any).status || 'active',
                        };
                    } else {
                        const { data: staffQr } = await supabase.from('staff')
                            .select('id, name, picture_url, role, status, attendance_mode')
                            .eq('school_id', schoolId).in('qr_uid', uidCandidatesCI).maybeSingle();

                        if (staffQr) {
                            person = {
                                rfid_uid: cleanUID,
                                person_id: staffQr.id,
                                name: staffQr.name,
                                type: 'employee',
                                attendance_mode: this.normalizeAttendanceMode((staffQr as any).attendance_mode, true),
                                picture_url: staffQr.picture_url,
                                role: staffQr.role,
                                status: (staffQr as any).status || 'active',
                            };
                        }
                    }
                }

                if (!person) {
                    const prefixCandidates = buildRfidUidPrefixCandidates(cleanUID);

                    for (const prefixCandidate of prefixCandidates) {
                        const { data: prefixedStudents } = await supabase.from('students')
                            .select('id, name, father_name, roll_number, picture_url, status, attendance_mode, class_id, section_id, rfid_uid, classes:class_id(name), sections:section_id(name)')
                            .eq('school_id', schoolId)
                            .ilike('rfid_uid', `${prefixCandidate}%`)
                            .limit(2);

                        if ((prefixedStudents || []).length === 1) {
                            const student = prefixedStudents![0] as any;
                            person = {
                                rfid_uid: sanitizeRfidUid(student.rfid_uid || cleanUID),
                                person_id: student.id,
                                name: student.name,
                                type: 'student',
                                attendance_mode: this.normalizeAttendanceMode(student.attendance_mode, true),
                                picture_url: student.picture_url,
                                father_name: student.father_name,
                                roll_number: student.roll_number,
                                class_name: student.classes?.name,
                                section_name: student.sections?.name,
                                class_id: student.class_id,
                                section_id: student.section_id,
                                status: student.status || 'active',
                            };
                            break;
                        }

                        const { data: prefixedStaff } = await supabase.from('staff')
                            .select('id, name, picture_url, role, status, attendance_mode, rfid_uid')
                            .eq('school_id', schoolId)
                            .ilike('rfid_uid', `${prefixCandidate}%`)
                            .limit(2);

                        if ((prefixedStaff || []).length === 1) {
                            const staff = prefixedStaff![0] as any;
                            person = {
                                rfid_uid: sanitizeRfidUid(staff.rfid_uid || cleanUID),
                                person_id: staff.id,
                                name: staff.name,
                                type: 'employee',
                                attendance_mode: this.normalizeAttendanceMode(staff.attendance_mode, true),
                                picture_url: staff.picture_url,
                                role: staff.role,
                                status: staff.status || 'active',
                            };
                            break;
                        }
                    }
                }
            }

            if (!person && navigator.onLine && hasQrToken) {
                const { data: studentRawQr } = await supabase.from('students')
                    .select('id, name, father_name, roll_number, picture_url, status, attendance_mode, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                    .eq('school_id', schoolId)
                    .eq('qr_uid', qrCanonical)
                    .maybeSingle();

                if (studentRawQr) {
                    person = {
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
                } else {
                    const { data: staffRawQr } = await supabase.from('staff')
                        .select('id, name, picture_url, role, status, attendance_mode')
                        .eq('school_id', schoolId)
                        .eq('qr_uid', qrCanonical)
                        .maybeSingle();

                    if (staffRawQr) {
                        person = {
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
            }

            if (!person) {
                if (navigator.onLine) {
                    const timestamp = (await this.getServerTimestamp()) || new Date().toISOString();
                    this.logScanHistory({
                        schoolId,
                        userId: null,
                        role: 'unknown',
                        timestamp,
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

        if (effectiveAttendanceMode === 'manual_only') {
            if (navigator.onLine) {
                const timestamp = (await this.getServerTimestamp()) || new Date().toISOString();
                this.logScanHistory({
                    schoolId,
                    userId: resolvedPerson.person_id,
                    role: resolvedPerson.type,
                    timestamp,
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
                const timestamp = (await this.getServerTimestamp()) || new Date().toISOString();
                this.logScanHistory({
                    schoolId,
                    userId: resolvedPerson.person_id,
                    role: resolvedPerson.type,
                    timestamp,
                    platform,
                    mode: 'online',
                    actionTaken: 'ignored',
                    metadata: { reason: 'inactive_person', status: resolvedPerson.status },
                }).catch(() => {});
            }
            return { success: false, person: resolvedPerson, type: 'error_inactive' };
        }

        const settings = await this.getAttendanceSettings(schoolId);
        const now = new Date().toISOString();
        const offlineSettings = settings || await this.getConfig(KEY_ATTN_SETTINGS);
        const offlineTimezone = offlineSettings?.timezone || 'Asia/Karachi';
        const localParts = this.getLocalTimestampParts(now, offlineTimezone);
        const offlineDate = targetDate || localParts.date;
        const sessionId = await this.getActiveSessionId(schoolId);
        const currentPerson = resolvedPerson;

        // After finding the person, wrap attendance logic separately so errors don't
        // produce a misleading 'unknown card' (person: null) response.
        try {
            let result: {
                success: boolean;
                person: RFIDMapping | null;
                type: MarkResultType;
                attendance_status?: string;
                recorded_time?: string;
            };

            if (navigator.onLine) {
                // ── ONLINE PATH: always query the DB directly for current attendance state ──
                // This prevents stale local cache from causing wrong checkout/checkin decisions.
                const serverResult = await this.applyScanToServer({
                    person: currentPerson,
                    schoolId,
                    date: offlineDate,
                    timestamp: now,
                    sessionId,
                    settings: offlineSettings,
                    mode: 'online',
                    platform,
                });

                // Map server result types to the full MarkResultType set
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

                result = {
                    success: serverResult.success,
                    person: currentPerson,
                    type: mappedType,
                    attendance_status: serverResult.attendance_status,
                    recorded_time: serverResult.recorded_time,
                };

                // Update local cache in background to keep feed in sync
                this.cacheDailyAttendanceHistory(schoolId, offlineDate).catch(() => {});
                this.lastHistoryRefresh = Date.now();
            } else {
                // ── OFFLINE PATH: use local cache for instant feedback ──
                const existingHistory = await this.getCachedDailyAttendanceHistory(schoolId, offlineDate);
                const historyKey = this.buildDailyHistoryKey(schoolId, offlineDate, currentPerson.type, currentPerson.person_id);
                const existingRecord = existingHistory.find(h => h.key === historyKey);

                if (existingRecord) {
                    if (currentPerson.type === 'employee' && this.isEmployeeActiveAttendance(existingRecord)) {
                        if (!this.isCheckoutAllowed(now, offlineDate, offlineSettings)) {
                            result = { success: false, person: currentPerson, type: 'offline_checkout_early', attendance_status: existingRecord.status || 'present', recorded_time: existingRecord.check_in_time || now };
                        } else {
                            await this.upsertCachedAttendanceHistoryItem({ ...existingRecord, check_out_time: now, updated_at: now });
                            await this.queueScan({
                                rfid_uid: cleanUID, person_id: currentPerson.person_id, person_type: currentPerson.type,
                                school_id: schoolId, session_id: sessionId, date: offlineDate, timestamp: now,
                                scan_type: 'out', platform, sync_status: 'pending', sequence_order: Date.now(), source: 'rfid-offline',
                                class_id: currentPerson.class_id, section_id: currentPerson.section_id
                            });
                            result = { success: true, person: currentPerson, type: 'offline_checkout', attendance_status: existingRecord.status || 'present', recorded_time: now };
                        }
                    } else if (currentPerson.type === 'employee' && existingRecord.check_out_time) {
                        result = { success: true, person: currentPerson, type: 'already_out', attendance_status: existingRecord.status || 'present', recorded_time: existingRecord.check_out_time };
                    } else {
                        result = { success: true, person: currentPerson, type: 'already', attendance_status: existingRecord.status || 'present', recorded_time: existingRecord.check_in_time || now };
                    }
                } else {
                    const computedStatus = this.computeAttendanceStatus(currentPerson.type, now, offlineDate, offlineSettings);
                    await this.upsertCachedAttendanceHistoryItem(this.buildHistoryItem(schoolId, offlineDate, currentPerson, {
                        status: computedStatus, check_in_time: now, check_out_time: null, source: 'rfid-offline', updated_at: now
                    }));
                    await this.queueScan({
                        rfid_uid: cleanUID, person_id: currentPerson.person_id, person_type: currentPerson.type,
                        school_id: schoolId, session_id: sessionId, date: offlineDate, timestamp: now,
                        scan_type: 'in', platform, sync_status: 'pending', sequence_order: Date.now(), source: 'rfid-offline',
                        class_id: currentPerson.class_id, section_id: currentPerson.section_id
                    });
                    result = {
                        success: true,
                        person: currentPerson,
                        type: computedStatus === 'late' ? 'offline_late' : 'offline_present',
                        attendance_status: computedStatus,
                        recorded_time: now
                    };
                }
            }

            return result;
        } catch (attendanceError) {
            // Attendance logic failed AFTER finding the person — return a meaningful error
            // that still includes the person so the UI can show their name, not "Unknown Card".
            console.error('RFID attendance logic failed:', attendanceError);
            return { success: false, person: currentPerson, type: 'error' };
        }

    }

    async markAttendanceWithPerson(
        person: RFIDMapping,
        schoolId: number,
        targetDate?: string,
    ): Promise<{ success: boolean; person: RFIDMapping | null; type: MarkResultType; attendance_status?: string; recorded_time?: string }> {
        const platform = this.getRuntimePlatform();
        let cleanUID = sanitizeRfidUid(person.rfid_uid);
        if (cleanUID.length < 4) {
            cleanUID = this.buildSyntheticFaceQueueUid(person.person_id);
        }
        return this.runAttendancePipelineAfterIdentification(person, schoolId, targetDate, cleanUID, platform);
    }
}

export const rfidOfflineService = new RFIDOfflineService();
export type MarkResultType = 'new' | 'already' | 'error' | 'offline' | 'out' | 'error_checkout_early' | 'already_out' | 'error_inactive' | 'error_manual_only' | 'offline_present' | 'offline_late' | 'offline_checkout' | 'offline_already' | 'offline_already_out' | 'offline_checkout_early' | 'online_present' | 'online_late';