import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { useToast } from '../hooks/useToast';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Award,
  Calendar,
  CheckCircle2,
  FileDown,
  Save,
  Trash2,
  Search,
  BookOpen,
  GraduationCap,
  Users,
  Percent,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { TeacherLoader } from './TeacherLoader';
import { StudentAvatar, sanitizeAvatarUrl } from './StudentAvatar';
import './ExamMarksManager.css';

interface PublishedExam {
  id: number;
  name: string;
  exam_type: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  session_id: number;
  school_id: number;
  passing_marks: number;
}

interface LinkedSubjectAllocation {
  class_id: number;
  class_name: string;
  has_sections?: boolean;
  section_id: number | null;
  section_name: string | null;
  subject_id: number;
  subject_name: string;
  max_marks: number;
}

interface ExamStudentRow {
  student_id: number;
  student_name: string;
  roll_number: string | null;
  father_name: string | null;
  picture_url: string | null;
  gender: string | null;
  // Mark sheet state
  result_id?: number | null;
  obtained_marks: number | 'A' | '';
  is_absent: boolean;
  percentage: number;
  grade: string;
  is_passed: boolean;
  remarks: string;
  is_selected: boolean;
  has_error?: boolean;
}

export const ExamMarksManager: React.FC<{
  onSwitchToTests?: () => void;
}> = ({ onSwitchToTests }) => {
  const { teacher } = useTeacherAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<number>(6);
  const [sessionName, setSessionName] = useState<string>('Academic Session');

  // Published exams
  const [publishedExams, setPublishedExams] = useState<PublishedExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  // Teacher's linked allocations (Class + Section + Subject)
  const [allocations, setAllocations] = useState<LinkedSubjectAllocation[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // Student rows
  const [students, setStudents] = useState<ExamStudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedStudentIndex, setFocusedStudentIndex] = useState<number | null>(null);

  // Saving / Deleting states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const mainTableRef = useRef<HTMLDivElement>(null);

  // Helper to calculate Grade
  const calculateGrade = useCallback((marks: number, max: number): { grade: string; isPassed: boolean } => {
    if (max <= 0) return { grade: 'F', isPassed: false };
    const pct = Math.round((marks / max) * 100);
    const passThreshold = 33; // Standard school passing marks %
    const isPassed = pct >= passThreshold;

    let grade = 'F';
    if (pct >= 85) grade = 'A+';
    else if (pct >= 75) grade = 'A';
    else if (pct >= 65) grade = 'B';
    else if (pct >= 50) grade = 'C';
    else if (pct >= 40) grade = 'D';
    else grade = 'F';

    return { grade, isPassed };
  }, []);

  // Show status feedback helper (routed to global Toast)
  const showFeedback = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    showToast(text, type);
  }, [showToast]);

  // 1. Fetch Lookups, Published Exams, and Teacher's Linked Subjects
  const fetchExamLookups = useCallback(async () => {
    if (!teacher) return;
    setLoading(true);

    try {
      const schoolId = teacher.school_id || 2;

      // Active Session
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();

      if (sessionData) {
        setActiveSessionId(sessionData.id);
        setSessionName(sessionData.name);
      }

      // Published Examinations
      const { data: examsData, error: examErr } = await supabase
        .from('examinations')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'published')
        .order('id', { ascending: false });

      if (examErr) throw examErr;

      setPublishedExams(examsData || []);
      if (examsData && examsData.length > 0) {
        setSelectedExamId(examsData[0].id);
      }

      // Fetch teacher's linked subject allocations from teacher_class_subjects
      const { data: tcsData } = await supabase
        .from('teacher_class_subjects')
        .select(`
          id,
          section_id,
          class_subject_id,
          class_subjects (
            id,
            class_id,
            subject_id,
            total_marks,
            classes:class_id (id, name, has_sections),
            subjects:subject_id (id, name, code)
          )
        `)
        .eq('teacher_id', teacher.id)
        .eq('school_id', schoolId);

      // Also check timetable slots for this teacher
      const { data: ttData } = await supabase
        .from('timetable')
        .select(`
          class_id,
          section_id,
          subject_id,
          classes:class_id (id, name, has_sections),
          subjects:subject_id (id, name, code)
        `)
        .eq('teacher_id', teacher.id)
        .eq('school_id', schoolId);

      // Fetch all sections to resolve section names cleanly
      const { data: secsData } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .eq('school_id', schoolId);

      const resolvedAllocations: LinkedSubjectAllocation[] = [];
      const seenKey = new Set<string>();

      // 1. Map from teacher_class_subjects
      (tcsData || []).forEach((item: any) => {
        const cs = item.class_subjects;
        if (!cs) return;

        const classObj = cs.classes;
        const subjObj = cs.subjects;
        const classId = cs.class_id;
        const subjectId = cs.subject_id;
        const sectionId = item.section_id || null;

        const key = `${classId}-${sectionId ?? 'all'}-${subjectId}`;
        if (!seenKey.has(key)) {
          seenKey.add(key);

          const secObj = secsData?.find((s: any) => s.id === sectionId);
          resolvedAllocations.push({
            class_id: classId,
            class_name: classObj?.name ? `Class ${classObj.name}` : `Class ${classId}`,
            has_sections: classObj?.has_sections ?? true,
            section_id: sectionId,
            section_name: secObj?.name ? `Section ${secObj.name}` : (sectionId ? `Sec ${sectionId}` : null),
            subject_id: subjectId,
            subject_name: subjObj?.name || 'Subject',
            max_marks: cs.total_marks || 100,
          });
        }
      });

      // 2. Supplement from timetable
      (ttData || []).forEach((slot: any) => {
        const classId = slot.class_id;
        const subjectId = slot.subject_id;
        const sectionId = slot.section_id || null;
        if (!classId || !subjectId) return;

        const key = `${classId}-${sectionId ?? 'all'}-${subjectId}`;
        if (!seenKey.has(key)) {
          seenKey.add(key);

          const secObj = secsData?.find((s: any) => s.id === sectionId);
          resolvedAllocations.push({
            class_id: classId,
            class_name: slot.classes?.name ? `Class ${slot.classes.name}` : `Class ${classId}`,
            has_sections: slot.classes?.has_sections ?? true,
            section_id: sectionId,
            section_name: secObj?.name ? `Section ${secObj.name}` : (sectionId ? `Sec ${sectionId}` : null),
            subject_id: subjectId,
            subject_name: slot.subjects?.name || 'Subject',
            max_marks: 100,
          });
        }
      });

      setAllocations(resolvedAllocations);

      // Pre-select first class, section, subject if allocations exist
      if (resolvedAllocations.length > 0) {
        const first = resolvedAllocations[0];
        setSelectedClassId(first.class_id);
        setSelectedSectionId(first.section_id);
        setSelectedSubjectId(first.subject_id);
      }
    } catch (err) {
      console.error('Error fetching exam lookups:', err);
    } finally {
      setLoading(false);
    }
  }, [teacher]);

  useEffect(() => {
    fetchExamLookups();
  }, [fetchExamLookups]);

  // Distinct classes linked to teacher
  const uniqueClasses = useMemo(() => {
    const map = new Map<number, string>();
    allocations.forEach((a) => {
      if (!map.has(a.class_id)) {
        map.set(a.class_id, a.class_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allocations]);

  // Distinct sections for selected class
  const availableSections = useMemo(() => {
    if (!selectedClassId) return [];
    const secMap = new Map<number | 'none', { id: number | null; name: string }>();

    allocations
      .filter((a) => a.class_id === selectedClassId)
      .forEach((a) => {
        if (a.section_id) {
          if (!secMap.has(a.section_id)) {
            secMap.set(a.section_id, {
              id: a.section_id,
              name: a.section_name || `Section ${a.section_id}`,
            });
          }
        } else {
          if (!secMap.has('none')) {
            secMap.set('none', { id: null, name: 'All / Combined' });
          }
        }
      });

    return Array.from(secMap.values());
  }, [allocations, selectedClassId]);

  // Distinct subjects for selected class & section
  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];

    const filtered = allocations.filter((a) => {
      const matchClass = a.class_id === selectedClassId;
      const matchSection = selectedSectionId === null || a.section_id === null || a.section_id === selectedSectionId;
      return matchClass && matchSection;
    });

    // Deduplicate by subject_id so each subject only appears once
    const subMap = new Map<number, LinkedSubjectAllocation>();
    filtered.forEach((item) => {
      if (!subMap.has(item.subject_id)) {
        subMap.set(item.subject_id, item);
      }
    });

    return Array.from(subMap.values());
  }, [allocations, selectedClassId, selectedSectionId]);

  // Active selected allocation
  const activeAllocation = useMemo(() => {
    return availableSubjects.find((s) => s.subject_id === selectedSubjectId) || availableSubjects[0] || null;
  }, [availableSubjects, selectedSubjectId]);

  // Active selected exam
  const activeExam = useMemo(() => {
    return publishedExams.find((e) => e.id === selectedExamId) || publishedExams[0] || null;
  }, [publishedExams, selectedExamId]);

  // 2. Fetch Students & Existing Exam Results
  const loadExamStudentsAndMarks = useCallback(async () => {
    if (!teacher || !selectedExamId || !selectedClassId || !selectedSubjectId) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);

    try {
      const schoolId = teacher.school_id || 2;
      const maxMarks = activeAllocation?.max_marks || 100;

      // 1. Fetch enrolled students
      let studentQuery = supabase
        .from('students')
        .select('id, name, roll_number, father_name, picture_url, gender, status')
        .eq('school_id', schoolId)
        .eq('class_id', selectedClassId);

      if (selectedSectionId) {
        studentQuery = studentQuery.eq('section_id', selectedSectionId);
      }

      const { data: studentsData } = await studentQuery.order('id', { ascending: true });

      const activeList = (studentsData || []).filter(
        (st: any) => !st.status || st.status.toLowerCase() === 'active'
      );
      const studentRoster = activeList.length > 0 ? activeList : studentsData || [];

      // Sort naturally by Roll Number
      studentRoster.sort((a: any, b: any) => {
        if (a.roll_number && b.roll_number) {
          return a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true });
        }
        if (a.roll_number) return -1;
        if (b.roll_number) return 1;
        return a.id - b.id;
      });

      // 2. Fetch existing exam results from exam_results table
      let marksQuery = supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', selectedExamId)
        .eq('class_id', selectedClassId)
        .eq('subject_id', selectedSubjectId)
        .eq('school_id', schoolId);

      if (selectedSectionId) {
        marksQuery = marksQuery.eq('section_id', selectedSectionId);
      }

      const { data: resultsData } = await marksQuery;

      const marksMap = new Map<number, any>();
      (resultsData || []).forEach((r: any) => {
        marksMap.set(r.student_id, r);
      });

      // 3. Assemble spreadsheet rows
      const rows: ExamStudentRow[] = studentRoster.map((st: any) => {
        const existing = marksMap.get(st.id);
        const isAbsent = existing?.remarks?.toLowerCase().includes('absent') || false;

        let obtained: number | 'A' | '' = '';
        if (isAbsent) {
          obtained = 'A';
        } else if (existing && typeof existing.obtained_marks === 'number') {
          obtained = existing.obtained_marks;
        }

        let percentage = 0;
        let grade = 'F';
        let isPassed = false;

        if (typeof obtained === 'number' && maxMarks > 0) {
          percentage = Math.round((obtained / maxMarks) * 100);
          const computed = calculateGrade(obtained, maxMarks);
          grade = computed.grade;
          isPassed = computed.isPassed;
        }

        const hasMarksOrAbsent = isAbsent || (existing && typeof existing.obtained_marks === 'number');

        return {
          student_id: st.id,
          student_name: st.name,
          roll_number: st.roll_number,
          father_name: st.father_name,
          picture_url: sanitizeAvatarUrl(st.picture_url),
          gender: st.gender,
          result_id: existing?.id || null,
          obtained_marks: obtained,
          is_absent: isAbsent,
          percentage,
          grade,
          is_passed: isPassed,
          remarks: existing?.remarks || '',
          is_selected: hasMarksOrAbsent,
          has_error: false,
        };
      });

      setStudents(rows);
    } catch (err) {
      console.error('Error loading exam marks:', err);
      showFeedback('Failed to load student exam roster.', 'error');
    } finally {
      setLoadingStudents(false);
    }
  }, [
    teacher,
    selectedExamId,
    selectedClassId,
    selectedSectionId,
    selectedSubjectId,
    activeAllocation,
    calculateGrade,
    showFeedback,
  ]);

  useEffect(() => {
    if (selectedExamId && selectedClassId && selectedSubjectId) {
      loadExamStudentsAndMarks();
    }
  }, [selectedExamId, selectedClassId, selectedSectionId, selectedSubjectId, loadExamStudentsAndMarks]);

  // Handle Marks Input change with Max Marks validation
  const handleMarksInputChange = (studentId: number, val: string) => {
    const maxMarks = activeAllocation?.max_marks || 100;

    setStudents((prev) =>
      prev.map((row) => {
        if (row.student_id !== studentId) return row;

        const trimmed = val.trim();

        // 1. Check for Absent 'A' or 'a'
        if (trimmed.toUpperCase() === 'A') {
          return {
            ...row,
            obtained_marks: 'A',
            is_absent: true,
            percentage: 0,
            grade: 'F',
            is_passed: false,
            has_error: false,
            remarks: row.remarks || 'Absent',
            is_selected: true,
          };
        }

        // 2. Empty input
        if (trimmed === '') {
          return {
            ...row,
            obtained_marks: '',
            is_absent: false,
            percentage: 0,
            grade: 'F',
            is_passed: false,
            has_error: false,
            is_selected: false,
          };
        }

        // 3. Numeric input
        const num = Number(trimmed);
        if (isNaN(num)) {
          return row; // Ignore invalid non-numeric chars
        }

        // Check if marks exceed maximum
        if (num > maxMarks) {
          showFeedback(`Marks cannot exceed maximum of ${maxMarks}`, 'error');
          return {
            ...row,
            has_error: true,
          };
        }

        const pct = Math.round((num / maxMarks) * 100);
        const { grade, isPassed } = calculateGrade(num, maxMarks);

        return {
          ...row,
          obtained_marks: num,
          is_absent: false,
          percentage: pct,
          grade,
          is_passed: isPassed,
          has_error: false,
          remarks: row.remarks === 'Absent' ? '' : row.remarks,
          is_selected: true,
        };
      })
    );
  };

  // Keyboard navigation on input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, studentId: number) => {
    // Press 'A' or 'a' to mark absent
    if (e.key === 'A' || e.key === 'a') {
      e.preventDefault();
      handleMarksInputChange(studentId, 'A');
      return;
    }

    // Enter moves to next student
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < students.length) {
        const nextInput = document.querySelector(
          `input[data-exam-student-index="${nextIndex}"]`
        ) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          setTimeout(() => nextInput.select(), 0);
          nextInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }

    // Tab navigation
    if (e.key === 'Tab') {
      const nextIndex = e.shiftKey ? index - 1 : index + 1;
      if (nextIndex >= 0 && nextIndex < students.length) {
        const targetInput = document.querySelector(
          `input[data-exam-student-index="${nextIndex}"]`
        ) as HTMLInputElement;
        if (targetInput) {
          targetInput.focus();
          targetInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  // Mark currently focused or selected students as Absent
  const handleMarkAbsent = () => {
    setStudents((prev) =>
      prev.map((row, idx) => {
        const isTarget = row.is_selected || idx === focusedStudentIndex;
        if (isTarget) {
          return {
            ...row,
            obtained_marks: 'A',
            is_absent: true,
            percentage: 0,
            grade: 'F',
            is_passed: false,
            remarks: 'Absent',
            is_selected: true,
          };
        }
        return row;
      })
    );
    showFeedback('Marked student(s) as Absent.', 'success');
  };

  // Bulk fill all with full marks
  const handleBulkFillFullMarks = () => {
    const maxMarks = activeAllocation?.max_marks || 100;
    setStudents((prev) =>
      prev.map((row) => ({
        ...row,
        obtained_marks: maxMarks,
        is_absent: false,
        percentage: 100,
        grade: 'A+',
        is_passed: true,
        remarks: row.remarks === 'Absent' ? '' : row.remarks,
        is_selected: true,
      }))
    );
    showFeedback(`Filled all students with full marks (${maxMarks}).`, 'success');
  };

  // Clear all entered marks
  const handleClearAll = () => {
    if (!window.confirm('Clear all entered marks on screen? Unsaved entries will be removed.')) return;
    setStudents((prev) =>
      prev.map((row) => ({
        ...row,
        obtained_marks: '',
        is_absent: false,
        percentage: 0,
        grade: 'F',
        is_passed: false,
        remarks: '',
        is_selected: false,
      }))
    );
  };

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    setStudents((prev) => prev.map((s) => ({ ...s, is_selected: checked })));
  };

  const handleToggleSelectStudent = (studentId: number) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, is_selected: !s.is_selected } : s))
    );
  };

  // Delete marks for selected students from exam_results
  const handleDeleteSelectedMarks = async () => {
    const selectedRows = students.filter((s) => s.is_selected);
    if (selectedRows.length === 0) {
      showFeedback('Please select students with the checkboxes to delete marks.', 'error');
      return;
    }

    if (!window.confirm(`Delete saved examination marks for ${selectedRows.length} selected student(s)?`)) {
      return;
    }

    setDeleting(true);
    try {
      const studentIds = selectedRows.map((s) => s.student_id);

      await supabase
        .from('exam_results')
        .delete()
        .eq('exam_id', selectedExamId)
        .eq('class_id', selectedClassId)
        .eq('subject_id', selectedSubjectId)
        .in('student_id', studentIds);

      setStudents((prev) =>
        prev.map((s) =>
          studentIds.includes(s.student_id)
            ? {
                ...s,
                result_id: null,
                obtained_marks: '',
                is_absent: false,
                percentage: 0,
                grade: 'F',
                is_passed: false,
                remarks: '',
                is_selected: false,
              }
            : s
        )
      );

      showFeedback(`Successfully deleted marks for ${selectedRows.length} student(s).`, 'success');
    } catch (err) {
      console.error('Error deleting marks:', err);
      showFeedback('Failed to delete marks.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Save/Upsert all entered marks into exam_results table
  const handleSaveMarks = async () => {
    if (!teacher || !selectedExamId || !selectedClassId || !selectedSubjectId || !activeAllocation) {
      return;
    }

    setSaving(true);

    try {
      const schoolId = teacher.school_id || 2;
      const maxMarks = activeAllocation.max_marks || 100;
      const sessionId = activeExam?.session_id || activeSessionId;

      // Filter rows that have a mark or are absent
      const marksToSave = students.filter(
        (s) => typeof s.obtained_marks === 'number' || s.is_absent
      );

      if (marksToSave.length === 0) {
        showFeedback('No marks entered to save. Please enter marks first.', 'error');
        setSaving(false);
        return;
      }

      const studentIds = marksToSave.map((s) => s.student_id);

      // 1. Delete existing records for these students in this exam + subject
      let deleteQuery = supabase
        .from('exam_results')
        .delete()
        .eq('exam_id', selectedExamId)
        .eq('class_id', selectedClassId)
        .eq('subject_id', selectedSubjectId)
        .in('student_id', studentIds);

      if (selectedSectionId) {
        deleteQuery = deleteQuery.eq('section_id', selectedSectionId);
      }

      await deleteQuery;

      // 2. Prepare payload (omitting 'percentage' since it is a PostgreSQL generated column)
      const payloads = marksToSave.map((row) => ({
        exam_id: selectedExamId,
        subject_id: selectedSubjectId,
        student_id: row.student_id,
        class_id: selectedClassId,
        section_id: selectedSectionId || null,
        session_id: sessionId,
        school_id: schoolId,
        obtained_marks: row.is_absent ? 0 : (row.obtained_marks as number),
        max_marks: maxMarks,
        grade: row.is_absent ? 'F' : row.grade,
        remarks: row.is_absent ? 'Absent' : (row.remarks || null),
        entered_by: teacher.user_id || teacher.id,
        entered_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // 3. Upsert records on unique constraint (exam_id, student_id, subject_id, school_id)
      const { error: insErr } = await supabase.from('exam_results').upsert(payloads, {
        onConflict: 'exam_id,student_id,subject_id,school_id',
      });
      if (insErr) throw insErr;

      showFeedback(`Saved examination marks for ${payloads.length} students successfully!`, 'success');
      await loadExamStudentsAndMarks();
    } catch (err: any) {
      console.error('Error saving exam marks:', err);
      showFeedback(`Failed to save marks: ${err.message || 'Database error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export Official PDF Marks Sheet Report
  const handleExportPDF = async () => {
    if (!activeExam || !activeAllocation || students.length === 0) return;
    setExportingPdf(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const schoolName = 'Al Haram Public School and Iqra Academy';
      const teacherName = teacher?.name || 'Faculty Member';
      const examTitle = activeExam.name;
      const className = activeAllocation.class_name;
      const sectionName = activeAllocation.section_name || 'All Sections';
      const subjectName = activeAllocation.subject_name;
      const maxMarks = activeAllocation.max_marks;
      const passMarks = activeExam.passing_marks || 33;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(schoolName, 14, 16);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Official Examination Mark Sheet · ${sessionName}`, 14, 23);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${examTitle}`, doc.internal.pageSize.getWidth() - 14, 16, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.text(
        `${className} (${sectionName}) · ${subjectName} | Max: ${maxMarks} | Passing: ${passMarks}`,
        doc.internal.pageSize.getWidth() - 14,
        23,
        { align: 'right' }
      );

      // Table Data
      const headers = [
        '#',
        'Roll No',
        'Student Name',
        "Father's Name",
        `Obtained Marks (/ ${maxMarks})`,
        'Percentage',
        'Grade',
        'Status',
        'Teacher Remarks',
      ];

      const tableData = students.map((s, idx) => {
        const marksStr = s.is_absent ? 'ABSENT' : typeof s.obtained_marks === 'number' ? s.obtained_marks.toString() : '—';
        const pctStr = typeof s.obtained_marks === 'number' ? `${s.percentage}%` : '—';
        const statusStr = s.is_absent ? 'ABSENT' : s.is_passed ? 'PASS' : 'FAIL';

        return [
          (idx + 1).toString(),
          s.roll_number || s.student_id.toString(),
          s.student_name,
          s.father_name || '—',
          marksStr,
          pctStr,
          s.grade,
          statusStr,
          s.remarks || '—',
        ];
      });

      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 30,
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'center',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 20 },
          2: { cellWidth: 42, halign: 'left' },
          3: { cellWidth: 38, halign: 'left' },
          4: { cellWidth: 28 },
          5: { cellWidth: 24 },
          6: { cellWidth: 16 },
          7: { cellWidth: 22 },
          8: { cellWidth: 45, halign: 'left' },
        },
        didParseCell: function (data: any) {
          const val = String(data.cell.raw || '');
          if (val === 'PASS') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'FAIL') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'ABSENT') {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = 'italic';
          }
        },
      });

      // Signatures
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Subject Faculty: _______________________ (${teacherName})`, 14, pageHeight - 12);
        doc.text(`Principal / Examination In-Charge: _______________________`, doc.internal.pageSize.getWidth() - 110, pageHeight - 12);
      }

      doc.save(`${examTitle}_${className}_${subjectName}_MarksSheet.pdf`);
      showFeedback('Official Marks Sheet PDF generated!', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showFeedback('Failed to generate PDF.', 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  // KPI Analytics
  const stats = useMemo(() => {
    const total = students.length;
    let entered = 0;
    let absent = 0;
    let passed = 0;
    let totalMarksSum = 0;
    let highest = 0;

    students.forEach((s) => {
      if (s.is_absent) {
        absent++;
      } else if (typeof s.obtained_marks === 'number') {
        entered++;
        totalMarksSum += s.percentage;
        if (s.obtained_marks > highest) highest = s.obtained_marks;
        if (s.is_passed) passed++;
      }
    });

    const completionRate = total > 0 ? Math.round(((entered + absent) / total) * 100) : 0;
    const avgPercentage = entered > 0 ? Math.round(totalMarksSum / entered) : 0;
    const passRate = entered > 0 ? Math.round((passed / entered) * 100) : 0;

    return {
      total,
      entered,
      absent,
      passed,
      completionRate,
      avgPercentage,
      passRate,
      highest,
    };
  }, [students]);

  // Filtered students for quick search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
        (s.father_name && s.father_name.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  if (loading) {
    return <TeacherLoader message="Loading published examination & linked subjects…" />;
  }

  // If no published examination exists
  if (publishedExams.length === 0) {
    return (
      <div className="exam-empty-card glass-panel">
        <div className="exam-empty-icon">
          <Calendar size={28} />
        </div>
        <h3 className="exam-empty-title">No Published Examinations Available</h3>
        <p className="exam-empty-desc">
          There are currently no active examinations published by the school administration. When the
          administration publishes a term examination (e.g. First Term, Mid Term, or Final Term), your
          linked subjects will automatically appear here for marks entry.
        </p>
        {onSwitchToTests && (
          <button
            type="button"
            className="btn-exam-action btn-exam-save"
            style={{ marginTop: '0.85rem' }}
            onClick={onSwitchToTests}
          >
            <Layers size={15} /> Switch to Class Tests & Quizzes
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="exam-marks-container">
      {/* 1. PUBLISHED EXAMINATION SELECTORS CARD */}
      <div className="exam-selectors-card glass-panel">
        <div className="exam-banner-top">
          <div className="exam-badge-cluster">
            <span className="exam-live-status-pill">
              <span className="exam-status-dot"></span> Published Exam Available
            </span>
            <span className="exam-session-chip">
              <Calendar size={13} /> {sessionName}
            </span>
            <span className="exam-session-chip" style={{ color: '#10b981', fontWeight: 700 }}>
              <CheckCircle2 size={13} /> Marks Entry Open
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Faculty: <strong>{teacher?.name}</strong> · Passing: {activeExam?.passing_marks || 33}%
          </div>
        </div>

        {/* Form Selection Row */}
        <div className="exam-selectors-grid">
          {/* Examination */}
          <div className="exam-selector-field">
            <label className="exam-selector-label" htmlFor="exam-select">
              <Award size={13} /> Examination:
            </label>
            <select
              id="exam-select"
              className="exam-select-input"
              value={selectedExamId || ''}
              onChange={(e) => setSelectedExamId(Number(e.target.value))}
            >
              {publishedExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.exam_type})
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div className="exam-selector-field">
            <label className="exam-selector-label" htmlFor="class-select">
              <GraduationCap size={13} /> Linked Class:
            </label>
            <select
              id="class-select"
              className="exam-select-input"
              value={selectedClassId || ''}
              onChange={(e) => {
                const cId = Number(e.target.value);
                setSelectedClassId(cId);
                // Reset section & subject to match first allocation of this class
                const firstAlloc = allocations.find((a) => a.class_id === cId);
                if (firstAlloc) {
                  setSelectedSectionId(firstAlloc.section_id);
                  setSelectedSubjectId(firstAlloc.subject_id);
                }
              }}
            >
              {uniqueClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="exam-selector-field">
            <label className="exam-selector-label" htmlFor="section-select">
              <Users size={13} /> Section:
            </label>
            <select
              id="section-select"
              className="exam-select-input"
              value={selectedSectionId ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                setSelectedSectionId(val);
                // Adjust subject
                const firstSub = allocations.find(
                  (a) => a.class_id === selectedClassId && (val === null || a.section_id === val)
                );
                if (firstSub) setSelectedSubjectId(firstSub.subject_id);
              }}
            >
              {availableSections.map((sec, idx) => (
                <option key={sec.id ?? `sec-${idx}`} value={sec.id ?? ''}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="exam-selector-field">
            <label className="exam-selector-label" htmlFor="subject-select">
              <BookOpen size={13} /> Linked Subject:
            </label>
            <select
              id="subject-select"
              className="exam-select-input"
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
            >
              {availableSubjects.map((sub, idx) => (
                <option key={`${sub.subject_id}-${idx}`} value={sub.subject_id}>
                  {sub.subject_name} (Max: {sub.max_marks})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. KPI RIBBON */}
      <div className="exam-kpi-grid no-print">
        <div className="exam-kpi-card">
          <div className="exam-kpi-icon blue">
            <Users size={20} />
          </div>
          <div className="exam-kpi-content">
            <span className="exam-kpi-label">Total Enrolled</span>
            <span className="exam-kpi-value">{stats.total}</span>
            <span className="exam-kpi-sub">In selected section</span>
          </div>
        </div>

        <div className="exam-kpi-card">
          <div className="exam-kpi-icon emerald">
            <CheckCircle2 size={20} />
          </div>
          <div className="exam-kpi-content">
            <span className="exam-kpi-label">Marks Entered</span>
            <span className="exam-kpi-value text-emerald">
              {stats.entered} / {stats.total}
            </span>
            <span className="exam-kpi-sub">{stats.completionRate}% completed</span>
          </div>
        </div>

        <div className="exam-kpi-card">
          <div className="exam-kpi-icon amber">
            <Percent size={20} />
          </div>
          <div className="exam-kpi-content">
            <span className="exam-kpi-label">Class Average</span>
            <span className="exam-kpi-value" style={{ color: '#f59e0b' }}>
              {stats.avgPercentage}%
            </span>
            <span className="exam-kpi-sub">Pass rate: {stats.passRate}%</span>
          </div>
        </div>

        <div className="exam-kpi-card">
          <div className="exam-kpi-icon purple">
            <Sparkles size={20} />
          </div>
          <div className="exam-kpi-content">
            <span className="exam-kpi-label">Highest Score</span>
            <span className="exam-kpi-value" style={{ color: '#a855f7' }}>
              {stats.highest} / {activeAllocation?.max_marks || 100}
            </span>
            <span className="exam-kpi-sub">{stats.absent} marked absent</span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR CONTROLS */}
      <div className="exam-toolbar glass-panel no-print">
        <div className="exam-toolbar-left">
          <div className="exam-search-box">
            <Search size={15} className="exam-search-icon" />
            <input
              type="text"
              placeholder="Search student or roll no…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search student roster"
            />
          </div>

          <button
            type="button"
            className="btn-exam-action btn-exam-absent"
            onClick={handleMarkAbsent}
            title="Mark currently focused or selected student as Absent (or press 'A' on keyboard)"
          >
            <span>Mark 'A' (Absent)</span>
          </button>

          <button
            type="button"
            className="btn-exam-action btn-exam-fill"
            onClick={handleBulkFillFullMarks}
            title="Fill all students with maximum marks"
          >
            <span>Full Marks (All)</span>
          </button>

          <button
            type="button"
            className="btn-exam-action btn-exam-fill"
            onClick={handleClearAll}
            title="Clear marks on screen"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

        <div className="exam-toolbar-actions">
          <button
            type="button"
            className="btn-exam-action btn-exam-pdf"
            onClick={handleExportPDF}
            disabled={exportingPdf || students.length === 0}
            title="Export official printable PDF Marks Sheet"
          >
            <FileDown size={15} />
            <span>{exportingPdf ? 'Exporting…' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            className="btn-exam-action btn-exam-delete"
            onClick={handleDeleteSelectedMarks}
            disabled={deleting || !students.some((s) => s.is_selected)}
            title="Delete saved marks for checked students"
          >
            <Trash2 size={15} />
            <span>{deleting ? 'Deleting…' : 'Delete Marks'}</span>
          </button>

          <button
            type="button"
            className="btn-exam-action btn-exam-save"
            onClick={handleSaveMarks}
            disabled={saving || students.length === 0}
            title="Save and synchronize marks to official exam records"
          >
            <Save size={15} />
            <span>{saving ? 'Saving…' : 'Save Marks'}</span>
          </button>
        </div>
      </div>

      {/* 4. MARKS SHEET SPREADSHEET GRID */}
      <div className="exam-table-card glass-panel" ref={mainTableRef}>
        {loadingStudents ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <TeacherLoader message="Loading student roster and existing exam scores…" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="exam-empty-card" style={{ boxShadow: 'none', border: 'none' }}>
            <Users size={36} style={{ opacity: 0.5 }} />
            <h3 className="exam-empty-title">No Students Found</h3>
            <p className="exam-empty-desc">
              {searchQuery
                ? 'No students matching your search criteria.'
                : 'No active students enrolled in this class/section.'}
            </p>
          </div>
        ) : (
          <div className="exam-table-wrap">
            <table className="exam-marksheet-table" aria-label="Official Examination Marksheet">
              <thead>
                <tr>
                  <th style={{ width: '56px' }} className="center">
                    <label
                      className={`exam-serial-checkbox header ${
                        students.length > 0 && students.every((s) => s.is_selected) ? 'checked' : ''
                      }`}
                      title="Select / Deselect All"
                    >
                      <input
                        type="checkbox"
                        checked={students.length > 0 && students.every((s) => s.is_selected)}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className="exam-serial-checkbox-input"
                      />
                      <span className="exam-serial-checkbox-inner">
                        {students.length > 0 && students.every((s) => s.is_selected) ? (
                          <Check size={12} strokeWidth={3.2} />
                        ) : (
                          '#'
                        )}
                      </span>
                    </label>
                  </th>
                  <th style={{ width: '85px' }}>Roll No</th>
                  <th>Student Name & Details</th>
                  <th className="center" style={{ width: '130px' }}>
                    Obtained (/ {activeAllocation?.max_marks || 100})
                  </th>
                  <th className="center" style={{ width: '85px' }}>%</th>
                  <th className="center" style={{ width: '75px' }}>Grade</th>
                  <th className="center" style={{ width: '95px' }}>Status</th>
                  <th style={{ width: '220px' }}>Faculty Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((row, idx) => {
                  return (
                    <tr
                      key={row.student_id}
                      className={`${row.is_selected ? 'row-selected' : ''} ${
                        focusedStudentIndex === idx ? 'row-focused' : ''
                      }`}
                    >
                      <td className="center">
                        <label
                          className={`exam-serial-checkbox ${row.is_selected ? 'checked' : ''}`}
                          title={
                            row.is_selected
                              ? `Student #${idx + 1} (Marked / Selected - Click to toggle)`
                              : `Student #${idx + 1} (Click to select)`
                          }
                        >
                          <input
                            type="checkbox"
                            checked={row.is_selected}
                            onChange={() => handleToggleSelectStudent(row.student_id)}
                            className="exam-serial-checkbox-input"
                          />
                          <span className="exam-serial-checkbox-inner">
                            {row.is_selected ? (
                              <Check size={12} strokeWidth={3.2} className="check-icon" />
                            ) : (
                              <span className="serial-text">{idx + 1}</span>
                            )}
                          </span>
                        </label>
                      </td>

                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                        {row.roll_number || row.student_id}
                      </td>

                      <td>
                        <div className="exam-student-cell">
                          <StudentAvatar
                            src={row.picture_url}
                            name={row.student_name}
                            gender={row.gender}
                            size={34}
                          />
                          <div className="exam-student-details">
                            <span className="exam-student-name">{row.student_name}</span>
                            <span className="exam-student-sub">
                              S/D of {row.father_name || 'Father'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="center">
                        <div className="exam-marks-input-wrapper">
                          <input
                            type="text"
                            data-exam-student-index={idx}
                            className={`exam-marks-input ${row.is_absent ? 'is-absent' : ''} ${
                              row.has_error ? 'is-error' : ''
                            }`}
                            placeholder="—"
                            value={row.is_absent ? 'A' : row.obtained_marks}
                            onChange={(e) => handleMarksInputChange(row.student_id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, row.student_id)}
                            onFocus={() => setFocusedStudentIndex(idx)}
                            aria-label={`Marks for ${row.student_name}`}
                          />
                        </div>
                      </td>

                      <td className="center" style={{ fontWeight: 800 }}>
                        {typeof row.obtained_marks === 'number' ? `${row.percentage}%` : '—'}
                      </td>

                      <td className="center">
                        <span
                          style={{
                            fontWeight: 800,
                            color:
                              row.grade === 'A+' || row.grade === 'A'
                                ? '#10b981'
                                : row.grade === 'F'
                                ? '#ef4444'
                                : '#3b82f6',
                          }}
                        >
                          {row.is_absent ? 'F' : typeof row.obtained_marks === 'number' ? row.grade : '—'}
                        </span>
                      </td>

                      <td className="center">
                        {row.is_absent ? (
                          <span className="exam-badge-absent">ABSENT</span>
                        ) : typeof row.obtained_marks === 'number' ? (
                          row.is_passed ? (
                            <span className="exam-badge-pass">PASS</span>
                          ) : (
                            <span className="exam-badge-fail">FAIL</span>
                          )
                        ) : (
                          <span className="exam-badge-pending">PENDING</span>
                        )}
                      </td>

                      <td>
                        <input
                          type="text"
                          className="exam-remarks-input"
                          placeholder="Optional remarks…"
                          value={row.remarks || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStudents((prev) =>
                              prev.map((s) => (s.student_id === row.student_id ? { ...s, remarks: val } : s))
                            );
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
