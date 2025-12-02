import { supabase } from '../supabaseClient';
import {
    Report,
    ReportAction,
    ReportCategory,
    CreateReportDTO,
    UpdateReportDTO,
    CreateReportActionDTO,
    ReportStatus,
    ReportUpdate,
    ReportSeverity
} from '../types/reports';
import { useAuth } from '../contexts/AuthContext';
import { getUser } from './auth';
import { sortClasses } from './classUtils';

export const reportService = {
    // Categories
    async getCategories(type?: string, schoolId?: number): Promise<ReportCategory[]> {
        let query = supabase
            .from('report_categories')
            .select('*');
        
        if (type) {
            query = query.eq('type', type);
        }
        
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // If no categories found for the specific school_id, try to get default categories (school_id = 1)
        if ((!data || data.length === 0) && schoolId && schoolId !== 1) {
            let fallbackQuery = supabase
                .from('report_categories')
                .select('*')
                .eq('school_id', 1);
            
            if (type) {
                fallbackQuery = fallbackQuery.eq('type', type);
            }
            
            const { data: fallbackData, error: fallbackError } = await fallbackQuery;
            
            if (fallbackError) {
                return [];
            }
            
            return fallbackData || [];
        }

        return data || [];
    },

    // Helper function to get ordinal suffix
    getOrdinalSuffix(num: number): string {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return num + "st";
        if (j === 2 && k !== 12) return num + "nd";
        if (j === 3 && k !== 13) return num + "rd";
        return num + "th";
    },

    // Helper function to extract number from class name
    extractNumber(className: string): number {
        const match = className.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    },

    async getActiveSession(schoolId?: number) {
        let query = supabase
            .from('sessions')
            .select('id')
            .eq('is_active', true);
        
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        // Use limit(1) to safely handle cases with multiple active sessions
        const { data, error } = await query.limit(1).single();

        if (error) {
            return null;
        }
        return data;
    },

    // Classes
    async getClasses(schoolId?: number): Promise<any[]> {
        try {
            // 1. Get active session
            const activeSession = await this.getActiveSession(schoolId);
            if (!activeSession) return [];

            // 2. Get classes that have students in student_class_history for active session
            const { data, error } = await supabase
                .from('student_class_history')
                .select(`
                    new_class_id,
                    adm_class_id,
                    new_classes:new_class_id (
                        id,
                        name,
                        has_sections
                    ),
                    adm_classes:adm_class_id (
                        id,
                        name,
                        has_sections
                    )
                `)
                .eq('session_id', activeSession.id)
                .eq('status', 'active');

            if (error) {
                return [];
            }

            // 3. Extract unique classes and remove nulls
            // Use new_class_id classes first, fallback to adm_class_id classes
            const uniqueClasses = Array.from(
                new Set(data?.map(item => {
                    const classObj = item.new_classes || item.adm_classes;
                    return JSON.stringify(classObj);
                }))
            )
                .map(str => JSON.parse(str))
                .filter(Boolean);

            // 4. Sort classes using universal sorting function
            return sortClasses(uniqueClasses).map(cls => {
                // Format class names with proper ordinal suffixes
                const num = this.extractNumber(cls.name);
                if (num) {
                    cls.name = this.getOrdinalSuffix(num);
                }
                return cls;
            });
        } catch (error) {
            return [];
        }
    },

    // Sections for a class
    async getSections(classId: number, schoolId?: number): Promise<any[]> {
        try {
            // 1. Get active session
            const activeSession = await this.getActiveSession(schoolId);
            if (!activeSession) return [];

            // 2. Get sections that have students in student_class_history for active session and specific class
            const { data, error } = await supabase
                .from('student_class_history')
                .select(`
                    new_section_id,
                    adm_section_id,
                    new_sections:new_section_id (
                        id,
                        name,
                        class_id
                    ),
                    adm_sections:adm_section_id (
                        id,
                        name,
                        class_id
                    )
                `)
                .eq('session_id', activeSession.id)
            .eq('new_class_id', classId)
                .eq('status', 'active');
            
            if (error) {
                return [];
            }

            // 3. Extract unique sections and remove nulls
            // Use new_section_id sections first, fallback to adm_section_id sections
            const uniqueSections = Array.from(
                new Set(data?.map(item => {
                    const sectionObj = item.new_sections || item.adm_sections;
                    return JSON.stringify(sectionObj);
                }))
            )
                .map(str => JSON.parse(str))
                .filter(Boolean);

            // 4. Sort sections alphabetically
            return uniqueSections.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            return [];
        }
    },

    // Students in a section (or class if no sections)
    async getStudents(classId: number, sectionId: number | null, schoolId?: number): Promise<any[]> {
        // First get active session
        const activeSession = await this.getActiveSession(schoolId);
        if (!activeSession) return [];

        // Build query - if sectionId is null, don't filter by section
        let query = supabase
            .from('student_class_history')
            .select(`
                student_id,
                new_class_id,
                new_section_id,
                adm_class_id,
                adm_section_id
            `)
            .eq('session_id', activeSession.id)
            .eq('new_class_id', classId)
            .eq('status', 'active');
        
        // Only filter by section if sectionId is provided
        if (sectionId !== null && sectionId !== undefined) {
            query = query.eq('new_section_id', sectionId);
        } else {
            // For non-sectioned classes, filter out records with section_id
            query = query.is('new_section_id', null);
        }
        
        const { data, error } = await query;

        if (error) {
            return [];
        }

        if (!data || data.length === 0) return [];

        // Fetch student data separately since we can't use automatic joins with composite keys
        const studentIds = Array.from(new Set(data.map(item => item.student_id)));
        const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select(`
                id,
                name,
                father_name,
                picture_url,
                roll_number
            `)
            .eq('school_id', schoolId)
            .in('id', studentIds);

        if (studentsError) {
            return [];
        }

        // Create a map of student data by ID
        const studentsMap = new Map(studentsData?.map(student => [student.id, student]) || []);

        // Transform the data to match expected format
        return data
            .map(item => {
                const student = studentsMap.get(item.student_id);
                if (!student) return null;
                
                return {
                    ...student,
                    class_id: item.new_class_id || item.adm_class_id, // Current class (fallback to admission)
                    section_id: item.new_section_id !== null ? item.new_section_id : (item.adm_section_id !== null ? item.adm_section_id : null) // Current section
                };
            })
            .filter(Boolean);
    },

    // Staff members
    async getStaff(schoolId?: number): Promise<any[]> {
        let query = supabase
            .from('staff')
            .select(`
                id,
                name,
                role,
                father_name,
                mobile
            `)
            .order('name');
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    // Student Reports
    async getStudentReports(filters?: { category_id?: string; status?: string; subject_type?: string }, schoolId?: number): Promise<Report[]> {
        let query = supabase
            .from('student_reports')
            .select(`
                *,
                category:report_categories(*),
                reporter:staff!student_reports_reported_by_fkey(*),
                student:students(
                    id,
                    name,
                    father_name,
                    picture_url,
                    class:classes(id, name),
                    section:sections(id, name)
                ),
                updates:student_reports_updates(
                    *,
                    staff:staff!student_reports_updates_updated_by_fkey(*)
                )
            `)
            .order('created_at', { ascending: false });

        if (filters?.category_id) {
            query = query.eq('category_id', filters.category_id);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        const { data, error } = await query;

        if (error) throw error;
        // Transform to match Report interface
        return (data || []).map((report: any) => ({
            ...report,
            subject_type: 'student' as const,
            staff_id: undefined
        }));
    },

    // Employee Reports
    async getEmployeeReports(filters?: { category_id?: string; status?: string; subject_type?: string }, schoolId?: number): Promise<Report[]> {
        let query = supabase
            .from('employee_reports')
            .select(`
                *,
                category:report_categories(*),
                reporter:staff!employee_reports_reported_by_fkey(*),
                staff:staff!employee_reports_staff_id_fkey(*),
                updates:employee_reports_updates(
                    *,
                    staff:staff!employee_reports_updates_updated_by_fkey(*)
                )
            `)
            .order('created_at', { ascending: false });

        if (filters?.category_id) {
            query = query.eq('category_id', filters.category_id);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        const { data, error } = await query;

        if (error) throw error;
        // Transform to match Report interface
        return (data || []).map((report: any) => ({
            ...report,
            subject_type: 'staff' as const,
            student_id: undefined
        }));
    },

    // Legacy method - kept for backward compatibility, but should use getStudentReports or getEmployeeReports
    async getReports(filters?: { category_id?: string; status?: string; subject_type?: string }, schoolId?: number): Promise<Report[]> {
        // If subject_type is specified, use the appropriate method
        if (filters?.subject_type === 'student') {
            return this.getStudentReports(filters, schoolId);
        } else if (filters?.subject_type === 'staff') {
            return this.getEmployeeReports(filters, schoolId);
        }
        
        // Default to student reports for backward compatibility
        return this.getStudentReports(filters, schoolId);
    },

    async getReportById(id: string, schoolId?: number): Promise<Report> {
        // First, fetch the basic report data
        let query = supabase
            .from('reports')
            .select('*')
            .eq('id', id);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { data: reportData, error: reportError } = await query.single();
        
        if (reportError) throw reportError;
        if (!reportData) throw new Error('Report not found');
        
        // Fetch related data separately to avoid foreign key constraint issues
        const [categoryResult, reporterResult, studentResult, staffResult, updatesResult] = await Promise.all([
            // Category
            supabase
                .from('report_categories')
                .select('*')
                .eq('id', reportData.category_id)
                .single(),
            // Reporter
            reportData.reported_by ? supabase
                .from('staff')
                .select('id, name, role')
                .eq('id', reportData.reported_by)
                .single() : Promise.resolve({ data: null, error: null }),
            // Student (if student report)
            reportData.student_id ? supabase
                .from('students')
                .select(`
                    id,
                    name,
                    father_name,
                    picture_url,
                    class:classes(id, name),
                    section:sections(id, name)
                `)
                .eq('id', reportData.student_id)
                .single() : Promise.resolve({ data: null, error: null }),
            // Staff (if staff report)
            reportData.staff_id ? supabase
                .from('staff')
                .select('id, name, role, picture_url')
                .eq('id', reportData.staff_id)
                .single() : Promise.resolve({ data: null, error: null }),
            // Updates
            supabase
                .from('reports_updates')
                .select('*')
                .eq('report_id', reportData.id)
                .order('created_at', { ascending: false })
        ]);
        
        // Fetch staff details for each update
        let updates = updatesResult.data || [];
        if (updates.length > 0) {
            const updatesWithStaff = await Promise.all(
                updates.map(async (update: any) => {
                    if (update.updated_by) {
                        const { data: staffData } = await supabase
                            .from('staff')
                            .select('id, name, role')
                            .eq('id', update.updated_by)
                            .single();
                        update.staff = staffData;
                    }
                    return update;
                })
            );
            updates = updatesWithStaff;
        }
        
        // Combine all data
        const report = {
            ...reportData,
            category: categoryResult.data,
            reporter: reporterResult.data,
            student: studentResult.data,
            staff: staffResult.data,
            updates: updates,
            subject_id: reportData.subject_type === 'student' ? reportData.student_id : reportData.staff_id,
            subject: reportData.subject_type === 'student' ? studentResult.data : staffResult.data
        };
        
        return report as Report;
    },

    async createStudentReport(reportData: CreateReportDTO, schoolId?: number): Promise<Report> {
        // Get the current user from localStorage
        const user = getUser();
        if (!user) throw new Error('No authenticated user found');
        if (!user.staff_id) throw new Error('No staff ID found for current user');

        if (!reportData.student_id) {
            throw new Error('Student ID is required for student reports');
        }

        const insertData: any = {
            category_id: reportData.category_id,
            student_id: reportData.student_id,
            reported_by: user.staff_id,
            description: reportData.description,
            severity: reportData.severity,
            status: 'pending'
        };
        
        if (schoolId) {
            insertData.school_id = schoolId;
        }

        const { data, error } = await supabase
            .from('student_reports')
            .insert(insertData)
            .select(`
                *,
                category:report_categories(*),
                reporter:staff!student_reports_reported_by_fkey(*),
                student:students(
                    id,
                    name,
                    father_name,
                    picture_url,
                    class:classes(id, name),
                    section:sections(id, name)
                )
            `)
            .single();

        if (error) throw error;
        return {
            ...data,
            subject_type: 'student' as const,
            staff_id: undefined
        };
    },

    async createEmployeeReport(reportData: CreateReportDTO, schoolId?: number): Promise<Report> {
        // Get the current user from localStorage
        const user = getUser();
        if (!user) throw new Error('No authenticated user found');
        if (!user.staff_id) throw new Error('No staff ID found for current user');

        if (!reportData.staff_id) {
            throw new Error('Staff ID is required for employee reports');
        }

        const insertData: any = {
            category_id: reportData.category_id,
            staff_id: reportData.staff_id,
            reported_by: user.staff_id,
            description: reportData.description,
            severity: reportData.severity,
            status: 'pending'
        };
        
        if (schoolId) {
            insertData.school_id = schoolId;
        }

        const { data, error } = await supabase
            .from('employee_reports')
            .insert(insertData)
            .select(`
                *,
                category:report_categories(*),
                reporter:staff!employee_reports_reported_by_fkey(*),
                staff:staff!employee_reports_staff_id_fkey(*)
            `)
            .single();

        if (error) throw error;
        return {
            ...data,
            subject_type: 'staff' as const,
            student_id: undefined
        };
    },

    // Legacy method - kept for backward compatibility
    async createReport(reportData: CreateReportDTO, schoolId?: number): Promise<Report> {
        if (reportData.subject_type === 'student') {
            return this.createStudentReport(reportData, schoolId);
        } else if (reportData.subject_type === 'staff') {
            return this.createEmployeeReport(reportData, schoolId);
        }
        // Default to student report
        return this.createStudentReport(reportData, schoolId);
    },

    async deleteStudentReport(reportId: number, schoolId?: number): Promise<void> {
        let query = supabase
            .from('student_reports')
            .delete()
            .eq('id', reportId);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { error } = await query;

        if (error) throw error;
    },

    async deleteEmployeeReport(reportId: number, schoolId?: number): Promise<void> {
        let query = supabase
            .from('employee_reports')
            .delete()
            .eq('id', reportId);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { error } = await query;

        if (error) throw error;
    },

    // Legacy method - kept for backward compatibility
    async deleteReport(reportId: number, schoolId?: number, subjectType?: 'student' | 'staff'): Promise<void> {
        if (subjectType === 'staff') {
            return this.deleteEmployeeReport(reportId, schoolId);
        }
        // Default to student report
        return this.deleteStudentReport(reportId, schoolId);
    },

    async updateStudentReport(
        reportId: string, 
        updateData: { status?: ReportStatus; update_note?: string },
        schoolId?: number
    ): Promise<void> {
        // Get the current user from localStorage
        const user = getUser();
        if (!user) throw new Error('No authenticated user found');
        if (!user.staff_id) throw new Error('No staff ID found for current user');

        let reportQuery = supabase
            .from('student_reports')
            .select('status')
            .eq('id', reportId);
            
        if (schoolId) {
            reportQuery = reportQuery.eq('school_id', schoolId);
        }
        
        const { data: report } = await reportQuery.single();

        if (!report) throw new Error('Report not found');

        const previousStatus = report.status;
        const newStatus = updateData.status || report.status;

        // Update the report status
        let updateQuery = supabase
            .from('student_reports')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', reportId);
            
        if (schoolId) {
            updateQuery = updateQuery.eq('school_id', schoolId);
        }
        
        const { error: updateError } = await updateQuery;
        if (updateError) throw updateError;

        // Create update record if status changed or update_note provided
        if ((previousStatus !== newStatus || updateData.update_note) && updateData.update_note) {
            const updateInsert: any = {
                report_id: parseInt(reportId),
                updated_by: user.staff_id,
                previous_status: previousStatus,
                new_status: newStatus,
                update_note: updateData.update_note || ''
            };
            
            if (schoolId) {
                updateInsert.school_id = schoolId;
            }

            const { error: insertError } = await supabase
                .from('student_reports_updates')
                .insert(updateInsert);

            if (insertError) throw insertError;
        }
    },

    async updateEmployeeReport(
        reportId: string, 
        updateData: { status?: ReportStatus; update_note?: string },
        schoolId?: number
    ): Promise<void> {
        // Get the current user from localStorage
        const user = getUser();
        if (!user) throw new Error('No authenticated user found');
        if (!user.staff_id) throw new Error('No staff ID found for current user');

        let reportQuery = supabase
            .from('employee_reports')
            .select('status')
            .eq('id', reportId);
            
        if (schoolId) {
            reportQuery = reportQuery.eq('school_id', schoolId);
        }
        
        const { data: report } = await reportQuery.single();

        if (!report) throw new Error('Report not found');

        const previousStatus = report.status;
        const newStatus = updateData.status || report.status;

        // Update the report status
        let updateQuery = supabase
            .from('employee_reports')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', reportId);
            
        if (schoolId) {
            updateQuery = updateQuery.eq('school_id', schoolId);
        }
        
        const { error: updateError } = await updateQuery;
        if (updateError) throw updateError;

        // Create update record if status changed or update_note provided
        if ((previousStatus !== newStatus || updateData.update_note) && updateData.update_note) {
            const updateInsert: any = {
                report_id: parseInt(reportId),
                updated_by: user.staff_id,
                previous_status: previousStatus,
                new_status: newStatus,
                update_note: updateData.update_note || ''
            };
            
            if (schoolId) {
                updateInsert.school_id = schoolId;
            }

            const { error: insertError } = await supabase
                .from('employee_reports_updates')
                .insert(updateInsert);

            if (insertError) throw insertError;
        }
    },

    // Legacy method - kept for backward compatibility
    async updateReport(
        reportId: string, 
        updateData: { status?: ReportStatus; update_note?: string },
        schoolId?: number,
        subjectType?: 'student' | 'staff'
    ): Promise<void> {
        if (subjectType === 'staff') {
            return this.updateEmployeeReport(reportId, updateData, schoolId);
        }
        // Default to student report
        return this.updateStudentReport(reportId, updateData, schoolId);
    },

    // Report Actions
    async addReportAction(action: CreateReportActionDTO, schoolId?: number): Promise<ReportAction> {
        const insertData: any = { ...action };
        if (schoolId) {
            insertData.school_id = schoolId;
        }
        
        const { data, error } = await supabase
            .from('report_actions')
            .insert(insertData)
            .select(`
                *,
                taken_by_user:taken_by(id, username, name, role)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async getReportActions(reportId: string, schoolId?: number): Promise<ReportAction[]> {
        let query = supabase
            .from('report_actions')
            .select(`
                *,
                taken_by_user:taken_by(id, username, name, role)
            `)
            .eq('report_id', reportId)
            .order('created_at', { ascending: false });
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    updateStudentReportDetails: async (reportId: string, data: { 
        severity: ReportSeverity; 
        description: string; 
        created_at: string 
    }, schoolId?: number) => {
        // Note: This function only updates severity, description, and created_at.
        // The reported_by field is intentionally NOT updated to preserve the original creator.
        let query = supabase
            .from('student_reports')
            .update({
                severity: data.severity,
                description: data.description,
                created_at: data.created_at
            })
            .eq('id', reportId);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const response = await query;

        if (response.error) {
            throw new Error(response.error.message);
        }

        return response.data;
    },

    updateEmployeeReportDetails: async (reportId: string, data: { 
        severity: ReportSeverity; 
        description: string; 
        created_at: string 
    }, schoolId?: number) => {
        // Note: This function only updates severity, description, and created_at.
        // The reported_by field is intentionally NOT updated to preserve the original creator.
        let query = supabase
            .from('employee_reports')
            .update({
                severity: data.severity,
                description: data.description,
                created_at: data.created_at
            })
            .eq('id', reportId);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const response = await query;

        if (response.error) {
            throw new Error(response.error.message);
        }

        return response.data;
    },

    // Legacy method - kept for backward compatibility
    async updateReportDetails(reportId: string, data: { 
        severity: ReportSeverity; 
        description: string; 
        created_at: string 
    }, schoolId?: number, subjectType?: 'student' | 'staff') {
        if (subjectType === 'staff') {
            return await reportService.updateEmployeeReportDetails(reportId, data, schoolId);
        }
        // Default to student report
        return await reportService.updateStudentReportDetails(reportId, data, schoolId);
    },

    // Update an existing student report update's note
    async updateStudentReportUpdate(
        updateId: string,
        updateNote: string,
        schoolId?: number
    ): Promise<void> {
        let query = supabase
            .from('student_reports_updates')
            .update({
                update_note: updateNote
            })
            .eq('id', updateId);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { error } = await query;
        
        if (error) throw error;
    },

    // Update an existing employee report update's note
    async updateEmployeeReportUpdate(
        updateId: string,
        updateNote: string,
        schoolId?: number
    ): Promise<void> {
        let query = supabase
            .from('employee_reports_updates')
            .update({
                update_note: updateNote
            })
            .eq('id', updateId);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { error } = await query;
        
        if (error) throw error;
    },

    // Legacy method - kept for backward compatibility
    async updateReportUpdate(
        updateId: string,
        updateNote: string,
        schoolId?: number,
        subjectType?: 'student' | 'staff'
    ): Promise<void> {
        if (subjectType === 'staff') {
            return this.updateEmployeeReportUpdate(updateId, updateNote, schoolId);
        }
        // Default to student report
        return this.updateStudentReportUpdate(updateId, updateNote, schoolId);
    }
}; 