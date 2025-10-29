export interface Subject {
    id: number;
    name: string;
    code: string;
    class_id: number;
    created_at: string;
    updated_at: string;
}

export interface GradeScale {
    id: number;
    grade: string;
    min_marks: number;
    max_marks: number;
    gpa: number;
    remarks: string;
    created_at: string;
}

export interface ReportCard {
    id: number;
    student_id: number;
    class_id: number;
    section_id: number;
    session_id: number;
    term: string;
    total_marks: number;
    obtained_marks: number;
    percentage: number;
    grade: string;
    position: number;
    attendance_percentage: number;
    class_teacher_remarks: string;
    principal_remarks: string;
    issue_date: string;
    status: 'draft' | 'published' | 'archived';
    created_at: string;
    updated_at: string;
    // Virtual fields for UI
    student?: {
        name: string;
        father_name: string;
        picture_url?: string;
    };
    class?: {
        name: string;
    };
    section?: {
        name: string;
    };
    session?: {
        name: string;
    };
}

export interface ReportCardDetail {
    id: number;
    report_card_id: number;
    subject_id: number;
    total_marks: number;
    obtained_marks: number;
    grade: string;
    teacher_remarks: string;
    created_at: string;
    updated_at: string;
    subject?: Subject;
}

export interface CreateReportCardDTO {
    student_id: number;
    class_id: number;
    section_id: number;
    session_id: number;
    term: string;
    attendance_percentage?: number;
    class_teacher_remarks?: string;
    principal_remarks?: string;
    issue_date?: string;
}

export interface UpdateReportCardDTO extends Partial<CreateReportCardDTO> {
    status?: 'draft' | 'published' | 'archived';
}

export interface CreateReportCardDetailDTO {
    report_card_id: number;
    subject_id: number;
    total_marks: number;
    obtained_marks: number;
    teacher_remarks?: string;
}

export interface UpdateReportCardDetailDTO extends Partial<CreateReportCardDetailDTO> {} 