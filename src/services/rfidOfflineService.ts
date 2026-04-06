import { supabase } from '../supabaseClient';

const DB_NAME = 'rfid_attendance_db';
const DB_VERSION = 4;
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
    scan_type: 'in' | 'out'; // Track if entering or leaving
    class_id?: number;
    section_id?: number;
    source: 'rfid-offline';
    status?: string;
}

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
    source?: string | null;
    updated_at?: string;
}

class RFIDOfflineService {
    private db: IDBDatabase | null = null;

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
    async cacheMappings(schoolId: string): Promise<void> {
        if (!navigator.onLine) return;

        try {
            // Fetch students
            const { data: students } = await supabase
                .from('students')
                .select('id, name, father_name, rfid_uid, attendance_mode, roll_number, picture_url, status, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                .eq('school_id', schoolId)
                .not('rfid_uid', 'is', null);

            // Fetch staff
            const { data: staff } = await supabase
                .from('staff')
                .select('id, name, rfid_uid, attendance_mode, role, picture_url, status')
                .eq('school_id', schoolId)
                .not('rfid_uid', 'is', null);

            const db = await this.getDB();
            const tx = db.transaction(STORE_MAPPINGS, 'readwrite');
            const store = tx.objectStore(STORE_MAPPINGS);

            // Clear old mappings
            store.clear();

            // Add new mappings
            const serializedMappings: RFIDMapping[] = [];

            students?.forEach(s => {
                const mapping: RFIDMapping = {
                    rfid_uid: s.rfid_uid,
                    person_id: s.id,
                    name: s.name,
                    type: 'student',
                    attendance_mode: this.normalizeAttendanceMode((s as any).attendance_mode, !!s.rfid_uid),
                    class_name: (s.classes as any)?.name,
                    section_name: (s.sections as any)?.name,
                    class_id: s.class_id,
                    section_id: s.section_id,
                    roll_number: s.roll_number,
                    picture_url: s.picture_url,
                    father_name: s.father_name,
                    status: (s as any).status || 'active',
                };
                store.add(mapping);
                serializedMappings.push(mapping);
            });

            staff?.forEach(s => {
                const mapping: RFIDMapping = {
                    rfid_uid: s.rfid_uid,
                    person_id: s.id,
                    name: s.name,
                    type: 'employee',
                    attendance_mode: this.normalizeAttendanceMode((s as any).attendance_mode, !!s.rfid_uid),
                    role: s.role,
                    picture_url: s.picture_url,
                    status: (s as any).status || 'active',
                };
                store.add(mapping);
                serializedMappings.push(mapping);
            });

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
     * Lookup a person by RFID UID from local cache
     */
    async lookupRFID(rfid_uid: string): Promise<RFIDMapping | null> {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_MAPPINGS, 'readonly');
            const store = tx.objectStore(STORE_MAPPINGS);
            const request = store.get(rfid_uid.toUpperCase());

            request.onsuccess = () => {
                const result = request.result || null;
                if (result) {
                    result.attendance_mode = this.normalizeAttendanceMode(result.attendance_mode, true);
                }
                resolve(result);
            };
            request.onerror = () => resolve(null);
        });
    }

