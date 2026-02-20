// User type definition
export interface User {
    id?: number;
    username: string;
    school_id?: number;
}

export interface Student {
    id: number;
    name: string;
    father_name: string;
    picture_url?: string;
    class?: {
        name: string;
    };
    section?: {
        name: string;
    };
}

export interface Staff {
    id: number;
    name: string;
    role: string;
    picture_url?: string;
}

export interface ReportCategory {
    id: number;
    name: string;
    type: 'student' | 'staff';
}

export type ReportSeverity = 'low' | 'medium' | 'high' | 'urgent';
export type ReportStatus = 'pending' | 'in_review' | 'resolved' | 'dismissed';

export interface ReportUpdate {
    id: number;
    report_id: number;
    updated_by: number;
    previous_status: ReportStatus;
    new_status: ReportStatus;
    update_note: string;
    created_at: string;
    staff: Staff;  // Staff who made the update
}

export interface Report {
    id: number;
    category_id: number;
    category?: ReportCategory;
    reported_by: number;
    reporter?: Staff;  // Staff who reported
    student_id?: number;
    staff_id?: number;
    student?: {
        id: number;
        name: string;
        father_name?: string;
        picture_url?: string;
        class?: {
            id: number;
            name: string;
        };
        section?: {
            id: number;
            name: string;
        };
    };
    staff?: Staff;
    subject_type: 'student' | 'staff';
    description: string;
    severity: ReportSeverity;
    status: ReportStatus;
    created_at: string;
    updated_at: string;
    updates?: ReportUpdate[];
}

export type ReportAction = {
    id: number;
    report_id: number;
    action_taken: string;
    taken_by: number;
    taken_by_user?: User;
    created_at: string;
};

export interface CreateReportDTO {
    category_id: number;
    description: string;
    severity: ReportSeverity;
    created_at: string;
    subject_type: 'student' | 'staff';
    student_id?: number;
    staff_id?: number;
}

export type UpdateReportDTO = Partial<CreateReportDTO>;

export type CreateReportActionDTO = Omit<ReportAction, 'id' | 'created_at' | 'taken_by_user'>; 