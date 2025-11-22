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
                picture_url
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

    // Reports
    async getReports(filters?: { category_id?: string; status?: string }, schoolId?: number): Promise<Report[]> {
        let query = supabase
            .from('reports')
            .select(`
                *,
                category:report_categories(*),
                reporter:staff!reports_reported_by_fkey(*),
                student:students(
                    id,
                    name,
                    father_name,
                    picture_url,
                    class:classes(id, name),
                    section:sections(id, name)
                ),
                staff:staff!reports_staff_id_fkey(*),
                updates:reports_updates(
                    *,
                    staff:staff!reports_updates_updated_by_fkey(*)
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
        return data || [];
    },

    async getReportById(id: string, schoolId?: number): Promise<Report> {
        let query = supabase
            .from('reports')
            .select(`
                *,
                category:report_categories(*),
                reporter:reported_by(id, username, name, role),
                student:student_id(
                    id, 
                    name,
                    father_name
                ),
                staff:staff_id(
                    id,
                    name,
                    role
                ),
                actions:report_actions(*)
            `)
            .eq('id', id);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { data, error } = await query.single();

        if (error) throw error;
        
        // Transform the data to match the expected format
        return {
            ...data,
            subject_id: data.subject_type === 'student' ? data.student_id : data.staff_id,
            subject: data.subject_type === 'student' ? data.student : data.staff
        };
    },

    async createReport(reportData: CreateReportDTO, schoolId?: number): Promise<Report> {
        // Get the current user from localStorage
        const user = getUser();
        if (!user) throw new Error('No authenticated user found');
        if (!user.staff_id) throw new Error('No staff ID found for current user');

        const insertData: any = {
            ...reportData,
            reported_by: user.staff_id,
            status: 'pending'
        };
        
        if (schoolId) {
            insertData.school_id = schoolId;
        }

        const { data, error } = await supabase
            .from('reports')
            .insert(insertData)
            .select(`
                *,
                category:report_categories(*),
                reporter:staff!reports_reported_by_fkey(*),
                student:students(
                    id,
                    name,
                    father_name,
                    picture_url,
                    class:classes(id, name),
                    section:sections(id, name)
                ),
                staff:staff!reports_staff_id_fkey(*)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async deleteReport(reportId: number, schoolId?: number): Promise<void> {
        let query = supabase
            .from('reports')
            .delete()
            .eq('id', reportId);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { error } = await query;

        if (error) throw error;
    },

    async updateReport(
        reportId: string, 
        updateData: { status?: ReportStatus; update_note?: string },
        schoolId?: number
    ): Promise<void> {
        // Get the current user from localStorage
        const user = getUser();
        if (!user) throw new Error('No authenticated user found');
        if (!user.staff_id) throw new Error('No staff ID found for current user');

        let reportQuery = supabase
            .from('reports')
            .select('status')
            .eq('id', reportId);
            
        if (schoolId) {
            reportQuery = reportQuery.eq('school_id', schoolId);
        }
        
        const { data: report } = await reportQuery.single();

        if (!report) throw new Error('Report not found');

        // Start a transaction
        const { error } = await supabase.rpc('update_report', {
            p_report_id: reportId,
            p_new_status: updateData.status || report.status,
            p_previous_status: report.status,
            p_update_note: updateData.update_note || '',
            p_updated_by: user.staff_id
        });

        if (error) throw error;
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

    updateReportDetails: async (reportId: string, data: { 
        severity: ReportSeverity; 
        description: string; 
        created_at: string 
    }, schoolId?: number) => {
        // Note: This function only updates severity, description, and created_at.
        // The reported_by field is intentionally NOT updated to preserve the original creator.
        let query = supabase
            .from('reports')
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

    // Update an existing report update's note
    async updateReportUpdate(
        updateId: string,
        updateNote: string,
        schoolId?: number
    ): Promise<void> {
        let query = supabase
            .from('reports_updates')
            .update({
                update_note: updateNote
            })
            .eq('id', updateId);
            
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { error } = await query;
        
        if (error) throw error;
    }
}; 