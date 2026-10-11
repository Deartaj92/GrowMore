import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { supabase } from '../services/supabase';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarRange,
  Users,
  Search,
  Save,
  RotateCcw,
  UserCheck,
  UserX,
  History,
  ShieldCheck,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import type {
  AttendanceStatus,
  StudentAttendanceItem,
  SectionOption,
  StaffAttendanceLog,
} from '../types/attendance';
import { TeacherLoader } from '../components/TeacherLoader';
import { MonthlyAttendanceRegister } from '../components/MonthlyAttendanceRegister';
import { StudentAvatar, sanitizeAvatarUrl } from '../components/StudentAvatar';
import './Attendance.css';

export const Attendance: React.FC = () => {
  const { teacher } = useTeacherAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'mark' | 'monthly' | 'history' | 'my-log'>('mark');

  // Controls for Mark Attendance
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Student Attendance State
  const [students, setStudents] = useState<StudentAttendanceItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // History Tab Data & Filters
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySectionFilter, setHistorySectionFilter] = useState<string>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Teacher's Self Attendance Data
  const [myLogs, setMyLogs] = useState<StaffAttendanceLog[]>([]);
  const [loadingMyLogs, setLoadingMyLogs] = useState(false);

  // 1. Fetch real sections and active session on mount
  useEffect(() => {
    const fetchSectionsAndSession = async () => {
      if (!teacher) return;
      try {
        const schoolId = teacher.school_id || 2;

        // Fetch active session
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .maybeSingle();

        if (sessionData) {
          setActiveSessionId(sessionData.id);
        }

        // Fetch all sections in this school with class info
        const { data: secsData } = await supabase
          .from('sections')
          .select(`
            id,
            name,
            class_id,
            teacher_id,
            classes:class_id(id, name)
          `)
          .eq('school_id', schoolId)
          .order('class_id');

        if (secsData && secsData.length > 0) {
          const mapped: SectionOption[] = secsData.map((s: any) => ({
            id: s.id,
            name: s.name,
            class_id: s.class_id,
            class_name: s.classes?.name ? `${s.classes.name}` : `Class ${s.class_id}`,
            is_class_teacher: s.teacher_id === teacher.id,
          }));

          setSections(mapped);

          // Default selected section: teacher's assigned section (e.g. Section 5 = 10th-B for Wasim) or first section
          const teacherSec = mapped.find((s) => s.is_class_teacher);
          const defaultSecId = teacherSec ? teacherSec.id : mapped[0].id;
          setSelectedSectionId(defaultSecId);
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
      }
    };

    fetchSectionsAndSession();
  }, [teacher]);

  // 2. Fetch real students and existing attendance for selected section and date
  const loadSectionStudentsAndAttendance = useCallback(async () => {
    if (!selectedSectionId || !teacher) return;

    setLoadingStudents(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const schoolId = teacher.school_id || 2;

      // Fetch active students for this section
      const { data: rawStudents, error: stError } = await supabase
        .from('students')
        .select('id, name, roll_number, father_name, picture_url, gender, status')
        .eq('section_id', selectedSectionId)
        .order('id');

      if (stError) throw stError;

      // Filter for active students, fallback to all if none marked active
      const activeList = (rawStudents || []).filter(
        (st: any) => !st.status || st.status.toLowerCase() === 'active'
      );
      const studentList = activeList.length > 0 ? activeList : (rawStudents || []);

      // Sort naturally by roll number or ID
      studentList.sort((a: any, b: any) => {
        if (a.roll_number && b.roll_number) {
          return a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true });
        }
        if (a.roll_number) return -1;
        if (b.roll_number) return 1;
        return a.id - b.id;
      });

      // Fetch existing attendance records for this section and date
      const { data: existingAttendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('section_id', selectedSectionId)
        .eq('date', selectedDate)
        .eq('school_id', schoolId);

      const existingMap = new Map<number, any>();
      if (existingAttendance) {
        existingAttendance.forEach((rec: any) => {
          existingMap.set(rec.student_id, rec);
        });
      }

      // Merge students with their attendance status
      const mappedStudents: StudentAttendanceItem[] = studentList.map((st: any) => {
        const existing = existingMap.get(st.id);
        const statusVal = existing?.status?.toLowerCase();
        const validStatus: AttendanceStatus =
          statusVal === 'absent'
            ? 'absent'
            : statusVal === 'late'
            ? 'late'
            : statusVal === 'leave'
            ? 'leave'
            : 'present'; // Default to present for quick attendance

        return {
          id: st.id,
          name: st.name,
          roll_number: st.roll_number || null,
          father_name: st.father_name || null,
          picture_url: sanitizeAvatarUrl(st.picture_url),
          gender: st.gender || null,
          status: validStatus,
          remarks: existing?.remarks || '',
          existing_record_id: existing?.id || null,
        };
      });

      setStudents(mappedStudents);
    } catch (err: any) {
      console.error('Error loading students:', err);
      setSaveErrorMsg('Failed to load student roster for selected section.');
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedSectionId, selectedDate, teacher]);

  useEffect(() => {
    loadSectionStudentsAndAttendance();
  }, [loadSectionStudentsAndAttendance]);

  // 3. Update single student status
  const handleStatusChange = (studentId: number, newStatus: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    );
  };

  // 4. Update student remarks
  const handleRemarksChange = (studentId: number, remarks: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, remarks } : s))
    );
  };

  // 5. Bulk actions
  const handleMarkAll = (status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  // 6. Save attendance to database
  const handleSaveAttendance = async () => {
    if (!selectedSectionId || !teacher || students.length === 0) return;

    setSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const schoolId = teacher.school_id || 2;
      const currentSec = sections.find((s) => s.id === selectedSectionId);
      const classId = currentSec?.class_id || 1;

      // Construct records payload
      const recordsToUpsert = students.map((s) => ({
        ...(s.existing_record_id ? { id: s.existing_record_id } : {}),
        student_id: s.id,
        class_id: classId,
        section_id: selectedSectionId,
        session_id: activeSessionId || 6,
        date: selectedDate,
        status: s.status,
        remarks: s.remarks || null,
        school_id: schoolId,
        source: 'manual',
      }));

      // Upsert into attendance_records table
      const { error: upsertErr } = await supabase
        .from('attendance_records')
        .upsert(recordsToUpsert, { onConflict: 'id' });

      if (upsertErr) throw upsertErr;

      setSaveSuccessMsg(
        `Attendance saved successfully! Recorded ${students.length} students for ${currentSec?.class_name} (${currentSec?.name}) on ${selectedDate}.`
      );

      // Reload to ensure IDs are synced
      await loadSectionStudentsAndAttendance();
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setSaveErrorMsg(err?.message || 'Failed to save attendance records. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // 7. Load History Tab Data (Fixed Supabase join and multi-section support)
  const loadHistoryData = useCallback(async () => {
    if (!teacher) return;
    setLoadingHistory(true);
    try {
      const schoolId = teacher.school_id || 2;
      let query = supabase
        .from('attendance_records')
        .select(`
          id,
          date,
          status,
          remarks,
          section_id,
          sections(id, name, classes(id, name)),
          students(id, name, roll_number, father_name)
        `)
        .eq('school_id', schoolId)
        .order('date', { ascending: false })
        .limit(200);

      // Section Filter: specific section or all
      if (historySectionFilter !== 'all') {
        query = query.eq('section_id', Number(historySectionFilter));
      }

      // Date Filter
      if (historyDateFilter) {
        query = query.eq('date', historyDateFilter);
      }

      // Status Filter
      if (historyStatusFilter !== 'all') {
        query = query.eq('status', historyStatusFilter);
      }

      const { data: recs, error: recsErr } = await query;
      if (recsErr) {
        console.error('Error querying attendance_records:', recsErr);
      }
      setHistoryRecords(recs || []);
    } catch (err) {
      console.error('Error loading attendance history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [teacher, historySectionFilter, historyDateFilter, historyStatusFilter, selectedSectionId]);

  // 8. Load Teacher's Own Attendance Log
  const loadTeacherSelfLog = useCallback(async () => {
    if (!teacher) return;
    setLoadingMyLogs(true);
    try {
      const { data: logs, error: logsErr } = await supabase
        .from('staff_attendance_records')
        .select('*')
        .eq('staff_id', teacher.id)
        .order('date', { ascending: false })
        .limit(60);

      if (logsErr) {
        console.error('Error loading staff attendance:', logsErr);
      }
      setMyLogs(logs || []);
    } catch (err) {
      console.error('Error loading teacher self log:', err);
    } finally {
      setLoadingMyLogs(false);
    }
  }, [teacher]);

  // Trigger loads on tab switch or filter changes
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistoryData();
    } else if (activeTab === 'my-log') {
      loadTeacherSelfLog();
    }
  }, [activeTab, loadHistoryData, loadTeacherSelfLog]);

  // Helper date/time formatters
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '—';
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Filtered History Records (Memory search)
  const filteredHistoryRecords = useMemo(() => {
    if (!historySearch.trim()) return historyRecords;
    const q = historySearch.toLowerCase();
    return historyRecords.filter((rec) => {
      const st = Array.isArray(rec.students) ? rec.students[0] : rec.students;
      const sec = Array.isArray(rec.sections) ? rec.sections[0] : rec.sections;
      const sName = st?.name?.toLowerCase() || '';
      const sRoll = st?.roll_number?.toLowerCase() || '';
      const sFather = st?.father_name?.toLowerCase() || '';
      const sSecName = sec?.name?.toLowerCase() || '';
      const sClassName = (Array.isArray(sec?.classes) ? sec.classes[0]?.name : sec?.classes?.name)?.toLowerCase() || '';
      const sRemarks = rec.remarks?.toLowerCase() || '';
      const sDate = rec.date || '';

      return (
        sName.includes(q) ||
        sRoll.includes(q) ||
        sFather.includes(q) ||
        sSecName.includes(q) ||
        sClassName.includes(q) ||
        sRemarks.includes(q) ||
        sDate.includes(q)
      );
    });
  }, [historyRecords, historySearch]);

  // Compute live summary stats
  const totalCount = students.length;
  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const lateCount = students.filter((s) => s.status === 'late').length;
  const leaveCount = students.filter((s) => s.status === 'leave').length;
  const presentPercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
        (s.father_name && s.father_name.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const currentSection = sections.find((s) => s.id === selectedSectionId);

  return (
    <div className="attendance-module-page">
      {/* MODULE CONTROL & TABS STRIP */}
      <div className="module-control-strip">
        <div className="module-strip-context">
          {currentSection && (
            <span className="module-context-chip">
              <Users size={14} className="text-emerald" />
              <span>{currentSection.class_name} · Section {currentSection.name}</span>
              {currentSection.is_class_teacher && <span className="chip-role-tag">Class In-Charge</span>}
            </span>
          )}
          <span className="module-session-pill">
            <Clock size={13} />
            <span>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </span>
        </div>

        <nav className="module-tabs-nav" aria-label="Attendance Views">
          <button
            type="button"
            className={`module-tab-btn ${activeTab === 'mark' ? 'active' : ''}`}
            onClick={() => setActiveTab('mark')}
          >
            <CalendarCheck size={15} />
            <span>Mark Attendance</span>
          </button>
          <button
            type="button"
            className={`module-tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            <FileSpreadsheet size={15} />
            <span>Monthly Register</span>
          </button>
          <button
            type="button"
            className={`module-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={15} />
            <span>Section Log</span>
          </button>
          <button
            type="button"
            className={`module-tab-btn ${activeTab === 'my-log' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-log')}
          >
            <UserCheck size={15} />
            <span>My Check-In Log</span>
          </button>
        </nav>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: MARK ATTENDANCE */}
      {/* ========================================================= */}
      {activeTab === 'mark' && (
        <div className="mark-roll-call-layout">
          {/* CONTROL STRIP */}
          <div className="att-toolbar glass-panel">
            <div className="toolbar-controls-grid">
              {/* Section Selector */}
              <div className="toolbar-field">
                <label htmlFor="sec-select" className="toolbar-label">
                  <Users size={13} className="label-icon text-emerald" />
                  <span>Class & Section</span>
                </label>
                <div className="select-wrapper">
                  <select
                    id="sec-select"
                    className="toolbar-select"
                    value={selectedSectionId || ''}
                    onChange={(e) => setSelectedSectionId(Number(e.target.value))}
                  >
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.class_name} · Section {sec.name} {sec.is_class_teacher ? '★ (In-Charge)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Field */}
              <div className="toolbar-field">
                <label htmlFor="att-date" className="toolbar-label">
                  <Clock size={13} className="label-icon text-indigo" />
                  <span>Date</span>
                </label>
                <div className="date-wrapper">
                  <input
                    id="att-date"
                    type="date"
                    className="toolbar-date-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Search Filter */}
              <div className="toolbar-field search-expand">
                <label htmlFor="student-search" className="toolbar-label">
                  <Search size={13} className="label-icon text-cyan" />
                  <span>Quick Search</span>
                </label>
                <div className="search-wrapper">
                  <Search size={15} className="search-lens" />
                  <input
                    id="student-search"
                    type="text"
                    className="toolbar-search-input"
                    placeholder="Search name or roll no…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="toolbar-actions-group">
              <span className="actions-label">Bulk Mark:</span>
              <button
                type="button"
                className="bulk-action-btn bulk-present"
                onClick={() => handleMarkAll('present')}
                title="Mark all students as Present"
              >
                <UserCheck size={14} />
                <span>All Present</span>
              </button>
              <button
                type="button"
                className="bulk-action-btn bulk-absent"
                onClick={() => handleMarkAll('absent')}
                title="Mark all students as Absent"
              >
                <UserX size={14} />
                <span>All Absent</span>
              </button>
              <button
                type="button"
                className="bulk-action-btn bulk-reset"
                onClick={loadSectionStudentsAndAttendance}
                title="Reload and reset to database records"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* STATUS NOTIFICATIONS */}
          {saveSuccessMsg && (
            <div className="att-alert-banner success glass-panel animate-fade-in">
              <CheckCircle2 size={18} />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
          {saveErrorMsg && (
            <div className="att-alert-banner error glass-panel animate-fade-in">
              <AlertCircle size={18} />
              <span>{saveErrorMsg}</span>
            </div>
          )}

          {/* KPI COUNTERS BAR */}
          <div className="attendance-kpi-bar glass-panel">
            <div className="kpi-chip total">
              <span className="kpi-label">Total Enrolled</span>
              <span className="kpi-val">{totalCount}</span>
            </div>
            <div className="kpi-chip present">
              <span className="kpi-label">Present</span>
              <span className="kpi-val text-emerald">{presentCount}</span>
              <span className="kpi-sub">{presentPercentage}%</span>
            </div>
            <div className="kpi-chip absent">
              <span className="kpi-label">Absent</span>
              <span className="kpi-val text-rose">{absentCount}</span>
            </div>
            <div className="kpi-chip late">
              <span className="kpi-label">Late Arrival</span>
              <span className="kpi-val text-amber">{lateCount}</span>
            </div>
            <div className="kpi-chip leave">
              <span className="kpi-label">Approved Leave</span>
              <span className="kpi-val text-indigo">{leaveCount}</span>
            </div>

            <div className="kpi-save-action">
              <button
                type="button"
                className="btn btn-primary att-save-btn"
                onClick={handleSaveAttendance}
                disabled={saving || loadingStudents || totalCount === 0}
              >
                <Save size={16} />
                <span>{saving ? 'Saving Records…' : `Save Attendance (${totalCount})`}</span>
              </button>
            </div>
          </div>

          {/* STUDENT ROSTER LIST / TABLE */}
          {loadingStudents ? (
            <div className="roster-loader-panel glass-panel">
              <TeacherLoader message="Loading student roster from database…" fullScreen={false} />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="roster-empty-panel glass-panel">
              <Users size={36} className="empty-roster-icon" />
              <h3>No Students Found</h3>
              <p>
                {students.length === 0
                  ? `No active students currently enrolled in ${currentSection?.class_name} (${currentSection?.name}).`
                  : `No students match your filter search "${searchQuery}".`}
              </p>
            </div>
          ) : (
            <div className="roster-card-list">
              {filteredStudents.map((student, idx) => (
                <div
                  key={student.id}
                  className={`student-roster-item clay-card status--${student.status}`}
                >
                  {/* Student Index & Info */}
                  <div className="student-info-col">
                    <span className="student-index-num">#{idx + 1}</span>

                    <StudentAvatar
                      src={student.picture_url}
                      name={student.name}
                      gender={student.gender}
                      size={42}
                      showGenderDot={true}
                    />

                    <div className="student-names-group">
                      <div className="student-name-row">
                        <span className="student-full-name">{student.name}</span>
                        {student.roll_number && (
                          <span className="student-roll-badge">
                            {student.roll_number}
                          </span>
                        )}
                      </div>
                      <span className="student-father-name">
                        S/O: {student.father_name || '—'}
                      </span>
                    </div>
                  </div>

                  {/* 4-State Attendance Pill Selector */}
                  <div className="status-selector-col" role="group" aria-label="Attendance Status">
                    <button
                      type="button"
                      className={`status-pill-btn present ${student.status === 'present' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(student.id, 'present')}
                      title="Present"
                    >
                      <Check size={14} />
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      className={`status-pill-btn absent ${student.status === 'absent' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(student.id, 'absent')}
                      title="Absent"
                    >
                      <XCircle size={14} />
                      <span>Absent</span>
                    </button>

                    <button
                      type="button"
                      className={`status-pill-btn late ${student.status === 'late' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(student.id, 'late')}
                      title="Late"
                    >
                      <Clock size={14} />
                      <span>Late</span>
                    </button>

                    <button
                      type="button"
                      className={`status-pill-btn leave ${student.status === 'leave' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(student.id, 'leave')}
                      title="Leave"
                    >
                      <CalendarRange size={14} />
                      <span>Leave</span>
                    </button>
                  </div>

                  {/* Optional Remarks Input */}
                  <div className="remarks-col">
                    <input
                      type="text"
                      className="remarks-input"
                      placeholder="Remarks / Note…"
                      value={student.remarks}
                      onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STICKY BOTTOM SAVE ACTION BAR */}
          <div className="sticky-bottom-bar glass-panel">
            <div className="sticky-info-text">
              <span className="section-tag-pill">
                {currentSection?.class_name} · Section {currentSection?.name}
              </span>
              <span className="text-dim">|</span>
              <span className="date-tag-pill">{selectedDate}</span>
              <span className="text-dim">|</span>
              <span className="summary-text-pill">
                <strong>{presentCount}</strong> Present, <strong>{absentCount}</strong> Absent
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleSaveAttendance}
              disabled={saving || loadingStudents || totalCount === 0}
            >
              <Save size={18} />
              <span>{saving ? 'Saving…' : 'Submit & Save Attendance'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MONTHLY ATTENDANCE REGISTER */}
      {/* ========================================================= */}
      {activeTab === 'monthly' && (
        <MonthlyAttendanceRegister
          teacher={teacher}
          sections={sections}
          initialSectionId={selectedSectionId}
          activeSessionId={activeSessionId}
        />
      )}

      {/* ========================================================= */}
      {/* TAB 3: SECTION ATTENDANCE HISTORY LOG */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="attendance-history-layout">
          {/* Header Card with Interactive Filter Controls */}
          <div className="history-header-card glass-panel">
            <div className="history-header-left">
              <History size={20} className="text-emerald" />
              <div>
                <h3 className="history-title">Attendance History & Audit Register</h3>
                <p className="history-subtitle">
                  Historical attendance logs retrieved directly from school records
                </p>
              </div>
            </div>

            <div className="history-toolbar-controls">
              {/* Filter: Section */}
              <div className="hist-filter-group">
                <label className="hist-filter-label">Section:</label>
                <select
                  className="toolbar-select hist-select"
                  value={historySectionFilter}
                  onChange={(e) => setHistorySectionFilter(e.target.value)}
                >
                  <option value="all">All School Sections</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.class_name} · Section {sec.name} {sec.is_class_teacher ? '★' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter: Date */}
              <div className="hist-filter-group">
                <label className="hist-filter-label">Date:</label>
                <input
                  type="date"
                  className="toolbar-date-input hist-date-input"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                />
                {historyDateFilter && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setHistoryDateFilter('')}
                    title="Clear date filter"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Filter: Status */}
              <div className="hist-filter-group">
                <label className="hist-filter-label">Status:</label>
                <select
                  className="toolbar-select hist-select-sm"
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present Only</option>
                  <option value="absent">Absent Only</option>
                  <option value="late">Late Only</option>
                  <option value="leave">Leave Only</option>
                </select>
              </div>

              {/* Search Bar */}
              <div className="hist-search-box">
                <Search size={14} className="hist-search-icon" />
                <input
                  type="text"
                  className="toolbar-search-input hist-search-input"
                  placeholder="Filter student or roll no…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadHistoryData}
                disabled={loadingHistory}
                title="Refresh database records"
              >
                <RotateCcw size={14} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar for Section Log */}
          <div className="attendance-kpi-bar glass-panel">
            <div className="kpi-chip total">
              <span className="kpi-label">Records Found</span>
              <span className="kpi-val">{filteredHistoryRecords.length}</span>
            </div>
            <div className="kpi-chip present">
              <span className="kpi-label">Present</span>
              <span className="kpi-val text-emerald">
                {filteredHistoryRecords.filter((r) => r.status === 'present').length}
              </span>
            </div>
            <div className="kpi-chip absent">
              <span className="kpi-label">Absent</span>
              <span className="kpi-val text-rose">
                {filteredHistoryRecords.filter((r) => r.status === 'absent').length}
              </span>
            </div>
            <div className="kpi-chip late">
              <span className="kpi-label">Late</span>
              <span className="kpi-val text-amber">
                {filteredHistoryRecords.filter((r) => r.status === 'late').length}
              </span>
            </div>
            <div className="kpi-chip leave">
              <span className="kpi-label">Leave</span>
              <span className="kpi-val text-indigo">
                {filteredHistoryRecords.filter((r) => r.status === 'leave').length}
              </span>
            </div>
          </div>

          {loadingHistory ? (
            <div className="roster-loader-panel glass-panel">
              <TeacherLoader message="Loading attendance history from database…" fullScreen={false} />
            </div>
          ) : filteredHistoryRecords.length === 0 ? (
            <div className="roster-empty-panel glass-panel">
              <CalendarCheck size={36} className="empty-roster-icon" />
              <h3>No Attendance Records Found</h3>
              <p>
                {historyRecords.length === 0
                  ? `No historical attendance records found for the selected section/date filter.`
                  : `No records match your search filter "${historySearch}".`}
              </p>
              {historySectionFilter !== 'all' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-2"
                  onClick={() => setHistorySectionFilter('all')}
                >
                  View All School Sections
                </button>
              )}
            </div>
          ) : (
            <div className="history-table-wrapper glass-panel">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class & Section</th>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Recorded Status</th>
                    <th>Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryRecords.map((rec) => {
                    const st = Array.isArray(rec.students) ? rec.students[0] : (rec.students || {});
                    const sec = Array.isArray(rec.sections) ? rec.sections[0] : (rec.sections || {});
                    const className = Array.isArray(sec?.classes) ? sec.classes[0]?.name : (sec?.classes?.name || '');
                    const isPresent = rec.status === 'present';
                    const isAbsent = rec.status === 'absent';
                    const isLate = rec.status === 'late';

                    return (
                      <tr key={rec.id}>
                        <td className="font-semibold text-main">{formatDateDisplay(rec.date)}</td>
                        <td>
                          <span className="badge badge-neutral">
                            {className ? `${className} · ` : ''}Sec {sec?.name || rec.section_id}
                          </span>
                        </td>
                        <td>
                          <span className="student-roll-badge">{st.roll_number || '—'}</span>
                        </td>
                        <td>
                          <div className="student-names-group">
                            <span className="student-full-name">{st.name || 'Unknown Student'}</span>
                            {st.father_name && (
                              <span className="student-father-name">S/O: {st.father_name}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              isPresent
                                ? 'badge-emerald'
                                : isAbsent
                                ? 'badge-rose'
                                : isLate
                                ? 'badge-amber'
                                : 'badge-indigo'
                            }`}
                          >
                            {rec.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-dim">{rec.remarks || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: TEACHER SELF ATTENDANCE LOG */}
      {/* ========================================================= */}
      {activeTab === 'my-log' && (
        <div className="teacher-self-log-layout">
          <div className="self-log-hero glass-panel">
            <div className="self-log-hero-left">
              <div className="self-avatar-circle">
                {teacher?.photo_url ? (
                  <img src={teacher.photo_url} alt={teacher.name} />
                ) : (
                  <span>{teacher?.name?.charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="self-teacher-name">{teacher?.name}</h3>
                <p className="self-teacher-role">{teacher?.designation || 'Teacher'}</p>
                <span className="badge badge-emerald mt-2">
                  <ShieldCheck size={12} /> Staff ID: {teacher?.employee_id || teacher?.id}
                </span>
              </div>
            </div>

            <div className="self-stats-box">
              <div className="self-stat-item">
                <span className="self-stat-num text-emerald">
                  {myLogs.filter((l) => l.status === 'present').length}
                </span>
                <span className="self-stat-lbl">Days Present</span>
              </div>
              <div className="self-stat-item">
                <span className="self-stat-num text-rose">
                  {myLogs.filter((l) => l.status === 'absent').length}
                </span>
                <span className="self-stat-lbl">Absences</span>
              </div>
              <div className="self-stat-item">
                <span className="self-stat-num text-amber">
                  {myLogs.filter((l) => l.status === 'late').length}
                </span>
                <span className="self-stat-lbl">Late Days</span>
              </div>
            </div>
          </div>

          <div className="self-table-container glass-panel">
            <div className="self-table-header">
              <h4>Recent Faculty Check-In Records ({myLogs.length} Logged)</h4>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={loadTeacherSelfLog}
                disabled={loadingMyLogs}
              >
                <RotateCcw size={14} /> Refresh Logs
              </button>
            </div>

            {loadingMyLogs ? (
              <TeacherLoader message="Loading your attendance history…" fullScreen={false} />
            ) : myLogs.length === 0 ? (
              <div className="roster-empty-panel">
                <p className="text-dim">No staff attendance records logged for your profile yet.</p>
              </div>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Check-In Time</th>
                      <th>Check-Out Time</th>
                      <th>Verification Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="font-semibold text-main">{formatDateDisplay(log.date)}</td>
                        <td>
                          <span
                            className={`badge ${
                              log.status === 'present'
                                ? 'badge-emerald'
                                : log.status === 'absent'
                                ? 'badge-rose'
                                : 'badge-amber'
                            }`}
                          >
                            {log.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="font-semibold text-main">{formatTime(log.check_in_time)}</td>
                        <td className="text-dim">{formatTime(log.check_out_time)}</td>
                        <td>
                          <span className="badge badge-neutral">{log.source || 'RFID Terminal'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
