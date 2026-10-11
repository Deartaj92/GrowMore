export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface StudentAttendanceItem {
  id: number; // student_id
  name: string;
  roll_number: string | null;
  father_name: string | null;
  picture_url: string | null;
  gender: string | null;
  status: AttendanceStatus;
  remarks: string;
  existing_record_id?: number | null;
}

export interface SectionOption {
  id: number; // section_id
  name: string; // section name (e.g. 'B')
  class_id: number;
  class_name: string; // (e.g. '10th')
  is_class_teacher?: boolean;
}

export interface StaffAttendanceLog {
  id: number;
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  source?: string | null;
}
