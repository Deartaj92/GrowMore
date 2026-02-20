// Test Record Types - Updated
// Mimicking the examination types structure

export interface TestRecord {
  id: number;
  name: string;
  test_type: 'Quiz' | 'Test' | 'Assignment' | 'Practice';
  subject_id: number;
  class_id: number;
  section_id?: number;
  session_id: number;
  test_date: string;
  max_marks: number;
  passing_marks: number;
  status: 'active' | 'completed' | 'archived';
  school_id: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface TestResult {
  id: number;
  test_id: number;
  student_id: number;
  session_id: number;
  obtained_marks: number;
  max_marks: number;
  percentage: number;
  grade: string;
  remarks?: string;
  school_id: number;
  created_at: string;
  updated_at: string;
}

// DTOs for API operations
export interface CreateTestRecordDTO {
  name: string;
  test_type: 'Quiz' | 'Test' | 'Assignment' | 'Practice';
  subject_id: number;
  class_id: number;
  section_id?: number;
  session_id: number;
  test_date: string;
  max_marks: number;
  passing_marks: number;
}

export interface UpdateTestRecordDTO extends Partial<CreateTestRecordDTO> {
  status?: 'active' | 'completed' | 'archived';
}

export interface CreateTestResultDTO {
  test_id: number;
  student_id: number;
  session_id: number;
  obtained_marks: number;
  max_marks: number;
  remarks?: string;
}

export interface TestRecordFilters {
  search?: string;
  test_type?: string;
  class_id?: number;
  section_id?: number;
  status?: string;
  subject_id?: number;
  session_id?: number;
}

// Response types
export interface TestRecordResponse {
  data: TestRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface TestResultResponse {
  data: TestResult[];
  total: number;
}
