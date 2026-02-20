import { supabase } from '../supabaseClient';
import {
    Examination,
    ExamSubject,
    ExamResult,
    ExamMasterSheet,
    DMCTemplate,
    DMCGenerated,
    GradeScale,
    ExamAnalytics,
    CreateExaminationDTO,
    UpdateExaminationDTO,
    CreateExamSubjectDTO,
    UpdateExamSubjectDTO,
    CreateExamResultDTO,
    UpdateExamResultDTO,
    CreateDMCTemplateDTO,
    UpdateDMCTemplateDTO,
    CreateGradeScaleDTO,
    UpdateGradeScaleDTO,
    ExaminationFilters,
    ExamResultFilters,
    ExamAnalyticsFilters,
    BulkMarksEntryDTO,
    MarksImportDTO,
    DMCGenerationDTO,
    PerformanceAnalytics,
    ExamStatistics,
    ExportOptions,
    MasterSheetExportDTO,
    DMCExportDTO
} from '../types/examinations';
import { fetchAllRows } from '../utils/paginationHelper';

// Helper function to enrich examination data with related information
const enrichExaminationData = async (examinations: any[]): Promise<Examination[]> => {
    if (!examinations.length) return [];

    // Get unique session IDs and user IDs
    const sessionIds = Array.from(new Set(examinations.map(e => e.session_id)));
    const userIds = Array.from(new Set(examinations.map(e => e.created_by).filter(Boolean)));

    // Fetch sessions data
    const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name')
        .in('id', sessionIds);

    // Fetch users data
    const { data: users } = userIds.length > 0 ? await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds) : { data: [] };

    // Create lookup maps
    const sessionMap = new Map(sessions?.map(s => [s.id, s]) || []);
    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    // Enrich examinations with related data
    return examinations.map(exam => ({
        ...exam,
        session: sessionMap.get(exam.session_id),
        created_by_user: exam.created_by ? userMap.get(exam.created_by) : null
    }));
};