    /**
     * Queue a scan locally when offline or as a fallback
     */
    async queueScan(scan: QueuedScan): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        store.add(scan);
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
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    }

    /**
     * Remove a scan from the queue after successful sync
     */
    async removeFromQueue(id: number): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        store.delete(id);
    }

    private deriveEffectiveHistoryState(
        baseRecord: CachedAttendanceHistoryItem | null,
        queueEntries: QueuedScan[],
        fallbackPerson: RFIDMapping,
        schoolId: number,
        date: string
    ): CachedAttendanceHistoryItem | null {
        let current: CachedAttendanceHistoryItem | null = baseRecord
            ? { ...baseRecord }
            : null;

        const orderedQueue = [...queueEntries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        for (const queued of orderedQueue) {
            if (!current) {
                current = {
                    key: this.buildDailyHistoryKey(schoolId, date, fallbackPerson.type, fallbackPerson.person_id),
                    school_id: schoolId,
                    date,
                    person_id: fallbackPerson.person_id,
                    person_type: fallbackPerson.type,
                    name: fallbackPerson.name,
                    father_name: fallbackPerson.father_name,
                    roll_number: fallbackPerson.roll_number,
                    role: fallbackPerson.role,
                    class_id: queued.class_id ?? fallbackPerson.class_id,
                    section_id: queued.section_id ?? fallbackPerson.section_id,
                    class_name: fallbackPerson.class_name,
                    section_name: fallbackPerson.section_name,
                    picture_url: fallbackPerson.picture_url,
                    status: queued.status || 'present',
                    check_in_time: queued.scan_type === 'in' ? queued.timestamp : null,
                    check_out_time: queued.scan_type === 'out' ? queued.timestamp : null,
                    source: queued.source,
                    updated_at: queued.timestamp,
                };
                continue;
            }

            if (queued.scan_type === 'in') {
                current.status = queued.status || current.status || 'present';
                current.check_in_time = queued.timestamp;
                current.check_out_time = null;
                current.source = queued.source;
                current.class_id = queued.class_id ?? current.class_id;
                current.section_id = queued.section_id ?? current.section_id;
            } else {
                current.check_out_time = queued.timestamp;
                current.source = queued.source;
            }

            current.updated_at = queued.timestamp;
        }

        return current;
    }

    /**
     * Sync queued scans with Supabase
     */
    async syncQueue(onProgress?: (current: number, total: number) => void): Promise<{ success: number; failed: number }> {
        if (!navigator.onLine) return { success: 0, failed: 0 };

        const queue = await this.getQueue();
        if (queue.length === 0) return { success: 0, failed: 0 };

        let successCount = 0;
        let failedCount = 0;
        const total = queue.length;
        const datesToRefresh = new Set<string>();

        // Get fallback session ID if needed
        const cachedSession = await this.getConfig(KEY_ACTIVE_SESSION);

        for (let i = 0; i < total; i++) {
            const scan = queue[i];
            if (onProgress) onProgress(i + 1, total);

            try {
                const table = scan.person_type === 'student' ? 'attendance_records' : 'staff_attendance_records';
                const idCol = scan.person_type === 'student' ? 'student_id' : 'staff_id';

                if (scan.scan_type === 'out') {
                    // Update existing record for check-out
                    const { error } = await supabase.from(table)
                        .update({ check_out_time: scan.timestamp })
                        .eq(idCol, scan.person_id)
                        .eq('date', scan.date)
                        .is('check_out_time', null); // Only update if not already checked out

                    if (!error) {
                        if (scan.id) await this.removeFromQueue(scan.id);
                        datesToRefresh.add(`${scan.school_id}:${scan.date}`);
                        successCount++;
                    } else {
                        failedCount++;
                    }
                } else {
                    const { data: existing } = await supabase.from(table)
                        .select('id, status, source, check_in_time, check_out_time')
                        .eq(idCol, scan.person_id)
                        .eq('date', scan.date)
                        .eq('school_id', scan.school_id)
                        .maybeSingle();

                    if (scan.person_type === 'employee' && existing && this.isEmployeeActiveAttendance(existing)) {
                        const { error } = await supabase.from(table)
                            .update({ check_out_time: scan.timestamp })
                            .eq('id', existing.id)
                            .is('check_out_time', null);

                        if (!error) {
                            if (scan.id) await this.removeFromQueue(scan.id);
                            datesToRefresh.add(`${scan.school_id}:${scan.date}`);
                            successCount++;
                        } else {
                            failedCount++;
                        }
                        continue;
                    }

                    if (existing && (existing.status === 'absent' || (!existing.check_in_time && !this.isEmployeeActiveAttendance(existing)))) {
                        const updatePayload: any = {
                            session_id: Number(scan.session_id || cachedSession),
                            status: scan.status || 'present',
                            source: 'rfid',
                            check_in_time: scan.timestamp,
                        };

                        if (scan.person_type === 'student') {
                            if (scan.class_id) updatePayload.class_id = Number(scan.class_id);
                            if (scan.section_id) updatePayload.section_id = Number(scan.section_id);
                        }

                        const { error } = await supabase.from(table)
                            .update(updatePayload)
                            .eq('id', existing.id);

                        if (!error) {
                            if (scan.id) await this.removeFromQueue(scan.id);
                            datesToRefresh.add(`${scan.school_id}:${scan.date}`);
                            successCount++;
                        } else {
                            failedCount++;
                        }
                        continue;
                    }

                    if (existing) {
                        if (scan.id) await this.removeFromQueue(scan.id);
                        successCount++;
                        continue;
                    }

                    // Insert new record for check-in
                    const payload: any = {
                        school_id: Number(scan.school_id),
                        session_id: Number(scan.session_id || cachedSession),
                        date: scan.date,
                        status: scan.status || 'present',
                        source: 'rfid',
                        check_in_time: scan.timestamp,
                    };

                    if (scan.person_type === 'student') {
                        payload.student_id = Number(scan.person_id);
                        if (scan.class_id) payload.class_id = Number(scan.class_id);
                        if (scan.section_id) payload.section_id = Number(scan.section_id);
                    } else {
                        payload.staff_id = Number(scan.person_id);
                    }

                    const { error } = await supabase.from(table).insert(payload);

                    if (!error || error.code === '23505') {
                        if (scan.id) await this.removeFromQueue(scan.id);
                        datesToRefresh.add(`${scan.school_id}:${scan.date}`);
                        successCount++;
                    } else {
                        failedCount++;
                    }
                }
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
            detail: { success: successCount, failed: failedCount }
        }));

        return { success: successCount, failed: failedCount };
    }

    /**
     * Unified method to mark attendance via RFID UID.
     * Handles both online and offline tagging.
     */
    async markAttendance(uid: string, schoolId: number, targetDate?: string): Promise<{ success: boolean; person: RFIDMapping | null; type: MarkResultType; attendance_status?: string; recorded_time?: string }> {
        const cleanUID = uid.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
        if (cleanUID.length < 4) return { success: false, person: null, type: 'error' };

        const today = targetDate || new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        try {
            // 1. Lookup the person
            const mapping = await this.lookupRFID(cleanUID);
            let person: RFIDMapping | null = mapping;

            if (!person && navigator.onLine) {
                // Try online lookup as fallback
                const { data: student } = await supabase.from('students')
                    .select('id, name, father_name, roll_number, picture_url, status, attendance_mode, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                    .eq('school_id', schoolId).eq('rfid_uid', cleanUID).maybeSingle();

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
                        .eq('school_id', schoolId).eq('rfid_uid', cleanUID).maybeSingle();

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
            }

            if (!person) return { success: false, person: null, type: 'error' };

            const effectiveAttendanceMode = this.normalizeAttendanceMode(person.attendance_mode, true);

            if (navigator.onLine && person.attendance_mode !== effectiveAttendanceMode) {
                const peopleTable = person.type === 'student' ? 'students' : 'staff';
                const { error: modeUpdateError } = await supabase
                    .from(peopleTable)
                    .update({ attendance_mode: effectiveAttendanceMode })
                    .eq('id', person.person_id)
                    .eq('school_id', schoolId);

                if (!modeUpdateError) {
                    person.attendance_mode = effectiveAttendanceMode;
                }
            }

            if (effectiveAttendanceMode === 'manual_only') {
                return { success: false, person, type: 'error_manual_only' };
            }

            // 1b. Check if person is active
            if (person.status && person.status !== 'active') {
                return { success: false, person, type: 'error_inactive' };
            }

            // 2. Fetch Settings and Compute Late Status
            let settings = await this.getConfig(KEY_ATTN_SETTINGS);
            if (navigator.onLine) {
                const { data: olSettings } = await supabase.from('attendance_settings')
                    .select('*').eq('school_id', schoolId).maybeSingle();
                if (olSettings) {
                    settings = olSettings;
                    await this.cacheConfig(KEY_ATTN_SETTINGS, olSettings);
                }
            }

            let checkStatus = 'present';
            if (settings) {
                const markLateEnabled = person.type === 'student'
                    ? settings.student_mark_late_enabled !== false
                    : settings.staff_mark_late_enabled !== false;
                const startTimeStr = person.type === 'student' ? settings.student_start_time : settings.staff_start_time;
                if (markLateEnabled && startTimeStr) {
                    const [startH, startM] = startTimeStr.split(':').map(Number);
                    const startLimit = new Date();
                    startLimit.setHours(startH, startM, 0, 0);
                    startLimit.setMinutes(startLimit.getMinutes() + (settings.grace_period_minutes || 0));
                    if (new Date() > startLimit) checkStatus = 'late';
                }
            }

            let cachedHistory = await this.getCachedDailyAttendanceHistory(schoolId, today);
            if (navigator.onLine) {
                try {
                    cachedHistory = await this.cacheDailyAttendanceHistory(schoolId, today);
                } catch (historyError) {
                    console.warn('Failed to refresh cached attendance history before scan:', historyError);
                }
            }

            // 3. Mark attendance
            if (navigator.onLine) {
                const table = person.type === 'student' ? 'attendance_records' : 'staff_attendance_records';
                const idCol = person.type === 'student' ? 'student_id' : 'staff_id';

                // Check for duplicate or check-out
                const { data: existing } = await supabase.from(table)
                    .select('id, status, source, check_in_time, check_out_time')
                    .eq(idCol, person.person_id)
                    .eq('date', today)
                    .eq('school_id', schoolId)
                    .maybeSingle();

                if (existing) {
                    if (person.type === 'employee' && this.isEmployeeActiveAttendance(existing)) {
                        // Check if checkout is allowed yet
                        if (settings && settings.staff_end_time) {
                            const [endH, endM] = settings.staff_end_time.split(':').map(Number);
                            const endLimit = new Date();
                            endLimit.setHours(endH, endM, 0, 0);
                            if (new Date() < endLimit) {
                                return { success: false, person: person as RFIDMapping, type: 'error_checkout_early' };
                            }
                        }

                        const { error: outError } = await supabase.from(table)
                            .update({ check_out_time: now })
                            .eq('id', existing.id)
                            .is('check_out_time', null);
                        if (outError) throw outError;
                        await this.upsertCachedAttendanceHistoryItem({
                            key: this.buildDailyHistoryKey(schoolId, today, 'employee', person.person_id),
                            school_id: schoolId,
                            date: today,
                            person_id: person.person_id,
                            person_type: 'employee',
                            name: person.name,
                            role: person.role,
                            picture_url: person.picture_url,
                            status: existing.status,
                            check_in_time: existing.check_in_time,
                            check_out_time: now,
                            source: existing.source || 'rfid',
                            updated_at: now,
                        });
                        return { success: true, person, type: 'out', attendance_status: checkStatus, recorded_time: now };
                    }

                    if (existing.status === 'absent' || (!existing.check_in_time && !this.isEmployeeActiveAttendance(existing))) {
                        const cachedSession = await this.getConfig(KEY_ACTIVE_SESSION);
                        const { data: session } = await supabase.from('sessions')
                            .select('id').eq('school_id', schoolId).eq('is_active', true).maybeSingle();
                        const session_id = session?.id || cachedSession;

                        const updatePayload: any = {
                            session_id,
                            status: checkStatus,
                            source: 'rfid',
                            check_in_time: now,
                        };

                        if (person.type === 'student') {
                            if (person.class_id) updatePayload.class_id = person.class_id;
                            if (person.section_id) updatePayload.section_id = person.section_id;
                        }

                        const { error: updateError } = await supabase.from(table)
                            .update(updatePayload)
                            .eq('id', existing.id);
                        if (updateError) throw updateError;
                        await this.upsertCachedAttendanceHistoryItem({
                            key: this.buildDailyHistoryKey(schoolId, today, person.type, person.person_id),
                            school_id: schoolId,
                            date: today,
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
                            status: checkStatus,
                            check_in_time: now,
                            check_out_time: existing.check_out_time || null,
                            source: 'rfid',
                            updated_at: now,
                        });

                        return { success: true, person, type: 'new', attendance_status: checkStatus, recorded_time: now };
                    }
                    if (person.type === 'employee' && existing.check_out_time) {
                        return { success: true, person, type: 'already_out', attendance_status: checkStatus, recorded_time: existing.check_out_time };
                    }
                    return { success: true, person, type: 'already', attendance_status: checkStatus, recorded_time: existing.check_in_time };
                }

                // Get session
                const cachedSession = await this.getConfig(KEY_ACTIVE_SESSION);
                const { data: session } = await supabase.from('sessions')
                    .select('id').eq('school_id', schoolId).eq('is_active', true).maybeSingle();
                const session_id = session?.id || cachedSession;

                const payload: any = {
                    [idCol]: person.person_id,
                    school_id: schoolId,
                    session_id,
                    date: today,
                    status: checkStatus,
                    source: 'rfid',
                    check_in_time: now
                };
                if (person.type === 'student') {
                    if (person.class_id) payload.class_id = person.class_id;
                    if (person.section_id) payload.section_id = person.section_id;
                }

                const { error } = await supabase.from(table).insert(payload);
                if (error && error.code !== '23505') throw error;

                if (!error) {
                    await this.upsertCachedAttendanceHistoryItem({
                        key: this.buildDailyHistoryKey(schoolId, today, person.type, person.person_id),
                        school_id: schoolId,
                        date: today,
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
                        status: checkStatus,
                        check_in_time: now,
                        check_out_time: null,
                        source: 'rfid',
                        updated_at: now,
                    });
                }

                return { success: true, person, type: error?.code === '23505' ? 'already' : 'new', attendance_status: checkStatus, recorded_time: now };
            } else {
                // Offline queuing with check-in/check-out detection against both
                // cached online history and local queued scans.
                const currentPerson = person as RFIDMapping;
                const queue = await this.getQueue();
                const personQueue = queue
                    .filter(q => q.person_id === currentPerson.person_id && q.person_type === currentPerson.type && q.date === today)
                    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                const baseRecord = cachedHistory.find(item =>
                    item.person_id === currentPerson.person_id &&
                    item.person_type === currentPerson.type
                ) || null;
                const effectiveState = this.deriveEffectiveHistoryState(baseRecord, personQueue, currentPerson, schoolId, today);

                if (currentPerson.type === 'employee' && effectiveState?.check_out_time) {
                    return {
                        success: true,
                        person: currentPerson,
                        type: 'already_out',
                        attendance_status: (effectiveState.status as string) || checkStatus,
                        recorded_time: effectiveState.check_out_time || undefined
                    };
                }

                if (effectiveState?.check_in_time && !effectiveState.check_out_time) {
                    if (currentPerson.type === 'student') {
                        return {
                            success: true,
                            person: currentPerson,
                            type: 'already',
                            attendance_status: (effectiveState.status as string) || checkStatus,
                            recorded_time: effectiveState.check_in_time || undefined
                        };
                    }

                    if (settings && settings.staff_end_time) {
                        const [endH, endM] = settings.staff_end_time.split(':').map(Number);
                        const endLimit = new Date();
                        endLimit.setHours(endH, endM, 0, 0);
                        if (new Date() < endLimit) {
                            return { success: false, person: currentPerson, type: 'error_checkout_early' };
                        }
                    }

                    const cachedSession = await this.getConfig(KEY_ACTIVE_SESSION);
                    const queuedOutScan: QueuedScan = {
                        rfid_uid: cleanUID,
                        person_id: currentPerson.person_id,
                        person_type: currentPerson.type,
                        school_id: schoolId,
                        session_id: cachedSession || null,
                        date: today,
                        timestamp: now,
                        scan_type: 'out',
                        class_id: currentPerson.class_id,
                        section_id: currentPerson.section_id,
                        source: 'rfid-offline',
                        status: checkStatus
                    };
                    await this.queueScan(queuedOutScan);
                    const historyBase: CachedAttendanceHistoryItem = effectiveState
                        ? { ...effectiveState }
                        : {
                            key: this.buildDailyHistoryKey(schoolId, today, currentPerson.type, currentPerson.person_id),
                            school_id: schoolId,
                            date: today,
                            person_id: currentPerson.person_id,
                            person_type: currentPerson.type,
                            name: currentPerson.name,
                            father_name: currentPerson.father_name,
                            roll_number: currentPerson.roll_number,
                            role: currentPerson.role,
                            class_id: currentPerson.class_id,
                            section_id: currentPerson.section_id,
                            class_name: currentPerson.class_name,
                            section_name: currentPerson.section_name,
                            picture_url: currentPerson.picture_url,
                            status: checkStatus,
                            check_in_time: now,
                            source: 'rfid-offline',
                        };
                    await this.upsertCachedAttendanceHistoryItem({
                        ...historyBase,
                        check_out_time: now,
                        updated_at: now,
                    });
                    return { success: true, person: currentPerson, type: 'out', attendance_status: checkStatus, recorded_time: now };
                }

                if (effectiveState && (effectiveState.status === 'present' || effectiveState.status === 'late')) {
                    return {
                        success: true,
                        person: currentPerson,
                        type: 'already',
                        attendance_status: (effectiveState.status as string) || checkStatus,
                        recorded_time: effectiveState.check_in_time || undefined
                    };
                }

                const cachedSession = await this.getConfig(KEY_ACTIVE_SESSION);
                const queuedInScan: QueuedScan = {
                    rfid_uid: cleanUID,
                    person_id: currentPerson.person_id,
                    person_type: currentPerson.type,
                    school_id: schoolId,
                    session_id: cachedSession || null,
                    date: today,
                    timestamp: now,
                    scan_type: 'in',
                    class_id: currentPerson.class_id,
                    section_id: currentPerson.section_id,
                    source: 'rfid-offline',
                    status: checkStatus
                };
                await this.queueScan(queuedInScan);
                await this.upsertCachedAttendanceHistoryItem({
                    key: this.buildDailyHistoryKey(schoolId, today, currentPerson.type, currentPerson.person_id),
                    school_id: schoolId,
                    date: today,
                    person_id: currentPerson.person_id,
                    person_type: currentPerson.type,
                    name: currentPerson.name,
                    father_name: currentPerson.father_name,
                    roll_number: currentPerson.roll_number,
                    role: currentPerson.role,
                    class_id: currentPerson.class_id,
                    section_id: currentPerson.section_id,
                    class_name: currentPerson.class_name,
                    section_name: currentPerson.section_name,
                    picture_url: currentPerson.picture_url,
                    status: checkStatus,
                    check_in_time: now,
                    check_out_time: null,
                    source: 'rfid-offline',
                    updated_at: now,
                });
                return { success: true, person: currentPerson, type: 'offline', attendance_status: checkStatus, recorded_time: now };
            }

        } catch (error) {
            console.error('Failed to mark attendance:', error);
            return { success: false, person: null, type: 'error' };
        }
    }
}

export const rfidOfflineService = new RFIDOfflineService();
export type MarkResultType = 'new' | 'already' | 'error' | 'offline' | 'out' | 'error_checkout_early' | 'already_out' | 'error_inactive' | 'error_manual_only';
