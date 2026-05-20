import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { getCache, setCache, clearCache } from '../services/cache';


export const useStudentData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Student Dashboard / Welcome Data
  const getDashboardData = useCallback(async (studentId: number, schoolId: number, classId: number | null, sectionId: number | null) => {
    const cacheKey = `dashboard_${studentId}_${schoolId}_${classId}_${sectionId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch Today's Attendance status
      const { data: todayAttendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('date', todayStr)
        .maybeSingle();

      // Fetch Today's Half-leaves (to see if student has early out or late in)
      const { data: todayHalfLeave } = await supabase
        .from('half_leaves')
        .select('*')
        .eq('person_type', 'student')
        .eq('person_id', studentId)
        .eq('date', todayStr)
        .maybeSingle();

      // Fetch active session
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();

      const sessionId = activeSession?.id;

      // Fetch Unpaid Challans Count
      let unpaidChallansCount = 0;
      if (sessionId) {
        const { count } = await supabase
          .from('fee_challans')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('school_id', schoolId)
          .eq('session_id', sessionId)
          .eq('status', 'unpaid');
        unpaidChallansCount = count || 0;
      }

      // Fetch Recent Announcements
      let announcements: any[] = [];
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .lte('show_from', todayStr)
        .or(`show_until.is.null,show_until.gte.${todayStr}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (annData) {
        // Filter in memory based on target audience (matching hook logic)
        announcements = annData.filter((ann: any) => {
          if (ann.audience_group !== 'students') return false;
          if (ann.target_scope === 'all') return true;
          if (ann.target_scope === 'class') {
            const classMatches = !ann.class_id || (classId && ann.class_id === classId);
            const sectionMatches = !ann.section_id || (sectionId && ann.section_id === sectionId);
            return classMatches && sectionMatches;
          }
          if (ann.target_scope === 'single' || ann.target_scope === 'multi') {
            const targetIds = [
              ...(ann.student_id ? [parseInt(ann.student_id)] : []),
              ...(ann.student_ids ? ann.student_ids.map((id: any) => parseInt(id)) : []),
            ];
            return targetIds.includes(studentId);
          }
          return false;
        });
      }

      // Fetch Recent Homework Entries
      let homework: any[] = [];
      if (classId) {
        let homeworkQuery = supabase
          .from('homework_diary')
          .select(`
            id,
            homework_date,
            homework_text,
            subject_id,
            subjects:subject_id(name)
          `)
          .eq('school_id', schoolId)
          .eq('class_id', classId)
          .order('homework_date', { ascending: false })
          .limit(5);

        if (sectionId) {
          homeworkQuery = homeworkQuery.eq('section_id', sectionId);
        }

        const { data: hwData } = await homeworkQuery;
        if (hwData) {
          homework = hwData.map((item: any) => ({
            id: item.id,
            date: item.homework_date,
            text: item.homework_text,
            subject: Array.isArray(item.subjects) ? item.subjects[0]?.name : item.subjects?.name || 'General',
          }));
        }
      }

      const result = {
        todayAttendance: todayAttendance || null,
        todayHalfLeave: todayHalfLeave || null,
        activeSession: activeSession || null,
        unpaidChallansCount,
        announcements,
        homework,
      };
      setCache(cacheKey, result);
      return result;
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch dashboard data');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Attendance History and Calculate Stats
  const getAttendanceData = useCallback(async (studentId: number, schoolId: number, sessionId: number | null) => {
    const cacheKey = `attendance_${studentId}_${schoolId}_${sessionId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    setLoading(true);
    setError(null);
    try {
      let attendanceQuery = supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (sessionId) {
        // Fetch session dates first
        const { data: session } = await supabase
          .from('sessions')
          .select('start_date, end_date')
          .eq('id', sessionId)
          .single();

        if (session) {
          attendanceQuery = attendanceQuery
            .gte('date', session.start_date)
            .lte('date', session.end_date);
        }
      }

      const { data: attendanceRecords, error: attError } = await attendanceQuery;
      if (attError) throw attError;

      // Fetch half leaves
      let halfLeavesQuery = supabase
        .from('half_leaves')
        .select('*')
        .eq('person_type', 'student')
        .eq('person_id', studentId)
        .eq('school_id', schoolId);

      if (sessionId) {
        halfLeavesQuery = halfLeavesQuery.eq('session_id', sessionId);
      }

      const { data: halfLeaves } = await halfLeavesQuery;

      const records = attendanceRecords || [];
      const hlRecords = halfLeaves || [];

      // Calculate Stats
      const stats = {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        total: records.length,
        percentage: 0,
        halfLeaves: hlRecords.length,
      };

      records.forEach((r: any) => {
        if (r.status === 'present') stats.present++;
        else if (r.status === 'absent') stats.absent++;
        else if (r.status === 'late') stats.late++;
        else if (r.status === 'leave') stats.leave++;
      });

      if (stats.total > 0) {
        // (Present + Late + Leave) / Total is standard
        const activeDays = stats.present + stats.late + stats.leave;
        stats.percentage = Math.round((activeDays / stats.total) * 100);
      }

      const result = {
        records,
        halfLeaves: hlRecords,
        stats,
      };
      setCache(cacheKey, result);
      return result;
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch attendance data');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Fetch Fee Challans and Individual Invoices
  const getFeeData = useCallback(async (studentId: number, schoolId: number) => {
    const cacheKey = `fees_${studentId}_${schoolId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    setLoading(true);
    setError(null);
    try {
      // Fetch all challans
      const { data: challans, error: feeError } = await supabase
        .from('fee_challans')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('challan_date', { ascending: false });

      if (feeError) throw feeError;

      const result = challans || [];
      setCache(cacheKey, result);
      return result;
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch fee data');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Challan Details (Items)
  const getChallanDetails = useCallback(async (challanId: number, schoolId: number) => {
    setLoading(true);
    try {
      const { data: items, error: itemError } = await supabase
        .from('fee_challans_items')
        .select(`
          *,
          fee_heads:fee_head_id (
            id,
            name
          )
        `)
        .eq('challan_id', challanId)
        .eq('school_id', schoolId);

      if (itemError) throw itemError;

      return items || [];
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Fetch Academics Data: Subjects, Timetable, Class Tests & Examination results
  const getAcademicsData = useCallback(async (studentId: number, schoolId: number, classId: number | null, sectionId: number | null) => {
    const cacheKey = `academics_v2_${studentId}_${schoolId}_${classId}_${sectionId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    setLoading(true);
    setError(null);
    try {
      // Fetch all school subjects linked to student's class
      let subjects: any[] = [];
      if (classId) {
        // In some schools subjects are linked directly or queried by class_id.
        // Let's check how they are configured in the class.
        // Usually there is a class_subjects join table, or teacher_subject_assignments, or we query all subjects.
        // For simplicity, let's load all subjects for this school.
        const { data: subjData } = await supabase
          .from('subjects')
          .select('*')
          .eq('school_id', schoolId)
          .order('name');
        
        subjects = subjData || [];
      }

      // Fetch Time Table records
      let timetable: any[] = [];
      if (classId) {
        let timetableQuery = supabase
          .from('timetable_records')
          .select('*')
          .eq('class_id', classId)
          .eq('school_id', schoolId);

        if (sectionId) {
          timetableQuery = timetableQuery.eq('section_id', sectionId);
        }

        const { data: ttData } = await timetableQuery;
        timetable = ttData || [];
      }

      // Fetch Class Test Results (from test_results join test_records)
      const { data: testResults } = await supabase
        .from('test_results')
        .select(`
          id,
          obtained_marks,
          max_marks,
          percentage,
          grade,
          test_records!inner(
            id,
            name,
            test_date,
            subject_id
          )
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      // Fetch Examination Summaries (Term Exams)
      const { data: examSummaries } = await supabase
        .from('examination_summaries')
        .select(`
          examination_id,
          total_marks,
          obtained_marks,
          percentage,
          grade,
          status,
          examinations!inner(
            id,
            name,
            exam_type,
            status
          )
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('examination_id', { ascending: false });

      // Fetch Exam Results for detailed subjects
      const { data: examResults, error: examResultsError } = await supabase
        .from('exam_results')
        .select(`
          id,
          exam_id,
          subject_id,
          total_marks,
          obtained_marks,
          percentage,
          grade,
          status,
          subject:subjects(name)
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId);
        
      if (examResultsError) {
        console.error("Error fetching exam results:", examResultsError);
      }

      // Attach subjects to their respective exam summaries
      const summariesWithSubjects = (examSummaries || []).map((summary: any) => ({
        ...summary,
        subjects: (examResults || [])
          .filter((res: any) => Number(res.exam_id) === Number(summary.examination_id))
          .map((res: any) => ({
            id: res.id,
            name: Array.isArray(res.subject) ? res.subject[0]?.name : res.subject?.name || 'Subject',
            total_marks: res.total_marks,
            obtained_marks: res.obtained_marks,
            percentage: res.percentage,
            grade: res.grade,
            status: res.status,
          }))
      }));

      console.log("Fetched exam summaries:", examSummaries);
      console.log("Fetched exam results:", examResults);
      console.log("Combined summaries:", summariesWithSubjects);

      const result = {
        subjects,
        timetable,
        testResults: testResults || [],
        examSummaries: summariesWithSubjects,
      };
      setCache(cacheKey, result);
      return result;
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch academics data');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 5. Fetch and Submit Feedback
  const getFeedbackHistory = useCallback(async (studentId: number, schoolId: number) => {
    const cacheKey = `feedback_${studentId}_${schoolId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    setLoading(true);
    setError(null);
    try {
      const { data: complaintsData } = await supabase
        .from('complaints')
        .select('*')
        .eq('submitted_by', 'student')
        .eq('submitted_by_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      const { data: suggestionsData } = await supabase
        .from('suggestions')
        .select('*')
        .eq('submitted_by', 'student')
        .eq('submitted_by_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      const items = [
        ...(complaintsData || []).map((c: any) => ({ ...c, type: 'Complaint' })),
        ...(suggestionsData || []).map((s: any) => ({ ...s, type: 'Suggestion' })),
      ];

      // Sort by created_at descending
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setCache(cacheKey, items);
      return items;
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch feedback history');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const sendFeedback = useCallback(async (
    studentId: number,
    studentName: string,
    schoolId: number,
    type: 'Complaint' | 'Suggestion',
    subject: string,
    messageText: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const table = type === 'Complaint' ? 'complaints' : 'suggestions';
      const textColumn = type === 'Complaint' ? 'complaint_text' : 'suggestion_text';

      const payload = {
        school_id: schoolId,
        submitted_by: 'student',
        submitted_by_id: studentId,
        submitted_by_name: studentName,
        subject: subject,
        [textColumn]: messageText,
        status: 'in_review',
        is_read: false,
      };

      const { data, error: insertError } = await supabase
        .from(table)
        .insert([payload])
        .select();

      if (insertError) throw insertError;

      // Clear feedback cache so next fetch gets fresh data
      clearCache(`feedback_${studentId}_${schoolId}`);

      return data;
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to submit feedback');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getDashboardData,
    getAttendanceData,
    getFeeData,
    getChallanDetails,
    getAcademicsData,
    getFeedbackHistory,
    sendFeedback,
  };
};
