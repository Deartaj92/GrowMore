export interface TestRecordItem {
  id: number;
  name: string;
  test_type: string;
  subject_id: number;
  class_id: number;
  section_id?: number | null;
  session_id: number;
  test_date: string;
  max_marks: number;
  passing_marks: number;
  status: string;
  school_id: number;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  // Resolved names
  subject_name?: string;
  class_name?: string;
  section_name?: string;
  is_my_test?: boolean;
  // Computed stats
  total_results?: number;
  avg_percentage?: number;
  highest_marks?: number;
  lowest_marks?: number;
  pass_count?: number;
  fail_count?: number;
}

export interface StudentTestResultRow {
  student_id: number;
  student_name: string;
  roll_number: string | null;
  father_name: string | null;
  picture_url: string | null;
  gender: string | null;
  // Result fields
  result_id?: number | null;
  obtained_marks: number | '' | null;
  max_marks: number;
  percentage: number;
  grade: string;
  remarks: string;
  is_absent: boolean;
  is_passed: boolean;
  is_selected?: boolean;
}

export interface NewTestPayload {
  name: string;
  test_type: string;
  class_id: number;
  section_id: number;
  subject_id: number;
  test_date: string;
  max_marks: number;
  passing_marks: number;
}
