import { supabase } from '../supabaseClient';

export interface ExaminationSummary {
  id?: number;
  examination_id: number;
  student_id: number;
  class_id: number;
  section_id?: number | null;
  school_id: number;
  session_id: number;
  obtained_marks: number;
  total_marks: number;
  percentage: number;
  grade?: string;
  position: number;
  rank_in_class: number;
  rank_in_section: number;
  total_strength: number;
  status: 'pass' | 'fail' | 'absent';
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  // Related data from joins
  student?: any;
  class?: any;
  section?: any;
  examination?: any;
  session?: any;
}

export interface ExaminationSummaryFilters {
  examination_id?: number;
  student_id?: number;
  class_id?: number;
  section_id?: number;
  school_id?: number;
  session_id?: number;
  status?: string;
}

export const examinationSummaryService = {
  // Create or update examination summary
  async upsertExaminationSummary(summary: ExaminationSummary): Promise<ExaminationSummary> {
    const { data, error } = await supabase
      .from('examination_summaries')
      .upsert(summary, {
        onConflict: 'examination_id,student_id,school_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Bulk upsert examination summaries
  async bulkUpsertExaminationSummaries(summaries: ExaminationSummary[]): Promise<ExaminationSummary[]> {
    const { data, error } = await supabase
      .from('examination_summaries')
      .upsert(summaries, {
        onConflict: 'examination_id,student_id,school_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;
    return data || [];
  },

  // Get examination summaries with filters
  async getExaminationSummaries(filters: ExaminationSummaryFilters = {}): Promise<ExaminationSummary[]> {
    let query = supabase
      .from('examination_summaries')
      .select(`
        *,
        examination:examinations(name, exam_type),
        student:students(name, father_name),
        class:classes(name),
        section:sections(name),
        session:sessions(name)
      `)
      .order('position', { ascending: true });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'section_id') {
          // Handle section_id specially for non-sectioned classes
          if (value === null) {
            query = query.is('section_id', null);
          } else {
            query = query.eq(key, value);
          }
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get examination summary by examination and student
  async getExaminationSummaryByStudent(examinationId: number, studentId: number, schoolId: number): Promise<ExaminationSummary | null> {
    const { data, error } = await supabase
      .from('examination_summaries')
      .select(`
        *,
        examination:examinations(name, exam_type),
        student:students(name, father_name),
        class:classes(name),
        section:sections(name),
        session:sessions(name)
      `)
      .eq('examination_id', examinationId)
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Get examination summaries for a specific examination
  async getExaminationSummariesByExam(examinationId: number, schoolId: number): Promise<ExaminationSummary[]> {
    const { data, error } = await supabase
      .from('examination_summaries')
      .select(`
        *,
        examination:examinations(name, exam_type),
        student:students(name, father_name),
        class:classes(name),
        section:sections(name),
        session:sessions(name)
      `)
      .eq('examination_id', examinationId)
      .eq('school_id', schoolId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Delete examination summaries for a specific examination
  async deleteExaminationSummariesByExam(examinationId: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('examination_summaries')
      .delete()
      .eq('examination_id', examinationId)
      .eq('school_id', schoolId);

    if (error) throw error;
  },

  // Get position holders (top 3) for an examination
  async getPositionHolders(examinationId: number, schoolId: number, limit: number = 3): Promise<ExaminationSummary[]> {
    const { data, error } = await supabase
      .from('examination_summaries')
      .select(`
        *,
        examination:examinations(name, exam_type),
        student:students(name, father_name),
        class:classes(name),
        section:sections(name),
        session:sessions(name)
      `)
      .eq('examination_id', examinationId)
      .eq('school_id', schoolId)
      .lte('position', limit)
      .neq('status', 'absent')
      .order('position', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get class performance statistics
  async getClassPerformanceStats(examinationId: number, classId: number, schoolId: number, sectionId?: number | null): Promise<{
    total_students: number;
    passed_students: number;
    failed_students: number;
    absent_students: number;
    average_percentage: number;
    highest_percentage: number;
    lowest_percentage: number;
  }> {
    let query = supabase
      .from('examination_summaries')
      .select('status, percentage')
      .eq('examination_id', examinationId)
      .eq('class_id', classId)
      .eq('school_id', schoolId);

    // Handle section_id filter properly for both sectioned and non-sectioned classes
    if (sectionId !== undefined) {
      if (sectionId === null) {
        query = query.is('section_id', null);
      } else {
        query = query.eq('section_id', sectionId);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    const summaries = data || [];
    const totalStudents = summaries.length;
    const passedStudents = summaries.filter(s => s.status === 'pass').length;
    const failedStudents = summaries.filter(s => s.status === 'fail').length;
    const absentStudents = summaries.filter(s => s.status === 'absent').length;
    
    const percentages = summaries.map(s => s.percentage).filter(p => p !== null);
    const averagePercentage = percentages.length > 0 
      ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length 
      : 0;
    
    const highestPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;
    const lowestPercentage = percentages.length > 0 ? Math.min(...percentages) : 0;

    return {
      total_students: totalStudents,
      passed_students: passedStudents,
      failed_students: failedStudents,
      absent_students: absentStudents,
      average_percentage: averagePercentage,
      highest_percentage: highestPercentage,
      lowest_percentage: lowestPercentage
    };
  }
};
