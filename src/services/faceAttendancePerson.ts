import type { RFIDMapping } from './rfidOfflineService';
import { supabase } from '../supabaseClient';

export function studentRowToRfidMapping(student: any): RFIDMapping {
    const card = String(student.qr_uid || student.rfid_uid || '').trim();
    return {
        rfid_uid: card,
        person_id: student.id,
        name: student.name,
        type: 'student',
        attendance_mode: student.attendance_mode,
        picture_url: student.picture_url,
        father_name: student.father_name,
        roll_number: student.roll_number,
        class_name: student.classes?.name,
        section_name: student.sections?.name,
        class_id: student.class_id,
        section_id: student.section_id,
        status: student.status || 'active',
    };
}

export async function fetchStudentForFaceMark(studentId: number, schoolId: number): Promise<RFIDMapping | null> {
    const { data, error } = await supabase
        .from('students')
        .select(
            'id,name,father_name,roll_number,picture_url,status,attendance_mode,class_id,section_id,rfid_uid,qr_uid,classes:class_id(name),sections:section_id(name)'
        )
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .maybeSingle();
    if (error || !data) return null;
    return studentRowToRfidMapping(data);
}

export function staffRowToRfidMapping(row: any): RFIDMapping {
    const card = String(row.qr_uid || row.rfid_uid || '').trim();
    return {
        rfid_uid: card,
        person_id: row.id,
        name: row.name,
        type: 'employee',
        attendance_mode: row.attendance_mode,
        picture_url: row.picture_url,
        role: row.role,
        status: row.status || 'active',
    };
}

export async function fetchStaffForFaceMark(staffId: number, schoolId: number): Promise<RFIDMapping | null> {
    const { data, error } = await supabase
        .from('staff')
        .select('id,name,rfid_uid,qr_uid,attendance_mode,role,status,picture_url')
        .eq('id', staffId)
        .eq('school_id', schoolId)
        .maybeSingle();
    if (error || !data) return null;
    return staffRowToRfidMapping(data);
}
