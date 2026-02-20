import { supabase } from '../supabaseClient';
import {
    Subject,
    GradeScale,
    ReportCard,
    ReportCardDetail,
    CreateReportCardDTO,
    UpdateReportCardDTO,
    CreateReportCardDetailDTO,
    UpdateReportCardDetailDTO
} from '../types/reportCards';

export const reportCardService = {
    // Subjects
    async getSubjects(classId?: number): Promise<Subject[]> {
        const query = supabase
            .from('subjects')
            .select('*')
            .order('name');
        
        if (classId) {
            query.eq('class_id', classId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async createSubject(subject: Omit<Subject, 'id' | 'created_at' | 'updated_at'>): Promise<Subject> {
        const { data, error } = await supabase
            .from('subjects')
            .insert(subject)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // Grade Scales
    async getGradeScales(): Promise<GradeScale[]> {
        const { data, error } = await supabase
            .from('grade_scales')
            .select('*')
            .order('min_marks', { ascending: false });
        
        if (error) throw error;
        return data;
    },

    // Report Cards
    async getReportCards(filters: {
        student_id?: number;
        class_id?: number;
        section_id?: number;
        session_id?: number;
        term?: string;
        status?: 'draft' | 'published' | 'archived';
    } = {}): Promise<ReportCard[]> {
        let query = supabase
            .from('report_cards')
            .select(`
                *,
                student:student_id(
                    name,
                    father_name,
                    picture_url
                ),
                class:class_id(name),
                section:section_id(name),
                session:session_id(name)
            `)
            .order('created_at', { ascending: false });

        Object.entries(filters).forEach(([key, value]) => {
            if (value) query = query.eq(key, value);
        });

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getReportCardById(id: number): Promise<ReportCard & { details: ReportCardDetail[] }> {
        const { data, error } = await supabase
            .from('report_cards')
            .select(`
                *,
                student:student_id(
                    name,
                    father_name,
                    picture_url
                ),
                class:class_id(name),
                section:section_id(name),
                session:session_id(name),
                details:report_card_details(
                    *,
                    subject:subject_id(*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createReportCard(reportCard: CreateReportCardDTO): Promise<ReportCard> {
        const { data, error } = await supabase
            .from('report_cards')
            .insert(reportCard)
            .select(`
                *,
                student:student_id(
                    name,
                    father_name,
                    picture_url
                ),
                class:class_id(name),
                section:section_id(name),
                session:session_id(name)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async updateReportCard(id: number, updates: UpdateReportCardDTO): Promise<ReportCard> {
        const { data, error } = await supabase
            .from('report_cards')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                student:student_id(
                    name,
                    father_name,
                    picture_url
                ),
                class:class_id(name),
                section:section_id(name),
                session:session_id(name)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async deleteReportCard(id: number): Promise<void> {
        const { error } = await supabase
            .from('report_cards')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Report Card Details
    async createReportCardDetail(detail: CreateReportCardDetailDTO): Promise<ReportCardDetail> {
        const { data, error } = await supabase
            .from('report_card_details')
            .insert(detail)
            .select(`
                *,
                subject:subject_id(*)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async updateReportCardDetail(id: number, updates: UpdateReportCardDetailDTO): Promise<ReportCardDetail> {
        const { data, error } = await supabase
            .from('report_card_details')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                subject:subject_id(*)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async deleteReportCardDetail(id: number): Promise<void> {
        const { error } = await supabase
            .from('report_card_details')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Utility functions
    async calculateClassPositions(classId: number, term: string, sessionId: number): Promise<void> {
        const { error } = await supabase
            .rpc('calculate_class_positions', {
                p_class_id: classId,
                p_term: term,
                p_session_id: sessionId
            });

        if (error) throw error;
    }
}; 