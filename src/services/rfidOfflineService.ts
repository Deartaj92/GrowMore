import { supabase } from '../supabaseClient';

const DB_NAME = 'rfid_attendance_db';
const DB_VERSION = 3;
const STORE_MAPPINGS = 'mappings';
const STORE_QUEUE = 'scan_queue';
const STORE_CONFIG = 'config';
const KEY_ACTIVE_SESSION = 'active_session';
const KEY_ATTN_SETTINGS = 'attn_settings';

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

class RFIDOfflineService {
    private db: IDBDatabase | null = null;

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
            students?.forEach(s => {
                store.add({
                    rfid_uid: s.rfid_uid,
                    person_id: s.id,
                    name: s.name,
                    type: 'student',
                    attendance_mode: (s as any).attendance_mode || 'rfid_required',
                    class_name: (s.classes as any)?.name,
                    section_name: (s.sections as any)?.name,
                    class_id: s.class_id,
                    section_id: s.section_id,
                    roll_number: s.roll_number,
                    picture_url: s.picture_url,
                    father_name: s.father_name,
                    status: (s as any).status || 'active',
                });
            });

            staff?.forEach(s => {
                store.add({
                    rfid_uid: s.rfid_uid,
                    person_id: s.id,
                    name: s.name,
                    type: 'employee',
                    attendance_mode: (s as any).attendance_mode || 'rfid_required',
                    role: s.role,
                    picture_url: s.picture_url,
                    status: (s as any).status || 'active',
                });
            });
        } catch (error) {
            console.error('Failed to cache RFID mappings:', error);
        }

        // Also cache active session and settings
        try {
            const { data: session } = await supabase
                .from('sessions')
                .select('id')
                .eq('school_id', schoolId)
                .eq('is_active', true)
                .maybeSingle();
            if (session) {
                await this.cacheConfig(KEY_ACTIVE_SESSION, session.id);
            }
            const { data: settings } = await supabase
                .from('attendance_settings')
                .select('*')
                .eq('school_id', schoolId)
                .maybeSingle();
            if (settings) {
                await this.cacheConfig(KEY_ATTN_SETTINGS, settings);
            }
        } catch (e) {
            console.warn('Failed to cache active session or settings:', e);
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

    /**
     * Lookup a person by RFID UID from local cache
     */
    async lookupRFID(rfid_uid: string): Promise<RFIDMapping | null> {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_MAPPINGS, 'readonly');
            const store = tx.objectStore(STORE_MAPPINGS);
            const request = store.get(rfid_uid.toUpperCase());

            request.onsuccess = () => resolve(request.result || null);
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

                    if (existing && (existing.status === 'absent' || !existing.check_in_time)) {
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
                    .select('id, name, picture_url, status, attendance_mode, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                    .eq('school_id', schoolId).eq('rfid_uid', cleanUID).maybeSingle();

                if (student) {
                    person = {
                        rfid_uid: cleanUID,
                        person_id: student.id,
                        name: student.name,
                        type: 'student',
                        attendance_mode: (student as any).attendance_mode || 'rfid_required',
                        picture_url: student.picture_url,
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
                            attendance_mode: (staff as any).attendance_mode || 'rfid_required',
                            picture_url: staff.picture_url,
                            role: staff.role,
                            status: (staff as any).status || 'active',
                        };
                    }
                }
            }

            if (!person) return { success: false, person: null, type: 'error' };

            if ((person.attendance_mode || 'rfid_required') === 'manual_only') {
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
                const startTimeStr = person.type === 'student' ? settings.student_start_time : settings.staff_start_time;
                if (startTimeStr) {
                    const [startH, startM] = startTimeStr.split(':').map(Number);
                    const startLimit = new Date();
                    startLimit.setHours(startH, startM, 0, 0);
                    startLimit.setMinutes(startLimit.getMinutes() + (settings.grace_period_minutes || 0));
                    if (new Date() > startLimit) checkStatus = 'late';
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
                    if (existing.status === 'absent' || !existing.check_in_time) {
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

                        return { success: true, person, type: 'new', attendance_status: checkStatus, recorded_time: now };
                    }

                    if (person.type === 'employee' && !existing.check_out_time) {
                        // Check if checkout is allowed yet
                        if (settings && settings.staff_end_time) {
                            const [endH, endM] = settings.staff_end_time.split(':').map(Number);
                            const endLimit = new Date();
                            endLimit.setHours(endH, endM, 0, 0);
                            if (new Date() < endLimit) {
                                return { success: false, person, type: 'error_checkout_early' };
                            }
                        }

                        // Check out the employee
                        const { error: outError } = await supabase.from(table)
                            .update({ check_out_time: now })
                            .eq('id', existing.id);
                        if (outError) throw outError;
                        return { success: true, person, type: 'out', attendance_status: checkStatus, recorded_time: now };
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

                return { success: true, person, type: error?.code === '23505' ? 'already' : 'new', attendance_status: checkStatus };
            } else {
                // Offline queuing with check-in/check-out detection
                const queue = await this.getQueue();
                const existing = queue.filter(q => q.person_id === person!.person_id && q.date === today);
                const hasIn = existing.some(q => q.scan_type === 'in');
                const hasOut = existing.some(q => q.scan_type === 'out');

                if (hasOut) {
                    return { success: true, person, type: 'already_out', attendance_status: checkStatus, recorded_time: existing.find(q => q.scan_type === 'out')?.timestamp };
                }

                if (hasIn) {
                    // If it's a student, they usually don't have OUT logic in the queue-first approach
                    if (person.type === 'student') {
                        return { success: true, person, type: 'already', attendance_status: checkStatus, recorded_time: existing.find(q => q.scan_type === 'in')?.timestamp };
                    }

                    // For employees, check-out allowed?
                    if (settings && settings.staff_end_time) {
                        const [endH, endM] = settings.staff_end_time.split(':').map(Number);
                        const endLimit = new Date();
                        endLimit.setHours(endH, endM, 0, 0);
                        if (new Date() < endLimit) {
                            return { success: false, person, type: 'error_checkout_early' };
                        }
                    }

                    // Queue a Check-out
                    const cachedSession = await this.getConfig(KEY_ACTIVE_SESSION);
                    await this.queueScan({
                        rfid_uid: cleanUID,
                        person_id: person.person_id,
                        person_type: person.type,
                        school_id: schoolId,
                        session_id: cachedSession || null,
                        date: today,
                        timestamp: now,
                        scan_type: 'out',
                        class_id: person.class_id,
                        section_id: person.section_id,
                        source: 'rfid-offline',
                        status: checkStatus
                    });
                    return { success: true, person, type: 'out', attendance_status: checkStatus, recorded_time: now };
                }

                // Default: Queue a Check-in
                const cachedSession = await this.getConfig(KEY_ACTIVE_SESSION);
                await this.queueScan({
                    rfid_uid: cleanUID,
                    person_id: person.person_id,
                    person_type: person.type,
                    school_id: schoolId,
                    session_id: cachedSession || null,
                    date: today,
                    timestamp: now,
                    scan_type: 'in',
                    class_id: person.class_id,
                    section_id: person.section_id,
                    source: 'rfid-offline',
                    status: checkStatus
                });
                return { success: true, person, type: 'offline', attendance_status: checkStatus };
            }

        } catch (error) {
            console.error('Failed to mark attendance:', error);
            return { success: false, person: null, type: 'error' };
        }
    }
}

export const rfidOfflineService = new RFIDOfflineService();
export type MarkResultType = 'new' | 'already' | 'error' | 'offline' | 'out' | 'error_checkout_early' | 'already_out' | 'error_inactive' | 'error_manual_only';
