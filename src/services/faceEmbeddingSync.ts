import { supabase } from '../supabaseClient';
import { float32DescriptorToBytes, parseFaceEmbeddingFromSupabase, FACE_EMBEDDING_DIM } from '../utils/faceEmbeddingBytes';
import { saveFaceEmbeddingCache } from './faceAttendanceLocalCache';

export type SyncedFaceLibraries = {
    students: Map<number, Float32Array>;
    staff: Map<number, Float32Array>;
};

/** Fetch enrolled face vectors from DB and mirror them to IndexedDB for offline matching. */
export async function syncFaceEmbeddingsFromServer(schoolId: number): Promise<SyncedFaceLibraries> {
    const students = new Map<number, Float32Array>();
    const staff = new Map<number, Float32Array>();

    const [stuRes, stfRes] = await Promise.all([
        supabase
            .from('students')
            .select('id, face_embedding')
            .eq('school_id', schoolId)
            .not('face_embedding', 'is', null),
        supabase
            .from('staff')
            .select('id, face_embedding')
            .eq('school_id', schoolId)
            .not('face_embedding', 'is', null),
    ]);

    if (stuRes.error) throw stuRes.error;
    if (stfRes.error) throw stfRes.error;

    const studentRows: { studentId: number; bytes: Uint8Array }[] = [];
    const staffRows: { staffId: number; bytes: Uint8Array }[] = [];

    for (const row of stuRes.data || []) {
        const emb = parseFaceEmbeddingFromSupabase((row as any).face_embedding);
        if (!emb) continue;
        students.set(row.id, emb);
        studentRows.push({
            studentId: row.id,
            bytes: new Uint8Array(emb.buffer, emb.byteOffset, emb.byteLength),
        });
    }

    for (const row of stfRes.data || []) {
        const emb = parseFaceEmbeddingFromSupabase((row as any).face_embedding);
        if (!emb) continue;
        staff.set(row.id, emb);
        staffRows.push({
            staffId: row.id,
            bytes: new Uint8Array(emb.buffer, emb.byteOffset, emb.byteLength),
        });
    }

    await saveFaceEmbeddingCache(schoolId, { students: studentRows, staff: staffRows });
    return { students, staff };
}

export async function saveStudentFaceEmbedding(
    studentId: number,
    schoolId: number,
    descriptor: Float32Array
): Promise<void> {
    const bytes = float32DescriptorToBytes(descriptor);
    const { error } = await supabase
        .from('students')
        .update({
            face_embedding: bytes,
            face_embedding_dim: FACE_EMBEDDING_DIM,
        })
        .eq('id', studentId)
        .eq('school_id', schoolId);
    if (error) throw error;
}

export async function saveStaffFaceEmbedding(
    staffId: number,
    schoolId: number,
    descriptor: Float32Array
): Promise<void> {
    const bytes = float32DescriptorToBytes(descriptor);
    const { error } = await supabase
        .from('staff')
        .update({
            face_embedding: bytes,
            face_embedding_dim: FACE_EMBEDDING_DIM,
        })
        .eq('id', staffId)
        .eq('school_id', schoolId);
    if (error) throw error;
}
