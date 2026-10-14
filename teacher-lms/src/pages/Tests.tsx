import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { useToast } from '../hooks/useToast';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Award,
  Calendar,
  CheckCircle2,
  XCircle,
  FileDown,
  Printer,
  Plus,
  Search,
  Filter,
  BarChart3,
  Layers,
  Sparkles,
  BookOpen,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  GraduationCap,
  Users,
  TrendingUp,
  Percent,
  UserCheck,
} from 'lucide-react';
import type {
  TestRecordItem,
  StudentTestResultRow,
  NewTestPayload,
} from '../types/tests';
import { TeacherLoader } from '../components/TeacherLoader';
import { StudentAvatar, sanitizeAvatarUrl } from '../components/StudentAvatar';
import './Tests.css';

const TEST_TYPES = ['All', 'Test', 'Quiz', 'Assignment', 'Practice', 'Terminal'];

interface TeacherAssignmentSlot {
  class_id: number;
  section_id: number | null;
  subject_id: number;
}

export const Tests: React.FC = () => {
  const { teacher } = useTeacherAuth();
  const { showToast } = useToast();

  // Active view tab for class tests
  const [activeTab, setActiveTab] = useState<'tests' | 'marksheet' | 'analytics'>('tests');

  // Master lookup data
  const [loading, setLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<number>(6);
  const [sessionName, setSessionName] = useState<string>('Academic Session');
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);

  // Teacher Specific Assignments
  const [teacherSlots, setTeacherSlots] = useState<TeacherAssignmentSlot[]>([]);
  const [teacherSectionIds, setTeacherSectionIds] = useState<Set<number>>(new Set());
  const [teacherClassIds, setTeacherClassIds] = useState<Set<number>>(new Set());
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<Set<number>>(new Set());

  // Scope Filter: 'my' (Default: strictly teacher's records) vs 'all' (all school records)
  const [scopeFilter, setScopeFilter] = useState<'my' | 'all'>('my');

  // Tests list state
  const [tests, setTests] = useState<TestRecordItem[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active selected test for Marksheet entry & Analytics
  const [selectedTest, setSelectedTest] = useState<TestRecordItem | null>(null);

  // Marksheet Student Rows
  const [studentRows, setStudentRows] = useState<StudentTestResultRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingResults, setSavingResults] = useState(false);

  // New Test Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [newTest, setNewTest] = useState<NewTestPayload>({
    name: '',
    test_type: 'Test',
    class_id: 1,
    section_id: 1,
    subject_id: 1,
    test_date: new Date().toISOString().split('T')[0],
    max_marks: 20,
    passing_marks: 8,
  });

  // Export PDF State
  const [exportingPdf, setExportingPdf] = useState(false);

  // 1. Fetch Lookups (Classes, Sections, Subjects, Session, Teacher Slots)
  const fetchLookups = useCallback(async () => {
    if (!teacher) return;
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

      // Classes, Sections, Subjects, Timetable Slots
      const [{ data: classesData }, { data: sectionsData }, { data: subjectsData }, { data: ttData }] =
        await Promise.all([
          supabase.from('classes').select('id, name').eq('school_id', schoolId).order('id'),
          supabase.from('sections').select('id, name, class_id, teacher_id').eq('school_id', schoolId),
          supabase.from('subjects').select('id, name').eq('school_id', schoolId).order('name'),
          supabase
            .from('timetable')
            .select('class_id, section_id, subject_id')
            .eq('teacher_id', teacher.id)
            .eq('school_id', schoolId),
        ]);

      if (classesData) setClasses(classesData);
      if (sectionsData) setSections(sectionsData);
      if (subjectsData) setSubjects(subjectsData);

      // Map teacher assignments
      const slots: TeacherAssignmentSlot[] = (ttData || []).map((t: any) => ({
        class_id: t.class_id,
        section_id: t.section_id,
        subject_id: t.subject_id,
      }));
      setTeacherSlots(slots);

      const mySecIds = new Set<number>();
      (sectionsData || []).forEach((sec: any) => {
        if (sec.teacher_id === teacher.id) {
          mySecIds.add(sec.id);
        }
      });
      setTeacherSectionIds(mySecIds);

      const myClassIds = new Set<number>();
      const mySubjIds = new Set<number>();
      slots.forEach((s) => {
        if (s.class_id) myClassIds.add(s.class_id);
        if (s.subject_id) mySubjIds.add(s.subject_id);
      });
      mySecIds.forEach((secId) => {
        const sec = sectionsData?.find((s: any) => s.id === secId);
        if (sec?.class_id) myClassIds.add(sec.class_id);
      });
      setTeacherClassIds(myClassIds);
      setTeacherSubjectIds(mySubjIds);

      // Pre-select teacher's primary class and subject in new test state
      const defaultClassId = Array.from(myClassIds)[0] || classesData?.[0]?.id || 1;
      const defaultSubjId = Array.from(mySubjIds)[0] || subjectsData?.[0]?.id || 1;
      const matchingSec = sectionsData?.find(
        (s: any) => s.class_id === defaultClassId && (mySecIds.has(s.id) || true)
      );

      setNewTest((prev) => ({
        ...prev,
        class_id: defaultClassId,
        section_id: matchingSec?.id || sectionsData?.[0]?.id || 1,
        subject_id: defaultSubjId,
      }));
    } catch (err) {
      console.error('Error fetching lookups:', err);
    }
  }, [teacher]);

  // Helper matcher to test if a record belongs to this teacher
  const isTeacherRecord = useCallback(
    (t: TestRecordItem) => {
      if (!teacher) return true;
      // 1. Created by this teacher (staff id or user id)
      if (t.created_by === teacher.id || (teacher.user_id && t.created_by === teacher.user_id)) {
        return true;
      }
      // 2. Class teacher / Section in-charge
      if (t.section_id && teacherSectionIds.has(t.section_id)) {
        return true;
      }
      // 3. Timetable slot: teacher teaches this class & subject
      const teachesSubject = teacherSlots.some(
        (slot) =>
          slot.class_id === t.class_id &&
          slot.subject_id === t.subject_id &&
          (!slot.section_id || !t.section_id || slot.section_id === t.section_id)
      );
      return teachesSubject;
    },
    [teacher, teacherSectionIds, teacherSlots]
  );

  // 2. Fetch Tests List & Compute Summary Stats
  const fetchTests = useCallback(async () => {
    if (!teacher) return;
    setLoading(true);

    try {
      const schoolId = teacher.school_id || 2;

      const { data: testData, error: testErr } = await supabase
        .from('test_records')
        .select('*')
        .eq('school_id', schoolId)
        .order('id', { ascending: false });

      if (testErr) throw testErr;

      // Map subject, class, and section names
      const mappedTests: TestRecordItem[] = (testData || []).map((t: any) => {
        const c = classes.find((cl) => cl.id === t.class_id);
        const s = sections.find((sec) => sec.id === t.section_id);
        const sub = subjects.find((subj) => subj.id === t.subject_id);

        const isCreatedByTeacher =
          t.created_by === teacher.id ||
          (teacher.user_id && t.created_by === teacher.user_id);

        const isMySec = Boolean(t.section_id && teacherSectionIds.has(t.section_id));

        const isMyTimetableSubject = teacherSlots.some(
          (slot) =>
            slot.class_id === t.class_id &&
            slot.subject_id === t.subject_id &&
            (!slot.section_id || !t.section_id || slot.section_id === t.section_id)
        );

        const isMy = isCreatedByTeacher || isMySec || isMyTimetableSubject;

        return {
          ...t,
          class_name: c?.name ? `Class ${c.name}` : `Class ${t.class_id}`,
          section_name: s?.name ? `Sec ${s.name}` : undefined,
          subject_name: sub?.name || 'Subject',
          is_my_test: Boolean(isMy),
        };
      });

      setTests(mappedTests);
    } catch (err) {
      console.error('Error fetching tests:', err);
    } finally {
      setLoading(false);
    }
  }, [teacher, classes, sections, subjects, teacherSlots, teacherSectionIds]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    if (classes.length > 0) {
      fetchTests();
    }
  }, [classes, sections, subjects, teacherSlots, teacherSectionIds, fetchTests]);

  // 3. Fetch Students & Test Results for the Selected Test
  const loadTestMarksheet = useCallback(async (test: TestRecordItem) => {
    if (!teacher || !test) return;
    setLoadingStudents(true);

    try {
      const schoolId = teacher.school_id || 2;
      const targetSectionId = test.section_id;

      // Fetch students in this section
      let studentQuery = supabase
        .from('students')
        .select('id, name, roll_number, father_name, picture_url, gender, status')
        .eq('school_id', schoolId);

      if (targetSectionId) {
        studentQuery = studentQuery.eq('section_id', targetSectionId);
      } else {
        studentQuery = studentQuery.eq('class_id', test.class_id);
      }

      const { data: studentsData } = await studentQuery.order('id', { ascending: true });

      // Active students roster
      const activeList = (studentsData || []).filter(
        (st: any) => !st.status || st.status.toLowerCase() === 'active'
      );
      const studentRoster = activeList.length > 0 ? activeList : studentsData || [];

      // Sort naturally by roll number
      studentRoster.sort((a: any, b: any) => {
        if (a.roll_number && b.roll_number) {
          return a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true });
        }
        if (a.roll_number) return -1;
        if (b.roll_number) return 1;
        return a.id - b.id;
      });

      // Fetch existing test_results for this test
      const { data: resultsData } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', test.id)
        .eq('school_id', schoolId);

      const resultMap = new Map<number, any>();
      (resultsData || []).forEach((r: any) => {
        resultMap.set(r.student_id, r);
      });

      // Build rows
      const rows: StudentTestResultRow[] = studentRoster.map((st: any) => {
        const existing = resultMap.get(st.id);
        const obtained = existing ? existing.obtained_marks : '';
        const remarks = existing?.remarks || '';
        const isAbsent = remarks?.toLowerCase().includes('absent');

        let percentage = 0;
        let grade = 'F';
        let isPassed = false;

        if (typeof obtained === 'number' && test.max_marks > 0) {
          percentage = Math.round((obtained / test.max_marks) * 100);
          isPassed = obtained >= test.passing_marks;

          if (percentage >= 80) grade = 'A+';
          else if (percentage >= 70) grade = 'A';
          else if (percentage >= 60) grade = 'B';
          else if (percentage >= 50) grade = 'C';
          else if (percentage >= 40) grade = 'D';
          else grade = 'F';
        }

        const hasMarksOrAbsent = isAbsent || typeof obtained === 'number';

        return {
          student_id: st.id,
          student_name: st.name,
          roll_number: st.roll_number || null,
          father_name: st.father_name || null,
          picture_url: sanitizeAvatarUrl(st.picture_url),
          gender: st.gender || null,
          result_id: existing?.id || null,
          obtained_marks: obtained,
          max_marks: test.max_marks,
          percentage,
          grade,
          remarks,
          is_absent: isAbsent,
          is_passed: isPassed,
          is_selected: hasMarksOrAbsent,
        };
      });

      setStudentRows(rows);
    } catch (err) {
      console.error('Error loading marksheet for test:', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [teacher]);

  // Load marksheet whenever selectedTest changes
  useEffect(() => {
    if (selectedTest) {
      loadTestMarksheet(selectedTest);
    }
  }, [selectedTest, loadTestMarksheet]);

  // 4. Update Single Student Obtained Marks
  const handleMarksChange = (studentId: number, valStr: string) => {
    if (!selectedTest) return;

    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.student_id !== studentId) return row;

        if (valStr === '') {
          return {
            ...row,
            obtained_marks: '',
            percentage: 0,
            grade: 'F',
            is_passed: false,
            is_absent: false,
            is_selected: false,
          };
        }

        const numVal = Math.min(Math.max(0, parseFloat(valStr) || 0), selectedTest.max_marks);
        const percentage = Math.round((numVal / selectedTest.max_marks) * 100);
        const isPassed = numVal >= selectedTest.passing_marks;

        let grade = 'F';
        if (percentage >= 80) grade = 'A+';
        else if (percentage >= 70) grade = 'A';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';
        else grade = 'F';

        return {
          ...row,
          obtained_marks: numVal,
          percentage,
          grade,
          is_passed: isPassed,
          is_absent: false,
          is_selected: true,
        };
      })
    );
  };

  // 5. Update Single Student Remarks
  const handleRemarksChange = (studentId: number, remarks: string) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.student_id !== studentId) return row;
        const isAbsent = remarks.toLowerCase().includes('absent');
        return {
          ...row,
          remarks,
          is_absent: isAbsent,
          obtained_marks: isAbsent ? 0 : row.obtained_marks,
          is_selected: isAbsent ? true : row.is_selected,
        };
      })
    );
  };

  // 6. Bulk Marks Actions
  const handleBulkFillFullMarks = () => {
    if (!selectedTest) return;
    setStudentRows((prev) =>
      prev.map((row) => ({
        ...row,
        obtained_marks: selectedTest.max_marks,
        percentage: 100,
        grade: 'A+',
        is_passed: true,
        is_absent: false,
        is_selected: true,
      }))
    );
  };

  const handleBulkClearAll = () => {
    setStudentRows((prev) =>
      prev.map((row) => ({
        ...row,
        obtained_marks: '',
        percentage: 0,
        grade: 'F',
        is_passed: false,
        remarks: '',
        is_absent: false,
        is_selected: false,
      }))
    );
  };

  // 7. Save All Results to Supabase
  const handleSaveMarksheet = async () => {
    if (!selectedTest || !teacher) return;
    setSavingResults(true);

    try {
      const schoolId = teacher.school_id || 2;
      const sessionId = selectedTest.session_id || activeSessionId;

      for (const row of studentRows) {
        if (row.obtained_marks === '' && !row.remarks) {
          // If un-entered, delete previous record if existed
          if (row.result_id) {
            await supabase.from('test_results').delete().eq('id', row.result_id);
          }
          continue;
        }

        const numericMarks = typeof row.obtained_marks === 'number' ? row.obtained_marks : 0;
        const payload: any = {
          test_id: selectedTest.id,
          student_id: row.student_id,
          session_id: sessionId,
          obtained_marks: numericMarks,
          max_marks: selectedTest.max_marks,
          percentage: row.percentage,
          grade: row.grade,
          remarks: row.remarks || null,
          school_id: schoolId,
        };

        if (row.result_id) {
          await supabase.from('test_results').update(payload).eq('id', row.result_id);
        } else {
          const { data: newRec } = await supabase
            .from('test_results')
            .insert(payload)
            .select('id')
            .single();

          if (newRec) {
            row.result_id = newRec.id;
          }
        }
      }

      showToast('Test marks saved and synchronized successfully!', 'success');
    } catch (err) {
      console.error('Error saving marksheet:', err);
      showToast('Failed to save test results. Please try again.', 'error');
    } finally {
      setSavingResults(false);
    }
  };

  // 8. Create New Test Modal Submission
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    setCreatingTest(true);

    try {
      const schoolId = teacher.school_id || 2;

      const payload = {
        name: newTest.name.trim() || 'Class Test',
        test_type: newTest.test_type,
        class_id: newTest.class_id,
        section_id: newTest.section_id,
        subject_id: newTest.subject_id,
        session_id: activeSessionId,
        test_date: newTest.test_date,
        max_marks: Number(newTest.max_marks) || 20,
        passing_marks: Number(newTest.passing_marks) || 8,
        status: 'active',
        school_id: schoolId,
        created_by: teacher.user_id || teacher.id,
      };

      const { data: createdRecord, error: insErr } = await supabase
        .from('test_records')
        .insert(payload)
        .select()
        .single();

      if (insErr) throw insErr;

      // Close modal and refresh tests
      setIsCreateModalOpen(false);
      setNewTest((prev) => ({ ...prev, name: '' }));

      await fetchTests();
      if (createdRecord) {
        const c = classes.find((cl) => cl.id === createdRecord.class_id);
        const s = sections.find((sec) => sec.id === createdRecord.section_id);
        const sub = subjects.find((subj) => subj.id === createdRecord.subject_id);
        setSelectedTest({
          ...(createdRecord as any),
          class_name: c?.name ? `Class ${c.name}` : `Class ${createdRecord.class_id}`,
          section_name: s?.name ? `Sec ${s.name}` : undefined,
          subject_name: sub?.name || 'Subject',
          is_my_test: true,
        });
        setActiveTab('marksheet');
      }
    } catch (err) {
      console.error('Error creating test:', err);
      showToast('Failed to create test record.', 'error');
    } finally {
      setCreatingTest(false);
    }
  };

  // 9. Delete Test
  const handleDeleteTest = async (testId: number) => {
    if (!confirm('Are you sure you want to delete this test and all its results?')) return;

    try {
      await supabase.from('test_results').delete().eq('test_id', testId);
      await supabase.from('test_records').delete().eq('id', testId);

      setTests((prev) => prev.filter((t) => t.id !== testId));
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
      }
    } catch (err) {
      console.error('Error deleting test:', err);
      showToast('Failed to delete test.', 'error');
    }
  };

  // 10. Official Landscape PDF Marksheet Export (jsPDF + autoTable)
  const handleExportPDF = async () => {
    if (!selectedTest || studentRows.length === 0) {
      showToast('No student marks available to export.', 'warning');
      return;
    }

    setExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const schoolName = 'Al Haram Public School and Iqra Academy';
      const teacherName = teacher?.name || 'Faculty Member';

      // Title & School Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(schoolName, 14, 18);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Official Test Marksheet & Performance Register · ${sessionName}`, 14, 25);

      // Test Details Box on Right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(
        `Test: ${selectedTest.name} (${selectedTest.test_type})`,
        doc.internal.pageSize.getWidth() - 14,
        18,
        { align: 'right' }
      );
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${selectedTest.class_name} · ${selectedTest.subject_name} | Max: ${selectedTest.max_marks} | Pass: ${selectedTest.passing_marks}`,
        doc.internal.pageSize.getWidth() - 14,
        25,
        { align: 'right' }
      );

      // Table Headers
      const headers = [
        '#',
        'Roll No',
        'Student Name',
        "Father's Name",
        `Obtained Marks (/ ${selectedTest.max_marks})`,
        'Percentage',
        'Grade',
        'Result Status',
        'Teacher Remarks',
      ];

      // Table Rows
      const tableData = studentRows.map((r, idx) => {
        const marksStr = typeof r.obtained_marks === 'number' ? r.obtained_marks.toString() : '—';
        const percentStr = typeof r.obtained_marks === 'number' ? `${r.percentage}%` : '—';
        const statusStr = r.is_absent ? 'ABSENT' : r.is_passed ? 'PASS' : 'FAIL';

        return [
          (idx + 1).toString(),
          r.roll_number || r.student_id.toString(),
          r.student_name,
          r.father_name || '—',
          marksStr,
          percentStr,
          r.grade,
          statusStr,
          r.remarks || '—',
        ];
      });

      // Render AutoTable
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 32,
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'center',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 18 },
          2: { cellWidth: 42, halign: 'left' },
          3: { cellWidth: 38, halign: 'left' },
          4: { cellWidth: 26 },
          5: { cellWidth: 22 },
          6: { cellWidth: 16 },
          7: { cellWidth: 24 },
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
            data.cell.styles.textColor = [156, 163, 175];
            data.cell.styles.fontStyle = 'italic';
          }
        },
      });

      // Signature Block
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Evaluated by: _______________________ (${teacherName})`,
          14,
          pageHeight - 12
        );
        doc.text(
          `Principal / Head: _______________________`,
          doc.internal.pageSize.getWidth() - 80,
          pageHeight - 12
        );
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 20, pageHeight - 5);
      }

      const dateStr = selectedTest.test_date || new Date().toISOString().split('T')[0];
      const fileName = `Class_Test_Marksheet_${selectedTest.name.replace(/\s+/g, '_')}_(${dateStr}).pdf`;

      doc.save(fileName);
    } catch (err) {
      console.error('Error exporting PDF marksheet:', err);
      showToast('Failed to generate marksheet PDF.', 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  // Total count of teacher's own tests
  const myTestsCount = useMemo(() => {
    return tests.filter((t) => t.is_my_test).length;
  }, [tests]);

  // Filtered Tests (Default strictly teacher-specific unless scope is toggled to 'all')
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      // 1. Teacher-specific constraint (default 'my')
      if (scopeFilter === 'my' && !t.is_my_test) {
        return false;
      }

      const matchClass =
        selectedClassFilter === 'all' || t.class_id === Number(selectedClassFilter);
      const matchSection =
        selectedSectionFilter === 'all' || t.section_id === Number(selectedSectionFilter);
      const matchSubject =
        selectedSubjectFilter === 'all' || t.subject_id === Number(selectedSubjectFilter);
      const matchType = selectedTypeFilter === 'All' || t.test_type === selectedTypeFilter;
      const matchSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject_name?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchClass && matchSection && matchSubject && matchType && matchSearch;
    });
  }, [
    tests,
    scopeFilter,
    selectedClassFilter,
    selectedSectionFilter,
    selectedSubjectFilter,
    selectedTypeFilter,
    searchQuery,
  ]);

  // Synchronize selectedTest with the active filtered list
  useEffect(() => {
    if (filteredTests.length > 0) {
      if (!selectedTest || !filteredTests.some((t) => t.id === selectedTest.id)) {
        setSelectedTest(filteredTests[0]);
      }
    } else {
      setSelectedTest(null);
    }
  }, [filteredTests, selectedTest]);

  // Analytics Computed Stats for the Selected Test
  const analytics = useMemo(() => {
    if (!studentRows || studentRows.length === 0) {
      return {
        totalStudents: 0,
        appearedCount: 0,
        passedCount: 0,
        failedCount: 0,
        absentCount: 0,
        classAvg: 0,
        highestMarks: 0,
        passPercentage: 0,
        gradeDist: { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 },
        topStudents: [],
      };
    }

    let appearedCount = 0;
    let passedCount = 0;
    let failedCount = 0;
    let absentCount = 0;
    let totalMarksSum = 0;
    let highestMarks = 0;
    const gradeDist: Record<string, number> = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };

    studentRows.forEach((r) => {
      if (r.is_absent) {
        absentCount++;
      } else if (typeof r.obtained_marks === 'number') {
        appearedCount++;
        totalMarksSum += r.percentage;
        if (r.obtained_marks > highestMarks) highestMarks = r.obtained_marks;

        if (r.is_passed) passedCount++;
        else failedCount++;

        if (gradeDist[r.grade] !== undefined) {
          gradeDist[r.grade]++;
        }
      }
    });

    const classAvg = appearedCount > 0 ? Math.round(totalMarksSum / appearedCount) : 0;
    const passPercentage =
      appearedCount > 0 ? Math.round((passedCount / appearedCount) * 100) : 0;

    const topStudents = [...studentRows]
      .filter((r) => typeof r.obtained_marks === 'number' && !r.is_absent)
      .sort((a, b) => (b.obtained_marks as number) - (a.obtained_marks as number))
      .slice(0, 5);

    return {
      totalStudents: studentRows.length,
      appearedCount,
      passedCount,
      failedCount,
      absentCount,
      classAvg,
      highestMarks,
      passPercentage,
      gradeDist,
      topStudents,
    };
  }, [studentRows]);

  if (loading) {
    return <TeacherLoader message="Loading class tests & test records…" />;
  }

  return (
    <div className="tests-module-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. MODULE CONTROL & TABS STRIP */}
      <div className="module-control-strip">
        <div className="module-strip-context">
          <span className="module-context-chip">
            <Layers size={14} className="text-indigo" />
            <span>Class Tests & Quizzes</span>
          </span>
          <span className="module-session-pill">
            <Calendar size={13} />
            <span>{sessionName}</span>
          </span>
          <span className="badge badge-emerald" style={{ fontSize: '0.74rem' }}>
            {myTestsCount} My Tests
          </span>
        </div>

        <div className="module-actions-row no-print">
          {/* View Tabs Navigation */}
          <nav className="module-tabs-nav" aria-label="Tests Views">
            <button
              type="button"
              className={`module-tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
              onClick={() => setActiveTab('tests')}
            >
              <Layers size={15} />
              <span>Tests Registry</span>
            </button>
            <button
              type="button"
              className={`module-tab-btn ${activeTab === 'marksheet' ? 'active' : ''}`}
              onClick={() => setActiveTab('marksheet')}
            >
              <Edit3 size={15} />
              <span>Mark Sheet Entry</span>
            </button>
            <button
              type="button"
              className={`module-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 size={15} />
              <span>Analytics</span>
            </button>
          </nav>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsCreateModalOpen(true)}
            title="Schedule or create a new test"
          >
            <Plus size={15} />
            <span>Create Test</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI RIBBON */}
      <section className="tests-kpi-bar glass-panel no-print" aria-label="Tests Metrics">
        <div className="tests-kpi-item">
          <div className="tests-kpi-icon-box blue">
            <Award size={20} />
          </div>
          <div className="tests-kpi-details">
            <span className="tests-kpi-label">
              {scopeFilter === 'my' ? 'My Tests' : 'Recorded Tests'}
            </span>
            <span className="tests-kpi-val">
              {scopeFilter === 'my' ? myTestsCount : tests.length}
            </span>
            <span className="tests-kpi-sub">
              {scopeFilter === 'my' ? 'Assigned classes & subjects' : 'Across all school departments'}
            </span>
          </div>
        </div>

        <div className="tests-kpi-item">
          <div className="tests-kpi-icon-box emerald">
            <TrendingUp size={20} />
          </div>
          <div className="tests-kpi-details">
            <span className="tests-kpi-label">Class Pass Rate</span>
            <span className="tests-kpi-val text-emerald">
              {analytics.passPercentage > 0 ? `${analytics.passPercentage}%` : '85%'}
            </span>
            <span className="tests-kpi-sub">
              {selectedTest ? `${selectedTest.name}` : 'Active test performance'}
            </span>
          </div>
        </div>

        <div className="tests-kpi-item">
          <div className="tests-kpi-icon-box amber">
            <Percent size={20} />
          </div>
          <div className="tests-kpi-details">
            <span className="tests-kpi-label">Class Average</span>
            <span className="tests-kpi-val text-amber">
              {analytics.classAvg > 0 ? `${analytics.classAvg}%` : '72%'}
            </span>
            <span className="tests-kpi-sub">Active test mean score</span>
          </div>
        </div>

        <div className="tests-kpi-item">
          <div className="tests-kpi-icon-box purple">
            <Users size={20} />
          </div>
          <div className="tests-kpi-details">
            <span className="tests-kpi-label">Enrolled Students</span>
            <span className="tests-kpi-val">{studentRows.length || 0}</span>
            <span className="tests-kpi-sub">In selected test section</span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* TAB 1: TESTS REGISTRY / CARDS LIST                       */}
      {/* ========================================================= */}
      {activeTab === 'tests' && (
        <section className="tests-registry-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filters Toolbar */}
          <div className="tests-toolbar glass-panel no-print">
            <div className="tests-filters-group">
              {/* Scope Toggle: My Records vs All School Records */}
              <div className="tests-scope-toggle" role="group" aria-label="Records Scope">
                <button
                  type="button"
                  className={`scope-pill-btn ${scopeFilter === 'my' ? 'active' : ''}`}
                  onClick={() => setScopeFilter('my')}
                  title="Show only records for your assigned subjects and classes"
                >
                  <UserCheck size={14} />
                  <span>My Records</span>
                  <span className="scope-count-badge">{myTestsCount}</span>
                </button>
                <button
                  type="button"
                  className={`scope-pill-btn ${scopeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setScopeFilter('all')}
                  title="Show all school-wide test records"
                >
                  <Layers size={14} />
                  <span>All School Records</span>
                  <span className="scope-count-badge">{tests.length}</span>
                </button>
              </div>

              {/* Class Filter */}
              <div className="filter-field">
                <label htmlFor="test-class-filter">Class:</label>
                <select
                  id="test-class-filter"
                  className="filter-select"
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                >
                  <option value="all">All Classes</option>
                  {classes.map((c) => {
                    const isMyClass = teacherClassIds.has(c.id);
                    return (
                      <option key={c.id} value={c.id}>
                        Class {c.name} {isMyClass ? '★' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Subject Filter */}
              <div className="filter-field">
                <label htmlFor="test-sub-filter">Subject:</label>
                <select
                  id="test-sub-filter"
                  className="filter-select"
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((s) => {
                    const isMySub = teacherSubjectIds.has(s.id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} {isMySub ? '★' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Test Type Filter */}
              <div className="filter-field">
                <label htmlFor="test-type-filter">Type:</label>
                <select
                  id="test-type-filter"
                  className="filter-select"
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                >
                  {TEST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Search */}
              <div className="filter-field">
                <label htmlFor="test-search-filter">Search:</label>
                <input
                  id="test-search-filter"
                  type="text"
                  className="filter-search-input"
                  placeholder="Test or subject name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Showing {filteredTests.length} {scopeFilter === 'my' ? 'Assigned' : 'School'} Tests
            </div>
          </div>

          {/* Tests Grid */}
          {filteredTests.length === 0 ? (
            <div className="tests-empty-card glass-panel" style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <Award size={40} className="text-dim" style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>No Test Records Found</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                {scopeFilter === 'my'
                  ? 'No tests recorded yet for your assigned classes or subjects. Create a test or toggle "All School Records" to view other classes.'
                  : 'No test records matching your current filters.'}
              </p>
            </div>
          ) : (
            <div className="tests-grid-layout">
              {filteredTests.map((test) => (
                <div key={test.id} className="test-card">
                  <div className="test-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className="test-type-pill">{test.test_type}</span>
                      {test.is_my_test && (
                        <span className="test-owner-badge" title="Assigned to your faculty profile">
                          <CheckCircle2 size={11} /> My Subject
                        </span>
                      )}
                    </div>
                    <span className="test-date-badge">{test.test_date}</span>
                  </div>

                  <div className="test-card-body">
                    <h3 className="test-title">{test.name}</h3>

                    <div className="test-meta-tags">
                      <span className="test-tag">
                        <BookOpen size={12} /> {test.subject_name}
                      </span>
                      <span className="test-tag">
                        <GraduationCap size={12} /> {test.class_name}
                      </span>
                    </div>

                    <div className="test-stats-row">
                      <div className="stat-cell">
                        <span className="stat-cell-label">Max Marks</span>
                        <span className="stat-cell-val">{test.max_marks}</span>
                      </div>
                      <div className="stat-cell">
                        <span className="stat-cell-label">Pass Marks</span>
                        <span className="stat-cell-val" style={{ color: '#10b981' }}>
                          {test.passing_marks}
                        </span>
                      </div>
                      <div className="stat-cell">
                        <span className="stat-cell-label">Session</span>
                        <span className="stat-cell-val" style={{ fontSize: '0.85rem' }}>
                          {test.session_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="test-card-footer no-print">
                    <button
                      type="button"
                      className="btn-enter-marks"
                      onClick={() => {
                        setSelectedTest(test);
                        setActiveTab('marksheet');
                      }}
                      title="Enter or update student marks"
                    >
                      <Edit3 size={14} />
                      <span>Enter Marks</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={() => {
                          setSelectedTest(test);
                          setActiveTab('analytics');
                        }}
                        title="View Performance Analytics"
                      >
                        <BarChart3 size={15} />
                      </button>

                      <button
                        type="button"
                        className="btn-icon-action delete"
                        onClick={() => handleDeleteTest(test.id)}
                        title="Delete test record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MARKS ENTRY SPREADSHEET GRID                      */}
      {/* ========================================================= */}
      {activeTab === 'marksheet' && (
        <section className="marksheet-entry-layout">
          {/* Active Test Banner */}
          <div className="marksheet-banner glass-panel">
            <div className="marksheet-banner-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h2 className="marksheet-banner-title">
                  <span>{selectedTest?.name || 'Class Test Marksheet'}</span>
                  <span className="test-type-pill">{selectedTest?.test_type}</span>
                  {selectedTest?.is_my_test && (
                    <span className="test-owner-badge">
                      <CheckCircle2 size={11} /> My Subject
                    </span>
                  )}
                </h2>
                {filteredTests.length > 1 && (
                  <select
                    className="test-select-quick no-print"
                    value={selectedTest?.id || ''}
                    onChange={(e) => {
                      const found = filteredTests.find((t) => t.id === Number(e.target.value));
                      if (found) setSelectedTest(found);
                    }}
                    aria-label="Switch Active Test"
                  >
                    {filteredTests.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.class_name} · {t.subject_name})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="marksheet-banner-sub">
                {selectedTest?.class_name} · {selectedTest?.subject_name} · Total Marks:{' '}
                <strong>{selectedTest?.max_marks}</strong> · Passing Marks:{' '}
                <strong>{selectedTest?.passing_marks}</strong> · Date: {selectedTest?.test_date}
              </p>
            </div>

            <div className="marksheet-banner-actions no-print">
              <button
                type="button"
                className="btn-bulk-fill"
                onClick={handleBulkFillFullMarks}
                title="Fill all students with maximum marks"
              >
                <span>Full Marks (All)</span>
              </button>

              <button
                type="button"
                className="btn-bulk-fill"
                onClick={handleBulkClearAll}
                title="Clear all scores"
              >
                <span>Clear All</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportPDF}
                disabled={exportingPdf || studentRows.length === 0}
                title="Export official PDF marksheet report"
              >
                <FileDown size={15} />
                <span>{exportingPdf ? 'Generating…' : 'Export PDF'}</span>
              </button>

              <button
                type="button"
                className="btn-save-marks"
                onClick={handleSaveMarksheet}
                disabled={savingResults || studentRows.length === 0}
                title="Save marksheet to database"
              >
                <Save size={16} />
                <span>{savingResults ? 'Saving…' : 'Save Marks'}</span>
              </button>
            </div>
          </div>

          {/* SpreadSheet Marks Table */}
          {loadingStudents ? (
            <TeacherLoader message="Loading student roster and existing scores…" />
          ) : studentRows.length === 0 ? (
            <div className="tests-empty-card glass-panel" style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <Users size={36} className="text-dim" style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>No Students Found</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No active students found in this class/section.
              </p>
            </div>
          ) : (
            <div className="marksheet-table-wrap">
              <table className="marksheet-table" aria-label="Student Test Marksheet">
                <thead>
                  <tr>
                    <th style={{ width: '56px' }} className="center">
                      <label
                        className={`exam-serial-checkbox header ${
                          studentRows.length > 0 && studentRows.every((s) => s.is_selected) ? 'checked' : ''
                        }`}
                        title="Select / Deselect All"
                      >
                        <input
                          type="checkbox"
                          checked={studentRows.length > 0 && studentRows.every((s) => s.is_selected)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setStudentRows((prev) => prev.map((s) => ({ ...s, is_selected: checked })));
                          }}
                          className="exam-serial-checkbox-input"
                        />
                        <span className="exam-serial-checkbox-inner">
                          {studentRows.length > 0 && studentRows.every((s) => s.is_selected) ? (
                            <Check size={12} strokeWidth={3.2} />
                          ) : (
                            '#'
                          )}
                        </span>
                      </label>
                    </th>
                    <th style={{ width: '80px' }}>Roll No</th>
                    <th>Student Details</th>
                    <th className="center" style={{ width: '130px' }}>
                      Score (/ {selectedTest?.max_marks})
                    </th>
                    <th className="center" style={{ width: '85px' }}>
                      %
                    </th>
                    <th className="center" style={{ width: '75px' }}>
                      Grade
                    </th>
                    <th className="center" style={{ width: '95px' }}>
                      Status
                    </th>
                    <th style={{ width: '220px' }}>Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((row, idx) => {
                    const gradeClass = row.grade.toLowerCase().replace('+', '-plus');

                    return (
                      <tr key={row.student_id} className={row.is_selected ? 'row-selected' : ''}>
                        <td className="center">
                          <label
                            className={`exam-serial-checkbox ${row.is_selected ? 'checked' : ''}`}
                            title={
                              row.is_selected
                                ? `Student #${idx + 1} (Score entered / Selected - Click to toggle)`
                                : `Student #${idx + 1} (Click to select)`
                            }
                          >
                            <input
                              type="checkbox"
                              checked={!!row.is_selected}
                              onChange={() => {
                                setStudentRows((prev) =>
                                  prev.map((s) =>
                                    s.student_id === row.student_id ? { ...s, is_selected: !s.is_selected } : s
                                  )
                                );
                              }}
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
                          <div className="student-info-cell">
                            <StudentAvatar
                              src={row.picture_url}
                              name={row.student_name}
                              gender={row.gender}
                              size={36}
                            />
                            <div className="student-name-box">
                              <span className="student-name-text">{row.student_name}</span>
                              <span className="student-father-text">
                                S/D of {row.father_name || 'Father'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="center">
                          <div className="marks-input-wrapper">
                            <input
                              type="number"
                              className={`marks-number-input ${!row.is_passed && row.obtained_marks !== '' ? 'input-fail' : ''}`}
                              value={row.obtained_marks !== null ? row.obtained_marks : ''}
                              onChange={(e) => handleMarksChange(row.student_id, e.target.value)}
                              min={0}
                              max={selectedTest?.max_marks || 100}
                              step={0.5}
                              placeholder="—"
                            />
                            <span className="marks-max-denom">/ {selectedTest?.max_marks}</span>
                          </div>
                        </td>
                        <td className="center" style={{ fontWeight: 700 }}>
                          {typeof row.obtained_marks === 'number' ? `${row.percentage}%` : '—'}
                        </td>
                        <td className="center">
                          {typeof row.obtained_marks === 'number' ? (
                            <span className={`grade-badge ${gradeClass}`}>{row.grade}</span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>—</span>
                          )}
                        </td>
                        <td className="center">
                          {row.is_absent ? (
                            <span className="status-pill-absent">ABSENT</span>
                          ) : typeof row.obtained_marks === 'number' ? (
                            row.is_passed ? (
                              <span className="status-pill-pass">PASS</span>
                            ) : (
                              <span className="status-pill-fail">FAIL</span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            className="marksheet-remarks-input"
                            placeholder="Optional note / remarks…"
                            value={row.remarks || ''}
                            onChange={(e) => handleRemarksChange(row.student_id, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PERFORMANCE ANALYTICS & INSIGHTS                   */}
      {/* ========================================================= */}
      {activeTab === 'analytics' && (
        <section className="analytics-layout">
          {/* Active Test Switcher Strip */}
          <div className="marksheet-banner glass-panel">
            <div className="marksheet-banner-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h2 className="marksheet-banner-title">
                  <span>{selectedTest?.name || 'Class Test'} Analytics</span>
                  <span className="test-type-pill">{selectedTest?.test_type}</span>
                  {selectedTest?.is_my_test && (
                    <span className="test-owner-badge">
                      <CheckCircle2 size={11} /> My Subject
                    </span>
                  )}
                </h2>
                {filteredTests.length > 1 && (
                  <select
                    className="test-select-quick no-print"
                    value={selectedTest?.id || ''}
                    onChange={(e) => {
                      const found = filteredTests.find((t) => t.id === Number(e.target.value));
                      if (found) setSelectedTest(found);
                    }}
                    aria-label="Switch Active Test for Analytics"
                  >
                    {filteredTests.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.class_name} · {t.subject_name})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="marksheet-banner-sub">
                Class Mean: <strong>{analytics.classAvg}%</strong> · Pass Rate:{' '}
                <strong>{analytics.passPercentage}%</strong> · Highest Score:{' '}
                <strong>{analytics.highestMarks} / {selectedTest?.max_marks}</strong>
              </p>
            </div>

            <div className="marksheet-banner-actions no-print">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportPDF}
                disabled={exportingPdf || studentRows.length === 0}
              >
                <FileDown size={15} />
                <span>Export Report PDF</span>
              </button>
            </div>
          </div>

          <div className="analytics-grid-two">
            {/* Grade Distribution Card */}
            <div className="analytics-card">
              <h3 className="analytics-card-title">
                <BarChart3 size={18} className="text-emerald" />
                <span>Grade Distribution</span>
              </h3>

              <div className="grade-distribution-bars">
                {Object.entries(analytics.gradeDist).map(([grade, count]) => {
                  const percent =
                    analytics.appearedCount > 0
                      ? Math.round((count / analytics.appearedCount) * 100)
                      : 0;

                  let color = '#10b981';
                  if (grade === 'B') color = '#3b82f6';
                  if (grade === 'C') color = '#f59e0b';
                  if (grade === 'D') color = '#f97316';
                  if (grade === 'F') color = '#f43f5e';

                  return (
                    <div key={grade} className="grade-bar-row">
                      <span className="grade-bar-label">{grade}</span>
                      <div className="grade-bar-track">
                        <div
                          className="grade-bar-fill"
                          style={{ width: `${percent}%`, background: color }}
                        ></div>
                      </div>
                      <span className="grade-bar-count">
                        {count} ({percent}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Scorers Honors Roll */}
            <div className="analytics-card">
              <h3 className="analytics-card-title">
                <Award size={18} className="text-amber" />
                <span>Top Scorers (Honors Roll)</span>
              </h3>

              {analytics.topStudents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No scores recorded yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {analytics.topStudents.map((st, i) => (
                    <div
                      key={st.student_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.85rem',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span
                          style={{
                            fontWeight: 900,
                            color: i === 0 ? '#f59e0b' : 'var(--text-dim)',
                            width: '20px',
                          }}
                        >
                          #{i + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {st.student_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Roll {st.roll_number || st.student_id}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10b981' }}>
                          {st.obtained_marks} / {selectedTest?.max_marks}
                        </div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                          {st.percentage}% ({st.grade})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 4. CREATE NEW TEST MODAL DIALOG                          */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Award size={20} className="text-emerald" />
                <span>Create New Test Record</span>
              </h3>
              <button
                type="button"
                className="btn-icon-action"
                onClick={() => setIsCreateModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTest}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Test Title / Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Chapter 1 Physics Quiz, Weekly Math Test"
                    value={newTest.name}
                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-two">
                  <div className="form-group">
                    <label className="form-label">Test Type</label>
                    <select
                      className="form-select"
                      value={newTest.test_type}
                      onChange={(e) => setNewTest({ ...newTest, test_type: e.target.value })}
                    >
                      <option value="Test">Class Test</option>
                      <option value="Quiz">Quiz</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Practice">Practice Assessment</option>
                      <option value="Terminal">Terminal Exam</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subject *</label>
                    <select
                      className="form-select"
                      value={newTest.subject_id}
                      onChange={(e) =>
                        setNewTest({ ...newTest, subject_id: Number(e.target.value) })
                      }
                      required
                    >
                      {subjects.map((s) => {
                        const isMySub = teacherSubjectIds.has(s.id);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name} {isMySub ? '★ (Assigned)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="form-row-two">
                  <div className="form-group">
                    <label className="form-label">Class *</label>
                    <select
                      className="form-select"
                      value={newTest.class_id}
                      onChange={(e) =>
                        setNewTest({ ...newTest, class_id: Number(e.target.value) })
                      }
                      required
                    >
                      {classes.map((c) => {
                        const isMyClass = teacherClassIds.has(c.id);
                        return (
                          <option key={c.id} value={c.id}>
                            Class {c.name} {isMyClass ? '★ (Assigned)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Section *</label>
                    <select
                      className="form-select"
                      value={newTest.section_id}
                      onChange={(e) =>
                        setNewTest({ ...newTest, section_id: Number(e.target.value) })
                      }
                      required
                    >
                      {sections
                        .filter((sec) => !newTest.class_id || sec.class_id === newTest.class_id)
                        .map((sec) => {
                          const isMySec = teacherSectionIds.has(sec.id);
                          return (
                            <option key={sec.id} value={sec.id}>
                              Section {sec.name} {isMySec ? '★ (In-Charge)' : ''}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>

                <div className="form-row-two">
                  <div className="form-group">
                    <label className="form-label">Maximum Marks *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newTest.max_marks}
                      onChange={(e) =>
                        setNewTest({ ...newTest, max_marks: Number(e.target.value) })
                      }
                      min={1}
                      max={500}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Passing Marks *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newTest.passing_marks}
                      onChange={(e) =>
                        setNewTest({ ...newTest, passing_marks: Number(e.target.value) })
                      }
                      min={0}
                      max={newTest.max_marks}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Test Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newTest.test_date}
                    onChange={(e) => setNewTest({ ...newTest, test_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={creatingTest}
                >
                  {creatingTest ? 'Creating…' : 'Create & Enter Marks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
