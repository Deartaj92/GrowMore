// Homework Diary Types

export interface HomeworkDiary {
  id: number;
  class_id: number;
  section_id?: number | null;
  session_id: number;
  subject_id?: number | null;
  homework_date: string; // ISO date string
  homework_text: string;
  assigned_by?: number | null;
  school_id: number;
  created_at: string;
  updated_at: string;
  // Enriched fields (from joins)
  class_name?: string;
  section_name?: string;
  subject_name?: string;
  session_name?: string;
  assigned_by_name?: string;
  assigned_by_gender?: string;
}

// DTOs for API operations
export interface CreateHomeworkDiaryDTO {
  class_id: number;
  section_id?: number | null;
  session_id: number;
  subject_id?: number | null;
  homework_date: string;
  homework_text: string;
}

export interface UpdateHomeworkDiaryDTO extends Partial<CreateHomeworkDiaryDTO> {
  id: number;
}

export interface HomeworkDiaryFilters {
  class_id?: number;
  section_id?: number;
  session_id?: number;
  subject_id?: number;
  homework_date?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

// Response types
export interface HomeworkDiaryResponse {
  data: HomeworkDiary[];
  total: number;
  page: number;
  limit: number;
}

// Bulk assignment DTO for assigning homework to multiple subjects at once
export interface BulkHomeworkAssignmentDTO {
  class_id: number;
  section_id?: number | null;
  session_id: number;
  homework_date: string;
  assignments: Array<{
    subject_id?: number | null;
    homework_text: string;
  }>;
}

