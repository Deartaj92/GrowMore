import { supabase } from '../supabaseClient';

const DB_NAME = 'rfid_attendance_db';
const DB_VERSION = 2;
const STORE_MAPPINGS = 'mappings';
const STORE_QUEUE = 'scan_queue';

export interface RFIDMapping {
    rfid_uid: string;
    person_id: number;
    name: string;
    type: 'student' | 'employee';
    class_name?: string;
    section_name?: string;
    class_id?: number;
    section_id?: number;
    roll_number?: string;
    role?: string;
    picture_url?: string;
}

export interface QueuedScan {
    id?: number;
    rfid_uid: string;
    person_id: number;
    person_type: 'student' | 'employee';
    school_id: string;
    session_id: number | null;
    date: string;
    timestamp: string;
    class_id?: number;
    section_id?: number;
    source: 'rfid-offline';
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
                .select('id, name, rfid_uid, roll_number, picture_url, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                .eq('school_id', schoolId)
                .not('rfid_uid', 'is', null);

            // Fetch staff
            const { data: staff } = await supabase
                .from('staff')
                .select('id, name, rfid_uid, role, picture_url')
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
                    class_name: (s.classes as any)?.name,
                    section_name: (s.sections as any)?.name,
                    class_id: s.class_id,
                    section_id: s.section_id,
                    roll_number: s.roll_number,
                    picture_url: s.picture_url,
                });
            });

            staff?.forEach(s => {
                store.add({
                    rfid_uid: s.rfid_uid,
                    person_id: s.id,
                    name: s.name,
                    type: 'employee',
                    role: s.role,
                    picture_url: s.picture_url,
                });
            });
        } catch (error) {
            console.error('Failed to cache RFID mappings:', error);
        }
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

        for (let i = 0; i < total; i++) {
            const scan = queue[i];
            if (onProgress) onProgress(i + 1, total);

            try {
                const table = scan.person_type === 'student' ? 'attendance_records' : 'staff_attendance_records';
                const payload: any = {
                    school_id: scan.school_id,
                    session_id: scan.session_id,
                    date: scan.date,
                    status: 'present',
                    source: 'rfid',
                    check_in_time: scan.timestamp,
                };

                if (scan.person_type === 'student') {
                    payload.student_id = scan.person_id;
                    if (scan.class_id) payload.class_id = scan.class_id;
                    if (scan.section_id) payload.section_id = scan.section_id;
                } else {
                    payload.staff_id = scan.person_id;
                }

                const { error } = await supabase.from(table).insert(payload);

                // If it's a unique constraint error (duplicate attendance), we count it as "success" for the sake of clearing the queue
                if (!error || error.code === '23505') {
                    if (scan.id) await this.removeFromQueue(scan.id);
                    successCount++;
                } else {
                    failedCount++;
                }
            } catch (error) {
                failedCount++;
            }
        }

        return { success: successCount, failed: failedCount };
    }
}

export const rfidOfflineService = new RFIDOfflineService();
