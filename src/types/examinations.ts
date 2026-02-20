// Examination Management System TypeScript Interfaces

export interface Examination {
    id: number;
    name: string;
    exam_type: 'Examination' | 'Monthly Test' | 'Quiz' | 'Mid Term' | 'Final' | 'Custom';
    description?: string;
    start_date: string;
    end_date?: string;
    passing_marks?: number;
    status: 'draft' | 'published' | 'archived';
    session_id: number;
    school_id: number;
    created_by?: number;
    created_at: string;
    updated_at: string;
    // Virtual fields for UI
    session?: {
        name: string;
    };
    created_by_user?: {
        name: string;
    };
}

export interface ExamSubject {
    id: number;
    exam_id: number;
    subject_id: number;
    class_id: number;
    max_marks: number;
    passing_marks: number;
    is_compulsory: boolean;
    school_id: number;
    created_at: string;
    updated_at: string;
    // Virtual fields for UI
    subject?: {
        name: string;
        code: string;
    };
    class?: {
        name: string;
    };
}

export interface ExamResult {
    id: number;
    exam_id: number;
    student_id: number;
    subject_id: number;
    class_id: number;
    section_id: number;
    obtained_marks: number;
    max_marks: number;
    percentage: number;
    grade?: string;
    remarks?: string;
    entered_by?: number;
    entered_at: string;
    school_id: number;
    created_at: string;
    updated_at: string;
    // Virtual fields for UI
    student?: {
        name: string;
        father_name: string;
        picture_url?: string;
    };
    subject?: {
        name: string;
        code: string;
    };
    class?: {
        name: string;
    };
    section?: {
        name: string;
    };
    entered_by_user?: {
        name: string;
    };
}

export interface ExamMasterSheet {
    id: number;
    exam_id: number;
    student_id: number;
    class_id: number;
    section_id: number;
    total_marks: number;
    obtained_marks: number;
    percentage: number;
    grade?: string;
    position: number;
    rank_in_class: number;
    rank_in_section: number;
    status: 'pass' | 'fail' | 'absent';
    attendance_percentage?: number;
    class_teacher_remarks?: string;
    principal_remarks?: string;
    generated_at: string;
    school_id: number;
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
    exam?: {
        name: string;
        exam_type: string;
    };
}

export interface DMCTemplate {
    id: number;
    name: string;
    template_type: 'standard' | 'custom';
    header_html?: string;
    footer_html?: string;
    body_html?: string;
    css_styles?: string;
    is_active: boolean;
    school_id: number;
    created_by?: number;
    created_at: string;
    updated_at: string;
    // Virtual fields for UI
    created_by_user?: {
        name: string;
    };
}

export interface DMCGenerated {
    id: number;
    exam_id: number;
    student_id: number;
    template_id?: number;
    file_path?: string;
    file_size?: number;
    generated_by?: number;
    generated_at: string;
    school_id: number;
    // Virtual fields for UI
    student?: {
        name: string;
        father_name: string;
        picture_url?: string;
    };
    exam?: {
        name: string;
        exam_type: string;
    };
    template?: {
        name: string;
    };
    generated_by_user?: {
        name: string;
    };
}

export interface GradeScale {
    id: number;
    name: string;
    min_marks: number;
    max_marks: number;
    grade: string;
    gpa?: number;
    remarks?: string;
    is_active: boolean;
    school_id: number;
    created_at: string;
    updated_at: string;
}

export interface ExamAnalytics {
    id: number;
    exam_id: number;
    class_id: number;
    section_id?: number;
    total_students: number;
    appeared_students: number;
    passed_students: number;
    failed_students: number;
    average_percentage: number;
    highest_percentage: number;
    lowest_percentage: number;
    pass_percentage: number;
    school_id: number;
    calculated_at: string;
    // Virtual fields for UI
    exam?: {
        name: string;
        exam_type: string;
    };
    class?: {
        name: string;
    };
    section?: {
        name: string;
    };
}

// DTOs for API operations
export interface CreateExaminationDTO {
    name: string;
    exam_type: Examination['exam_type'];
    description?: string;
    start_date: string;
    end_date: string;
    passing_marks?: number;
    session_id: number;
    school_id: number;
    created_by?: number;
}

export interface UpdateExaminationDTO {
    name?: string;
    exam_type?: Examination['exam_type'];
    description?: string;
    start_date?: string;
    end_date?: string;
    passing_marks?: number;
    status?: Examination['status'];
}

