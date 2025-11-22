// Homework Diary Service
// Service for managing daily homework assignments

import { supabase } from '../supabaseClient';
import {
  HomeworkDiary,
  CreateHomeworkDiaryDTO,
  UpdateHomeworkDiaryDTO,
  HomeworkDiaryFilters,
  HomeworkDiaryResponse,
  BulkHomeworkAssignmentDTO
} from '../types/homeworkDiary';

class HomeworkDiaryService {
  // Get homework diary entries with optional filters and enrichment
  async getHomeworkDiary(
    filters: HomeworkDiaryFilters = {},
    page: number = 1,
    limit: number = 50,
    schoolId: number
  ): Promise<HomeworkDiaryResponse> {
    // Build query with joins for enrichment
    let query = supabase
      .from('homework_diary')
      .select(`
        *,
        classes:class_id (id, name),
        sections:section_id (id, name),
        subjects:subject_id (id, name),
        sessions:session_id (id, name),
        users:assigned_by (id, name, staff_id)
      `)
      .eq('school_id', schoolId)
      .order('homework_date', { ascending: false })
      .order('class_id', { ascending: true });

    // Apply filters
    if (filters.class_id) {
      query = query.eq('class_id', filters.class_id);
    }
    if (filters.section_id !== undefined) {
      if (filters.section_id === null) {
        query = query.is('section_id', null);
      } else {
        query = query.eq('section_id', filters.section_id);
      }
    }
    if (filters.session_id) {
      query = query.eq('session_id', filters.session_id);
    }
    if (filters.subject_id !== undefined) {
      if (filters.subject_id === null) {
        query = query.is('subject_id', null);
      } else {
        query = query.eq('subject_id', filters.subject_id);
      }
    }
    if (filters.homework_date) {
      query = query.eq('homework_date', filters.homework_date);
    }
    if (filters.start_date) {
      query = query.gte('homework_date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('homework_date', filters.end_date);
    }
    if (filters.search) {
      query = query.ilike('homework_text', `%${filters.search}%`);
    }

    // Get total count
    const countQuery = supabase
      .from('homework_diary')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    // Apply same filters to count query
    if (filters.class_id) {
      countQuery.eq('class_id', filters.class_id);
    }
    if (filters.section_id !== undefined) {
      if (filters.section_id === null) {
        countQuery.is('section_id', null);
      } else {
        countQuery.eq('section_id', filters.section_id);
      }
    }
    if (filters.session_id) {
      countQuery.eq('session_id', filters.session_id);
    }
    if (filters.subject_id !== undefined) {
      if (filters.subject_id === null) {
        countQuery.is('subject_id', null);
      } else {
        countQuery.eq('subject_id', filters.subject_id);
      }
    }
    if (filters.homework_date) {
      countQuery.eq('homework_date', filters.homework_date);
    }
    if (filters.start_date) {
      countQuery.gte('homework_date', filters.start_date);
    }
    if (filters.end_date) {
      countQuery.lte('homework_date', filters.end_date);
    }
    if (filters.search) {
      countQuery.ilike('homework_text', `%${filters.search}%`);
    }

    const { count } = await countQuery;

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) throw error;

    // Get unique staff_ids from users to fetch staff data
    const staffIds = Array.from(new Set(
      (data || [])
        .map((item: any) => item.users?.staff_id)
        .filter(Boolean)
    ));

    // Fetch staff data for gender information
    let staffMap = new Map();
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, gender')
        .in('id', staffIds);
      
      if (staffData) {
        staffMap = new Map(staffData.map((s: any) => [s.id, s]));
      }
    }

    // Enrich data with related information
    const enrichedData: HomeworkDiary[] = (data || []).map((item: any) => {
      const staffId = item.users?.staff_id;
      const staff = staffId ? staffMap.get(staffId) : null;
      
      return {
        ...item,
        class_name: item.classes?.name,
        section_name: item.sections?.name,
        subject_name: item.subjects?.name,
        session_name: item.sessions?.name,
        assigned_by_name: item.users?.name || staff?.name,
        assigned_by_gender: staff?.gender
      };
    });

