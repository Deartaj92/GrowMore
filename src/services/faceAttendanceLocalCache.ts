import { FACE_EMBEDDING_BYTE_LENGTH } from '../utils/faceEmbeddingBytes';

const DB_NAME = 'growmore_face_attendance';
const DB_VERSION = 2;
const STORE = 'embeddings';

type StudentRow = { studentId: number; bytes: ArrayBuffer; updatedAt: string };
type StaffRow = { staffId: number; bytes: ArrayBuffer; updatedAt: string };

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = ev => {
            const db = req.result;
            if (ev.oldVersion < 2 && db.objectStoreNames.contains(STORE)) {
                db.deleteObjectStore(STORE);
            }
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'key' });
            }
        };
    });
}

export async function saveFaceEmbeddingCache(
    schoolId: number,
    payload: {
        students: { studentId: number; bytes: Uint8Array; updatedAt?: string }[];
        staff: { staffId: number; bytes: Uint8Array; updatedAt?: string }[];
    }
): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const key = `school_${schoolId}`;
    const ts = new Date().toISOString();
    const record = {
        key,
        schoolId,
        studentRows: payload.students.map(r => ({
            studentId: r.studentId,
            bytes: r.bytes.buffer.slice(r.bytes.byteOffset, r.bytes.byteOffset + r.bytes.byteLength),
            updatedAt: r.updatedAt || ts,
        })),
        staffRows: payload.staff.map(r => ({
            staffId: r.staffId,
            bytes: r.bytes.buffer.slice(r.bytes.byteOffset, r.bytes.byteOffset + r.bytes.byteLength),
            updatedAt: r.updatedAt || ts,
        })),
        savedAt: ts,
    };
    store.put(record);
    await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadFaceEmbeddingCache(
    schoolId: number
): Promise<{ students: Map<number, Uint8Array>; staff: Map<number, Uint8Array> }> {
    const students = new Map<number, Uint8Array>();
    const staff = new Map<number, Uint8Array>();
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.get(`school_${schoolId}`);
    const row = await new Promise<any>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    if (!row) return { students, staff };

    for (const r of (row.studentRows || []) as StudentRow[]) {
        if (typeof r.studentId === 'number' && r.bytes?.byteLength === FACE_EMBEDDING_BYTE_LENGTH) {
            students.set(r.studentId, new Uint8Array(r.bytes));
        }
    }
    for (const r of (row.staffRows || []) as StaffRow[]) {
        if (typeof r.staffId === 'number' && r.bytes?.byteLength === FACE_EMBEDDING_BYTE_LENGTH) {
            staff.set(r.staffId, new Uint8Array(r.bytes));
        }
    }
    return { students, staff };
}

export async function clearFaceEmbeddingCache(schoolId: number): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(`school_${schoolId}`);
    await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