export interface CreateExamSubjectDTO {
    exam_id: number;
    subject_id: number;
    class_id: number;
    max_marks: number;
    passing_marks: number;
    is_compulsory: boolean;
    school_id: number;
}

export interface UpdateExamSubjectDTO {
    max_marks?: number;
    passing_marks?: number;
    is_compulsory?: boolean;
}

export interface CreateExamResultDTO {
    exam_id: number;
    student_id: number;
    subject_id: number;
    class_id: number;
    section_id: number;
    obtained_marks: number;
    max_marks: number;
    grade?: string;
    remarks?: string;
    entered_by?: number;
    school_id: number;
}

export interface UpdateExamResultDTO {
    obtained_marks?: number;
    max_marks?: number;
    grade?: string;
    remarks?: string;
}

export interface CreateDMCTemplateDTO {
    name: string;
    template_type: DMCTemplate['template_type'];
    header_html?: string;
    footer_html?: string;
    body_html?: string;
    css_styles?: string;
    is_active: boolean;
    school_id: number;
    created_by?: number;
}

export interface UpdateDMCTemplateDTO {
    name?: string;
    template_type?: DMCTemplate['template_type'];
    header_html?: string;
    footer_html?: string;
    body_html?: string;
    css_styles?: string;
    is_active?: boolean;
}

export interface CreateGradeScaleDTO {
    name: string;
    min_marks: number;
    max_marks: number;
    grade: string;
    gpa?: number;
    remarks?: string;
    is_active: boolean;
    school_id: number;
}

export interface UpdateGradeScaleDTO {
    name?: string;
    min_marks?: number;
    max_marks?: number;
    grade?: string;
    gpa?: number;
    remarks?: string;
    is_active?: boolean;
}

// Filter interfaces
export interface ExaminationFilters {
    exam_type?: Examination['exam_type'];
    status?: Examination['status'];
    session_id?: number;
    class_id?: number;
    start_date?: string;
    end_date?: string;
    search_query?: string;
}

export interface ExamResultFilters {
    exam_id?: number;
    student_id?: number;
    class_id?: number;
    section_id?: number;
    subject_id?: number;
    grade?: string;
    status?: ExamMasterSheet['status'];
    search_query?: string;
}

export interface ExamAnalyticsFilters {
    exam_id?: number;
    class_id?: number;
    section_id?: number;
    start_date?: string;
    end_date?: string;
}

// Bulk operations interfaces
export interface BulkMarksEntryDTO {
    exam_id: number;
    class_id: number;
    section_id?: number;
    subject_id: number;
    marks_data: {
        student_id: number;
        obtained_marks: number;
        remarks?: string;
    }[];
    entered_by?: number;
    school_id: number;
}

export interface MarksImportDTO {
    exam_id: number;
    class_id: number;
    section_id?: number;
    subject_id: number;
    file: File;
    entered_by?: number;
    school_id: number;
}

export interface DMCGenerationDTO {
    exam_id: number;
    student_ids?: number[];
    class_id?: number;
    section_id?: number;
    template_id?: number;
    generated_by?: number;
    school_id: number;
}

// Analytics interfaces
export interface PerformanceAnalytics {
    top_performers: {
        student_id: number;
        student_name: string;
        percentage: number;
        grade: string;
        position: number;
    }[];
    subject_wise_performance: {
        subject_id: number;
        subject_name: string;
        average_percentage: number;
        pass_percentage: number;
        total_students: number;
    }[];
    class_performance: {
        class_id: number;
        class_name: string;
        average_percentage: number;
        pass_percentage: number;
        total_students: number;
    }[];
    pass_fail_ratio: {
        total_students: number;
        passed_students: number;
        failed_students: number;
        pass_percentage: number;
    };
}

export interface ExamStatistics {
    exam_id: number;
    exam_name: string;
    total_students: number;
    appeared_students: number;
    passed_students: number;
    failed_students: number;
    average_percentage: number;
    highest_percentage: number;
    lowest_percentage: number;
    pass_percentage: number;
    grade_distribution: {
        grade: string;
        count: number;
        percentage: number;
    }[];
}

// Export interfaces
export interface ExportOptions {
    format: 'pdf' | 'excel' | 'csv';
    include_remarks?: boolean;
    include_analytics?: boolean;
    template_id?: number;
}

export interface MasterSheetExportDTO {
    exam_id: number;
    class_id: number;
    section_id?: number;
    export_options: ExportOptions;
}

export interface DMCExportDTO {
    exam_id: number;
    student_ids: number[];
    template_id?: number;
    export_options: ExportOptions;
}

