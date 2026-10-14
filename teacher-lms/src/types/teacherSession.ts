export interface TeacherSession {
  id: number; // staff.id
  user_id?: number; // users.id if linked
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  role: string;
  employee_id?: string | null;
  school_id: number;
  school_name?: string;
  qualification?: string | null;
  gender?: string | null;
  photo_url?: string | null;
  joining_date?: string | null;
  is_demo?: boolean;
}

export interface TeacherClassSubject {
  id: number;
  class_id: number;
  class_name: string;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_name: string;
  total_students?: number;
  is_class_teacher?: boolean;
}

export interface TeacherPeriod {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  room?: string;
  room_number?: string;
  is_current?: boolean;
  is_completed?: boolean;
}

export interface TeacherDashboardStats {
  classes_today_count: number;
  total_students: number;
  attendance_compliance_rate: number;
  homework_pending_review: number;
  performance_score: number;
  active_session_name: string;
}

export interface TeacherAnnouncement {
  id: number;
  title: string;
  content: string;
  date: string;
  priority: 'normal' | 'important' | 'urgent';
  target_audience?: string;
}

export interface TeacherHomeworkItem {
  id: number;
  class_name: string;
  section_name: string;
  subject_name: string;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  submission_count: number;
  total_count: number;
}