    return {
      data: enrichedData,
      total: count || 0,
      page,
      limit
    };
  }

  // Get a single homework diary entry
  async getHomeworkDiaryEntry(id: number, schoolId: number): Promise<HomeworkDiary> {
    const { data, error } = await supabase
      .from('homework_diary')
      .select(`
        *,
        classes:class_id (id, name),
        sections:section_id (id, name),
        subjects:subject_id (id, name),
        sessions:session_id (id, name),
        users:assigned_by (id, name, staff_id)
      `)
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (error) throw error;

    return {
      ...data,
      class_name: data.classes?.name,
      section_name: data.sections?.name,
      subject_name: data.subjects?.name,
      session_name: data.sessions?.name,
      assigned_by_name: data.users?.name || data.staff?.name,
      assigned_by_gender: data.staff?.gender
    };
  }

  // Create a new homework diary entry
  async createHomeworkDiary(
    homeworkData: CreateHomeworkDiaryDTO,
    schoolId: number,
    userId: number
  ): Promise<HomeworkDiary> {
    const { data, error } = await supabase
      .from('homework_diary')
      .insert({
        ...homeworkData,
        school_id: schoolId,
        assigned_by: userId
      })
      .select(`
        *,
        classes:class_id (id, name),
        sections:section_id (id, name),
        subjects:subject_id (id, name),
        sessions:session_id (id, name),
        users:assigned_by (id, name, staff_id)
      `)
      .single();

    if (error) throw error;

    // Fetch staff data if user has staff_id
    let staffGender = null;
    if (data.users?.staff_id) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, gender')
        .eq('id', data.users.staff_id)
        .single();
      
      staffGender = staffData?.gender;
    }

    return {
      ...data,
      class_name: data.classes?.name,
      section_name: data.sections?.name,
      subject_name: data.subjects?.name,
      session_name: data.sessions?.name,
      assigned_by_name: data.users?.name,
      assigned_by_gender: staffGender
    };
  }

  // Update an existing homework diary entry
  async updateHomeworkDiary(
    id: number,
    updates: UpdateHomeworkDiaryDTO,
    schoolId: number
  ): Promise<HomeworkDiary> {
    // First, fetch the current entry to preserve the original assigned_by
    const { data: currentEntry, error: fetchError } = await supabase
      .from('homework_diary')
      .select('assigned_by')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (fetchError) throw fetchError;

    // Prepare update object without assigned_by (preserve original creator)
    const { assigned_by, ...updateData } = updates as any;
    
    const { data, error } = await supabase
      .from('homework_diary')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
        // Note: assigned_by is not included in the update to preserve the original creator
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select(`
        *,
        classes:class_id (id, name),
        sections:section_id (id, name),
        subjects:subject_id (id, name),
        sessions:session_id (id, name),
        users:assigned_by (id, name, staff_id)
      `)
      .single();

    if (error) throw error;

    // Fetch staff data if user has staff_id
    let staffGender = null;
    if (data.users?.staff_id) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, gender')
        .eq('id', data.users.staff_id)
        .single();
      
      staffGender = staffData?.gender;
    }

    return {
      ...data,
      class_name: data.classes?.name,
      section_name: data.sections?.name,
      subject_name: data.subjects?.name,
      session_name: data.sessions?.name,
      assigned_by_name: data.users?.name,
      assigned_by_gender: staffGender
    };
  }

  // Delete a homework diary entry
  async deleteHomeworkDiary(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('homework_diary')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
  }

  // Bulk assignment - assign homework for multiple subjects at once
  // Preserve original creator (assigned_by) when updating existing rows
  async bulkAssignHomework(
    bulkData: BulkHomeworkAssignmentDTO,
    schoolId: number,
    userId: number
  ): Promise<HomeworkDiary[]> {
    // 1) Fetch existing rows for this class/section/date/school
    let existingQuery = supabase
      .from('homework_diary')
      .select('id, subject_id')
      .eq('class_id', bulkData.class_id)
      .eq('homework_date', bulkData.homework_date)
      .eq('school_id', schoolId);

    if (bulkData.section_id === null) {
      existingQuery = existingQuery.is('section_id', null);
    } else {
      existingQuery = existingQuery.eq('section_id', bulkData.section_id);
    }

    const { data: existingRows, error: existingError } = await existingQuery;
    if (existingError) throw existingError;

    const existingMap = new Map<null | number, number>();
    (existingRows || []).forEach((row: any) => {
      existingMap.set(row.subject_id ?? null, row.id);
    });

    // 2) Split assignments into inserts and updates
    const toInsert: any[] = [];
    const toUpdate: { id: number; homework_text: string }[] = [];

    for (const assignment of bulkData.assignments) {
      const key = assignment.subject_id ?? null;
      const existingId = existingMap.get(key);
      if (existingId) {
        toUpdate.push({ id: existingId, homework_text: assignment.homework_text });
      } else {
        toInsert.push({
          class_id: bulkData.class_id,
          section_id: bulkData.section_id,
          session_id: bulkData.session_id,
          subject_id: assignment.subject_id,
          homework_date: bulkData.homework_date,
          homework_text: assignment.homework_text,
          school_id: schoolId,
          assigned_by: userId
        });
      }
    }

    // 3) Perform inserts (with assigned_by)
    let inserted: any[] = [];
    if (toInsert.length > 0) {
      const { data: insertData, error: insertError } = await supabase
        .from('homework_diary')
        .insert(toInsert)
        .select(`
          *,
          classes:class_id (id, name),
          sections:section_id (id, name),
          subjects:subject_id (id, name),
          sessions:session_id (id, name),
          users:assigned_by (id, name, staff_id)
        `);
      if (insertError) throw insertError;
      inserted = insertData || [];
    }

    // 4) Perform updates (do NOT touch assigned_by)
    let updated: any[] = [];
    if (toUpdate.length > 0) {
      // Update rows one by one since homework_text differs per row
      for (const u of toUpdate) {
        const { data: updData, error: updError } = await supabase
          .from('homework_diary')
          .update({ homework_text: u.homework_text, updated_at: new Date().toISOString() })
          .eq('id', u.id)
          .eq('school_id', schoolId)
          .select(`
            *,
            classes:class_id (id, name),
            sections:section_id (id, name),
            subjects:subject_id (id, name),
            sessions:session_id (id, name),
            users:assigned_by (id, name, staff_id)
          `)
          .single();
        if (updError) throw updError;
        updated.push(updData);
      }
    }

    const data = [...inserted, ...updated];

    // 5) Enrich with staff info
    const staffIds = Array.from(new Set(
      (data || [])
        .map((item: any) => item.users?.staff_id)
        .filter(Boolean)
    ));

    let staffMap = new Map();
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, gender')
        .in('id', staffIds);
      if (staffData) {
        staffMap = new Map(staffData.map((s: any) => [s.id, s]));
      }
    }

    return (data || []).map((item: any) => {
      const staffId = item.users?.staff_id;
      const staff = staffId ? staffMap.get(staffId) : null;
      return {
        ...item,
        class_name: item.classes?.name,
        section_name: item.sections?.name,
        subject_name: item.subjects?.name,
        session_name: item.sessions?.name,
        assigned_by_name: item.users?.name || staff?.name,
        assigned_by_gender: staff?.gender
      };
    });
  }

  // Get homework for a specific class/section/date combination
  async getHomeworkByClassAndDate(
    classId: number,
    sectionId: number | null,
    date: string,
    schoolId: number,
    teacherId?: number | null
  ): Promise<HomeworkDiary[]> {
    let query = supabase
      .from('homework_diary')
      .select(`
        *,
        classes:class_id (id, name),
        sections:section_id (id, name),
        subjects:subject_id (id, name),
        sessions:session_id (id, name),
        users:assigned_by (id, name, staff_id)
      `)
      .eq('class_id', classId)
      .eq('homework_date', date)
      .eq('school_id', schoolId)
      .order('subject_id', { ascending: true, nullsFirst: false });

    if (sectionId === null) {
      query = query.is('section_id', null);
    } else {
      query = query.eq('section_id', sectionId);
    }

    // If teacherId is provided, filter by teacher's subjects
    if (teacherId) {
      // Get subject IDs that this teacher teaches for this class
      const { data: teacherSubjects, error: teacherSubjectsError } = await supabase
        .from('teacher_class_subjects')
        .select('class_subjects!inner(subject_id)')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .eq('class_subjects.class_id', classId);
      
      if (teacherSubjectsError) {
        // If there's an error, return empty array to be safe
        return [];
      }

      // Extract unique subject IDs from the nested structure
      const teacherSubjectIds: number[] = [];
      teacherSubjects?.forEach((item: any) => {
        const subjectId = item.class_subjects?.subject_id;
        if (subjectId !== undefined && subjectId !== null) {
          teacherSubjectIds.push(subjectId);
        }
      });

      // Filter homework entries to only show teacher's subjects or general homework
      if (teacherSubjectIds.length > 0) {
        // Use .or() to match either subject_id in teacher's subjects OR subject_id is null (general homework)
        // Format: field.operator.value,field.operator.value
        const subjectFilter = teacherSubjectIds.map(id => `subject_id.eq.${id}`).join(',');
        query = query.or(`${subjectFilter},subject_id.is.null`);
      } else {
        // If teacher has no subjects, only show general homework (null subject_id)
        query = query.is('subject_id', null);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get unique staff_ids from users to fetch staff data
    const staffIds = Array.from(new Set(
      (data || [])
        .map((item: any) => item.users?.staff_id)
        .filter(Boolean)
    ));

    // Fetch staff data for gender information
    let staffMap = new Map();
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, gender')
        .in('id', staffIds);
      
      if (staffData) {
        staffMap = new Map(staffData.map((s: any) => [s.id, s]));
      }
    }

    return (data || []).map((item: any) => {
      const staffId = item.users?.staff_id;
      const staff = staffId ? staffMap.get(staffId) : null;
      
      return {
        ...item,
        class_name: item.classes?.name,
        section_name: item.sections?.name,
        subject_name: item.subjects?.name,
        session_name: item.sessions?.name,
        assigned_by_name: item.users?.name || staff?.name,
        assigned_by_gender: staff?.gender
      };
    });
  }
}

export const homeworkDiaryService = new HomeworkDiaryService();

