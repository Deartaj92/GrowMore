import type { SupabaseClient } from '@supabase/supabase-js';

type ClassHistoryEntry = {
    id: number;
    student_id: number;
    session_id: number | null;
    new_class_id: number | null;
    new_section_id: number | null;
};

/**
 * Aligns student class/section/session with the latest row in student_class_history
 * for the selected session (same approach as StudentList).
 */
export async function mergeStudentsWithSessionClassHistory<
    T extends { id: number; class_id?: number | null; section_id?: number | null; session_id?: number | null },
>(supabase: SupabaseClient, schoolId: number, sessionIdStr: string, students: T[]): Promise<T[]> {
    if (!sessionIdStr || students.length === 0) {
        return students;
    }

    const sessionId = Number(sessionIdStr);
    if (!Number.isFinite(sessionId)) {
        return students;
    }

    const studentIds = students.map(s => s.id);
    const { data: historyData } = await supabase
        .from('student_class_history')
        .select('id, student_id, session_id, new_class_id, new_section_id')
        .in('student_id', studentIds)
        .eq('school_id', schoolId)
        .eq('session_id', sessionId)
        .order('id', { ascending: true });

    const currentClassMap = new Map<
        number,
        { class_id: number | null; section_id: number | null; session_id: number | null }
    >();

    if (historyData?.length) {
        const rows = historyData as ClassHistoryEntry[];
        const studentRecordsMap = new Map<number, ClassHistoryEntry[]>();
        rows.forEach(entry => {
            const sid = entry.student_id;
            if (!studentRecordsMap.has(sid)) {
                studentRecordsMap.set(sid, []);
            }
            studentRecordsMap.get(sid)!.push(entry);
        });
        studentRecordsMap.forEach((records, studentId) => {
            if (records.length > 0) {
                const last = records[records.length - 1];
                currentClassMap.set(studentId, {
                    class_id: last.new_class_id ?? null,
                    section_id: last.new_section_id ?? null,
                    session_id: last.session_id ?? null,
                });
            }
        });
    }

    return students.map(student => {
        const cur = currentClassMap.get(student.id);
        return {
            ...student,
            class_id: cur?.class_id ?? student.class_id ?? null,
            section_id: cur?.section_id ?? student.section_id ?? null,
            session_id: cur?.session_id ?? student.session_id ?? null,
        } as T;
    });
}
