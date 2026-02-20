// Test Record Service - Updated
// Mimicking the examination service structure

import { supabase } from '../supabaseClient';
import {
  TestRecord,
  TestResult,
  CreateTestRecordDTO,
  UpdateTestRecordDTO,
  CreateTestResultDTO,
  TestRecordFilters,
  TestRecordResponse,
  TestResultResponse
} from '../types/testRecords';
import { fetchAllRows } from '../utils/paginationHelper';

class TestRecordService {
  // Test Records CRUD
  async getTestRecords(
    filters: TestRecordFilters = {},
    page: number = 1,
    limit: number = 50,
    schoolId: number
  ): Promise<TestRecordResponse> {
    let query = supabase
      .from('test_records')
      .select('*')
      .eq('school_id', schoolId)
      .order('test_date', { ascending: false });

    // Apply filters
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters.test_type) {
      query = query.eq('test_type', filters.test_type);
    }
    if (filters.class_id) {
      query = query.eq('class_id', filters.class_id);
    }
    if (filters.section_id) {
      query = query.eq('section_id', filters.section_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.subject_id) {
      query = query.eq('subject_id', filters.subject_id);
    }
    if (filters.session_id) {
      query = query.eq('session_id', filters.session_id);
    }

    // Get total count using a separate query
    const countQuery = supabase
      .from('test_records')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    // Apply same filters to count query
    if (filters.search) {
      countQuery.ilike('name', `%${filters.search}%`);
    }
    if (filters.test_type) {
      countQuery.eq('test_type', filters.test_type);
    }
    if (filters.class_id) {
      countQuery.eq('class_id', filters.class_id);
    }
    if (filters.section_id) {
      countQuery.eq('section_id', filters.section_id);
    }
    if (filters.status) {
      countQuery.eq('status', filters.status);
    }
    if (filters.subject_id) {
      countQuery.eq('subject_id', filters.subject_id);
    }
    if (filters.session_id) {
      countQuery.eq('session_id', filters.session_id);
    }

    const { count } = await countQuery;

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit
    };
  }

  async getTestRecord(id: number, schoolId: number): Promise<TestRecord> {
    const { data, error } = await supabase
      .from('test_records')
      .select('*')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (error) throw error;
    return data;
  }

  async createTestRecord(testData: CreateTestRecordDTO, schoolId: number, userId: number): Promise<TestRecord> {
    const { data, error } = await supabase
      .from('test_records')
      .insert({
        ...testData,
        school_id: schoolId,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTestRecord(id: number, updates: UpdateTestRecordDTO, schoolId: number): Promise<TestRecord> {
    const { data, error } = await supabase
      .from('test_records')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTestRecord(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('test_records')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
  }

  // Test Results CRUD
  async getTestResults(testId: number, schoolId: number): Promise<TestResultResponse> {
    const data = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId)
        .eq('school_id', schoolId)
        .order('obtained_marks', { ascending: false })
        .range(from, to);
    });

    return {
      data: data,
      total: data.length
    };
  }

  async createTestResult(resultData: CreateTestResultDTO, schoolId: number): Promise<TestResult> {
    const { data, error } = await supabase
      .from('test_results')
      .insert({
        ...resultData,
        school_id: schoolId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTestResult(id: number, obtainedMarks: number, maxMarks: number, remarks?: string, schoolId?: number): Promise<TestResult> {
    const { data, error } = await supabase
      .from('test_results')
      .update({
        obtained_marks: obtainedMarks,
        max_marks: maxMarks,
        remarks: remarks,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTestResult(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('test_results')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
  }

  async deleteTestResultsByTestAndStudents(testId: number, studentIds: number[], schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('test_results')
      .delete()
      .eq('test_id', testId)
      .in('student_id', studentIds)
      .eq('school_id', schoolId);

    if (error) throw error;
  }

  // Bulk operations
  async createBulkTestResults(results: CreateTestResultDTO[], schoolId: number): Promise<TestResult[]> {
    const resultsWithSchoolId = results.map(result => ({
      ...result,
      school_id: schoolId
    }));

    const { data, error } = await supabase
      .from('test_results')
      .insert(resultsWithSchoolId)
      .select();

    if (error) throw error;
    return data || [];
  }
}

export const testRecordService = new TestRecordService();