export const examinationService = {
    // Examination CRUD Operations
    async getExaminations(filters: ExaminationFilters = {}, schoolId?: number): Promise<Examination[]> {
        const data = await fetchAllRows(async (from, to) => {
            let query = supabase
                .from('examinations')
                .select('*')
                .order('created_at', { ascending: false });

            if (schoolId) {
                query = query.eq('school_id', schoolId);
            }

            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (key === 'search_query') {
                        query = query.or(`name.ilike.%${value}%,description.ilike.%${value}%`);
                    } else {
                        query = query.eq(key, value);
                    }
                }
            });

            return await query.range(from, to);
        });
        return await enrichExaminationData(data);
    },

    async getExaminationById(id: number, schoolId?: number): Promise<Examination> {
        let query = supabase
            .from('examinations')
            .select('*')
            .eq('id', id);

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        const { data, error } = await query.single();
        if (error) throw error;
        
        const enriched = await enrichExaminationData([data]);
        return enriched[0];
    },

    async createExamination(examination: CreateExaminationDTO): Promise<Examination> {
        const { data, error } = await supabase
            .from('examinations')
            .insert(examination)
            .select('*')
            .single();

        if (error) throw error;
        
        const enriched = await enrichExaminationData([data]);
        return enriched[0];
    },

    async updateExamination(id: number, updates: UpdateExaminationDTO, schoolId?: number): Promise<Examination> {
        let query = supabase
            .from('examinations')
            .update(updates)
            .eq('id', id);

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        const { data, error } = await query.select('*').single();
        if (error) throw error;
        
        const enriched = await enrichExaminationData([data]);
        return enriched[0];
    },

    async deleteExamination(id: number, schoolId?: number): Promise<void> {
        const query = supabase
            .from('examinations')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId || 0);

        const { error } = await query;
        if (error) throw error;
    },

    // Exam Subjects Management
    async getExamSubjects(examId: number, schoolId?: number): Promise<ExamSubject[]> {
        const data = await fetchAllRows(async (from, to) => {
            let query = supabase
                .from('exam_subjects')
                .select(`
                    *,
                    subject:subjects(name, code),
                    class:classes(name)
                `)
                .eq('exam_id', examId);

            if (schoolId) {
                query = query.eq('school_id', schoolId);
            }

            return await query.range(from, to);
        });
        return data;
    },

    async createExamSubject(examSubject: CreateExamSubjectDTO): Promise<ExamSubject> {
        const { data, error } = await supabase
            .from('exam_subjects')
            .insert(examSubject)
            .select(`
                *,
                subject:subjects(name, code),
                class:classes(name)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async updateExamSubject(id: number, updates: UpdateExamSubjectDTO, schoolId?: number): Promise<ExamSubject> {
        const query = supabase
            .from('exam_subjects')
            .update(updates)
            .eq('id', id)
            .eq('school_id', schoolId || 0)
            .select(`
                *,
                subject:subjects(name, code),
                class:classes(name)
            `);

        const { data, error } = await query.single();
        if (error) throw error;
        return data;
    },

    async deleteExamSubject(id: number, schoolId?: number): Promise<void> {
        const query = supabase
            .from('exam_subjects')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId || 0);

        const { error } = await query;
        if (error) throw error;
    },

    // Exam Results Management
    async getExamResults(filters: ExamResultFilters = {}, schoolId?: number): Promise<ExamResult[]> {
        const data = await fetchAllRows(async (from, to) => {
            let query = supabase
                .from('exam_results')
                .select(`
                    *,
                    subject:subjects(name, code),
                    class:classes(name),
                    section:sections(name),
                    entered_by_user:users!exam_results_entered_by_fkey(name)
                `)
                .order('created_at', { ascending: false });

            if (schoolId) {
                query = query.eq('school_id', schoolId);
            }

            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (key === 'search_query') {
                        query = query.or(`student.name.ilike.%${value}%,student.father_name.ilike.%${value}%`);
                    } else {
                        query = query.eq(key, value);
                    }
                }
            });

            return await query.range(from, to);
        });
        return data;
    },

    async createExamResult(examResult: CreateExamResultDTO): Promise<ExamResult> {
        const { data, error } = await supabase
            .from('exam_results')
            .insert(examResult)
            .select(`
                *,
                student:students(name, father_name, picture_url),
                subject:subjects(name, code),
                class:classes(name),
                section:sections(name),
                entered_by_user:users!exam_results_entered_by_fkey(name)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async updateExamResult(id: number, updates: UpdateExamResultDTO, schoolId?: number): Promise<ExamResult> {
        const query = supabase
            .from('exam_results')
            .update(updates)
            .eq('id', id)
            .eq('school_id', schoolId || 0)
            .select(`
                *,
                student:students(name, father_name, picture_url),
                subject:subjects(name, code),
                class:classes(name),
                section:sections(name),
                entered_by_user:users!exam_results_entered_by_fkey(name)
            `);

        const { data, error } = await query.single();
        if (error) throw error;
        return data;
    },

    async deleteExamResult(id: number, schoolId?: number): Promise<void> {
        const query = supabase
            .from('exam_results')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId || 0);

        const { error } = await query;
        if (error) throw error;
    },

    // Bulk Marks Entry
    async bulkMarksEntry(bulkData: BulkMarksEntryDTO): Promise<ExamResult[]> {
        const { exam_id, class_id, section_id, subject_id, marks_data, entered_by, school_id } = bulkData;

        // Get max marks for the subject
        const { data: examSubject, error: subjectError } = await supabase
            .from('exam_subjects')
            .select('max_marks')
            .eq('exam_id', exam_id)
            .eq('subject_id', subject_id)
            .eq('class_id', class_id)
            .eq('school_id', school_id)
            .single();

        if (subjectError) throw subjectError;

        const results = marks_data.map(mark => ({
            exam_id,
            student_id: mark.student_id,
            subject_id,
            class_id,
            section_id: section_id || null,
            obtained_marks: mark.obtained_marks,
            max_marks: examSubject.max_marks,
            remarks: mark.remarks,
            entered_by,
            school_id
        }));

        const { data, error } = await supabase
            .from('exam_results')
            .insert(results)
            .select(`
                *,
                student:students(name, father_name, picture_url),
                subject:subjects(name, code),
                class:classes(name),
                section:sections(name),
                entered_by_user:users!exam_results_entered_by_fkey(name)
            `);

        if (error) throw error;
        return data || [];
    },

    // Master Sheet Operations
    async getMasterSheets(examId: number, classId?: number, sectionId?: number, schoolId?: number): Promise<ExamMasterSheet[]> {
        const data = await fetchAllRows(async (from, to) => {
            let query = supabase
                .from('exam_master_sheets')
                .select(`
                    *,
                    student:students(name, father_name, picture_url),
                    class:classes(name),
                    section:sections(name),
                    exam:examinations(name, exam_type)
                `)
                .eq('exam_id', examId)
                .order('position');

            if (classId) {
                query = query.eq('class_id', classId);
            }

            if (sectionId) {
                query = query.eq('section_id', sectionId);
            }

            if (schoolId) {
                query = query.eq('school_id', schoolId);
            }

            return await query.range(from, to);
        });
        return data;
    },

    async generateMasterSheet(examId: number, classId: number, sectionId?: number, schoolId?: number): Promise<void> {
        const { error } = await supabase
            .rpc('generate_exam_master_sheet', {
                p_exam_id: examId,
                p_class_id: classId,
                p_section_id: sectionId
            });

        if (error) throw error;
    },

    // DMC Template Management
    async getDMCTemplates(schoolId?: number): Promise<DMCTemplate[]> {
        const data = await fetchAllRows(async (from, to) => {
            let query = supabase
                .from('dmc_templates')
                .select(`
                    *,
                    created_by_user:users!dmc_templates_created_by_fkey(name)
                `)
                .order('created_at', { ascending: false });

            if (schoolId) {
                query = query.eq('school_id', schoolId);
            }

            return await query.range(from, to);
        });
        return data;
    },

    async createDMCTemplate(template: CreateDMCTemplateDTO): Promise<DMCTemplate> {
        const { data, error } = await supabase
            .from('dmc_templates')
            .insert(template)
            .select(`
                *,
                created_by_user:users!dmc_templates_created_by_fkey(name)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async updateDMCTemplate(id: number, updates: UpdateDMCTemplateDTO, schoolId?: number): Promise<DMCTemplate> {
        const query = supabase
            .from('dmc_templates')
            .update(updates)
            .eq('id', id)
            .eq('school_id', schoolId || 0)
            .select(`
                *,
                created_by_user:users!dmc_templates_created_by_fkey(name)
            `);

        const { data, error } = await query.single();
        if (error) throw error;
        return data;
    },

    async deleteDMCTemplate(id: number, schoolId?: number): Promise<void> {
        const query = supabase
            .from('dmc_templates')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId || 0);

        const { error } = await query;
        if (error) throw error;
    },

    // Grade Scale Management
    async getGradeScales(schoolId?: number): Promise<GradeScale[]> {
        let query = supabase
            .from('grade_scales')
            .select('*')
            .order('min_marks', { ascending: false });

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createGradeScale(gradeScale: CreateGradeScaleDTO): Promise<GradeScale> {
        const { data, error } = await supabase
            .from('grade_scales')
            .insert(gradeScale)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateGradeScale(id: number, updates: UpdateGradeScaleDTO, schoolId?: number): Promise<GradeScale> {
        const query = supabase
            .from('grade_scales')
            .update(updates)
            .eq('id', id)
            .eq('school_id', schoolId || 0)
            .select();

        const { data, error } = await query.single();
        if (error) throw error;
        return data;
    },

    async deleteGradeScale(id: number, schoolId?: number): Promise<void> {
        const query = supabase
            .from('grade_scales')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId || 0);

        const { error } = await query;
        if (error) throw error;
    },

    // Analytics and Reporting
    async getExamAnalytics(filters: ExamAnalyticsFilters = {}, schoolId?: number): Promise<ExamAnalytics[]> {
        let query = supabase
            .from('exam_analytics')
            .select(`
                *,
                exam:examinations(name, exam_type),
                class:classes(name),
                section:sections(name)
            `)
            .order('calculated_at', { ascending: false });

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query = query.eq(key, value);
            }
        });

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getPerformanceAnalytics(examId: number, schoolId?: number): Promise<PerformanceAnalytics> {
        // Get top performers
        const { data: topPerformers, error: topError } = await supabase
            .from('exam_master_sheets')
            .select(`
                student_id,
                student:students(name),
                percentage,
                grade,
                position
            `)
            .eq('exam_id', examId)
            .order('percentage', { ascending: false })
            .limit(10);

        if (topError) throw topError;

        // Get subject-wise performance
        const { data: subjectPerformance, error: subjectError } = await supabase
            .rpc('get_subject_wise_performance', {
                p_exam_id: examId
            });

        if (subjectError) throw subjectError;

        // Get class performance
        const { data: classPerformance, error: classError } = await supabase
            .rpc('get_class_performance', {
                p_exam_id: examId
            });

        if (classError) throw classError;

        // Get pass/fail ratio
        const { data: passFailRatio, error: ratioError } = await supabase
            .rpc('get_pass_fail_ratio', {
                p_exam_id: examId
            });

        if (ratioError) throw ratioError;

        return {
            top_performers: (topPerformers || []).map((performer: any) => ({
                student_id: performer.student_id,
                student_name: performer.student?.name || 'Unknown',
                percentage: performer.percentage,
                grade: performer.grade,
                position: performer.position
            })),
            subject_wise_performance: subjectPerformance || [],
            class_performance: classPerformance || [],
            pass_fail_ratio: passFailRatio?.[0] || {
                total_students: 0,
                passed_students: 0,
                failed_students: 0,
                pass_percentage: 0
            }
        };
    },

    async getExamStatistics(examId: number, schoolId?: number): Promise<ExamStatistics> {
        const { data, error } = await supabase
            .rpc('get_exam_statistics', {
                p_exam_id: examId
            });

        if (error) throw error;
        return data?.[0] || {
            exam_id: examId,
            exam_name: '',
            total_students: 0,
            appeared_students: 0,
            passed_students: 0,
            failed_students: 0,
            average_percentage: 0,
            highest_percentage: 0,
            lowest_percentage: 0,
            pass_percentage: 0,
            grade_distribution: []
        };
    },

    // Export Operations
    async exportMasterSheet(exportData: MasterSheetExportDTO): Promise<Blob> {
        const { data, error } = await supabase
            .rpc('export_master_sheet', {
                p_exam_id: exportData.exam_id,
                p_class_id: exportData.class_id,
                p_section_id: exportData.section_id,
                p_format: exportData.export_options.format,
                p_include_remarks: exportData.export_options.include_remarks,
                p_include_analytics: exportData.export_options.include_analytics
            });

        if (error) throw error;
        return data;
    },

    async exportDMC(exportData: DMCExportDTO): Promise<Blob> {
        const { data, error } = await supabase
            .rpc('export_dmc', {
                p_exam_id: exportData.exam_id,
                p_student_ids: exportData.student_ids,
                p_template_id: exportData.template_id,
                p_format: exportData.export_options.format
            });

        if (error) throw error;
        return data;
    },

    // Utility Functions
    async calculateStudentPosition(examId: number, studentId: number, classId: number, sectionId?: number): Promise<number> {
        const { data, error } = await supabase
            .rpc('calculate_student_position', {
                p_exam_id: examId,
                p_student_id: studentId,
                p_class_id: classId,
                p_section_id: sectionId
            });

        if (error) throw error;
        return data || 1;
    },

    async assignGrade(percentage: number, schoolId: number): Promise<string> {
        const { data, error } = await supabase
            .rpc('assign_grade', {
                p_percentage: percentage,
                p_school_id: schoolId
            });

        if (error) throw error;
        return data || 'F';
    }
};
