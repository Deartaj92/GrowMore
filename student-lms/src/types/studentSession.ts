export interface StudentSession {
  id: number;
  name: string;
  roll_number: string | null;
  father_name: string | null;
  school_id: number;
  class_id: number | null;
  section_id: number | null;
  class_name: string | null;
  section_name: string | null;
  photo_url?: string | null;
  isStudent: boolean;
}
