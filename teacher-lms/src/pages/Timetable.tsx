import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Clock,
  Calendar,
  CalendarCheck,
  BookOpen,
  Coffee,
  CheckCircle2,
  FileDown,
  Printer,
  Sparkles,
  ChevronRight,
  BookOpenCheck,
  RotateCcw,
  Layers,
  GraduationCap,
  Users,
  Compass,
} from 'lucide-react';
import type {
  TimetableSlot,
  TimetablePeriodMaster,
  TimetableSettingsMaster,
  PeriodTimelineItem,
} from '../types/timetable';
import { TeacherLoader } from '../components/TeacherLoader';
import './Timetable.css';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

export const Timetable: React.FC = () => {
  const { teacher } = useTeacherAuth();
  const navigate = useNavigate();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'classes'>('today');

  // Database state
  const [loading, setLoading] = useState(true);
  const [periodsMaster, setPeriodsMaster] = useState<TimetablePeriodMaster[]>([]);
  const [settingsMaster, setSettingsMaster] = useState<TimetableSettingsMaster | null>(null);
  const [teacherSlots, setTeacherSlots] = useState<TimetableSlot[]>([]);
  const [allSchoolSlots, setAllSchoolSlots] = useState<TimetableSlot[]>([]);
  const [classesList, setClassesList] = useState<{ id: number; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState<string>('Current Academic Session');
  const [exportingPdf, setExportingPdf] = useState(false);

  // Current system time state (updates every minute for live status)
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. Fetch real Timetable Data from Supabase
  const fetchTimetableData = useCallback(async () => {
    if (!teacher) return;
    setLoading(true);

    try {
      const schoolId = teacher.school_id || 2;
      const teacherId = teacher.id || 28;

      // A. Fetch active session
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();

      const activeSessionId = sessionData?.id || 6;
      if (sessionData?.name) setSessionName(sessionData.name);

      // B. Fetch period timings and break settings
      const [{ data: periodsData }, { data: settingsData }, { data: classesData }] = await Promise.all([
        supabase
          .from('timetable_periods')
          .select('*')
          .eq('school_id', schoolId)
          .order('period_index'),
        supabase
          .from('timetable_settings')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle(),
        supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', schoolId)
          .order('id'),
      ]);

      if (periodsData && periodsData.length > 0) {
        setPeriodsMaster(periodsData);
      } else {
        // Fallback default periods
        setPeriodsMaster([
          { id: '1', school_id: schoolId, period_index: 0, start_time: '07:45', end_time: '08:15' },
          { id: '2', school_id: schoolId, period_index: 1, start_time: '08:15', end_time: '08:40' },
          { id: '3', school_id: schoolId, period_index: 2, start_time: '08:40', end_time: '09:05' },
          { id: '4', school_id: schoolId, period_index: 3, start_time: '09:05', end_time: '09:30' },
          { id: '5', school_id: schoolId, period_index: 4, start_time: '09:30', end_time: '09:55' },
          { id: '6', school_id: schoolId, period_index: 5, start_time: '10:15', end_time: '10:40' },
          { id: '7', school_id: schoolId, period_index: 6, start_time: '10:40', end_time: '11:10' },
          { id: '8', school_id: schoolId, period_index: 7, start_time: '11:10', end_time: '11:35' },
        ]);
      }

      if (settingsData) {
        setSettingsMaster(settingsData);
      } else {
        setSettingsMaster({
          school_id: schoolId,
          break_after_period_index: 4,
          break_start_time: '09:50',
          break_end_time: '10:15',
        });
      }

      if (classesData && classesData.length > 0) {
        setClassesList(classesData);
        setSelectedClassId(classesData[0].id);
      }

      // C. Fetch all timetable slots for this school and active session
      const { data: allSlots } = await supabase
        .from('timetable')
        .select(`
          id,
          period_index,
          day_of_week,
          class_id,
          subject_id,
          teacher_id,
          room,
          section_id,
          classes:class_id(id, name),
          subjects:subject_id(id, name),
          teachers:teacher_id(id, name)
        `)
        .eq('school_id', schoolId)
        .eq('session_id', activeSessionId);

      const slots = allSlots || [];
      setAllSchoolSlots(slots as any[]);

      // Filter for current teacher's slots
      const mySlots = slots.filter((s: any) => s.teacher_id === teacherId);
      setTeacherSlots(mySlots as any[]);
    } catch (err) {
      console.error('Error fetching timetable data:', err);
    } finally {
      setLoading(false);
    }
  }, [teacher]);

  useEffect(() => {
    fetchTimetableData();
  }, [fetchTimetableData]);

  // Total periods in a day (e.g. 8 periods)
  const totalPeriodsCount = useMemo(() => {
    return periodsMaster.length > 0 ? periodsMaster.length : 8;
  }, [periodsMaster]);

  // Recess / Break configuration
  const breakIndex = settingsMaster?.break_after_period_index ?? 4;
  const breakStart = settingsMaster?.break_start_time || '09:50';
  const breakEnd = settingsMaster?.break_end_time || '10:15';

  // 2. Build Today's Timeline with Live Period Status
  const todayTimeline: PeriodTimelineItem[] = useMemo(() => {
    const items: PeriodTimelineItem[] = [];

    const nowTotalMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    for (let pIdx = 0; pIdx < totalPeriodsCount; pIdx++) {
      // Find time for this period
      const masterP = periodsMaster.find((p) => p.period_index === pIdx);
      const startTime = masterP?.start_time || `${8 + pIdx}:00`;
      const endTime = masterP?.end_time || `${8 + pIdx}:45`;

      // Check slot for this teacher (matches period_index, day_of_week 1 or current day)
      const slot = teacherSlots.find((s) => s.period_index === pIdx);

      // Parse start and end time to determine status
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);
      const startMin = (sH || 8) * 60 + (sM || 0);
      const endMin = (eH || 9) * 60 + (eM || 0);

      let status: 'live' | 'upcoming' | 'completed' | 'free' = 'upcoming';
      if (nowTotalMin >= startMin && nowTotalMin <= endMin) {
        status = 'live';
      } else if (nowTotalMin > endMin) {
        status = 'completed';
      } else {
        status = 'upcoming';
      }

      const isFree = !slot;

      items.push({
        periodIndex: pIdx,
        periodNumber: pIdx + 1,
        timeRange: `${startTime} – ${endTime}`,
        startTime,
        endTime,
        isBreak: false,
        slot,
        isFree,
        status: status === 'live' ? 'live' : isFree ? 'free' : status,
      });

      // Insert Recess / Break card right after breakIndex
      if (pIdx === breakIndex) {
        const [bSH, bSM] = breakStart.split(':').map(Number);
        const [bEH, bEM] = breakEnd.split(':').map(Number);
        const bStartMin = (bSH || 9) * 60 + (bSM || 50);
        const bEndMin = (bEH || 10) * 60 + (bEM || 15);

        let breakStatus: 'live' | 'upcoming' | 'completed' | 'break' = 'break';
        if (nowTotalMin >= bStartMin && nowTotalMin <= bEndMin) {
          breakStatus = 'live';
        } else if (nowTotalMin > bEndMin) {
          breakStatus = 'completed';
        }

        items.push({
          periodIndex: -1,
          periodNumber: 0,
          timeRange: `${breakStart} – ${breakEnd}`,
          startTime: breakStart,
          endTime: breakEnd,
          isBreak: true,
          breakLabel: 'Recess & Refreshment Break',
          isFree: false,
          status: breakStatus,
        });
      }
    }

    return items;
  }, [totalPeriodsCount, periodsMaster, teacherSlots, currentTime, breakIndex, breakStart, breakEnd]);

  // Executive KPI summary calculations
  const kpiStats = useMemo(() => {
    const teachingSlotsCount = teacherSlots.length;
    const freeSlotsCount = Math.max(0, totalPeriodsCount - teachingSlotsCount);
    const uniqueClasses = new Set(teacherSlots.map((s) => s.classes?.name || `Class ${s.class_id}`));

    // Determine current live period if any
    const liveItem = todayTimeline.find((i) => i.status === 'live');
    let currentStatusText = 'Off-Duty / Day Completed';
    if (liveItem) {
      if (liveItem.isBreak) {
        currentStatusText = 'Recess Break Active';
      } else if (liveItem.slot) {
        currentStatusText = `Period ${liveItem.periodNumber} Active (${liveItem.slot.subjects?.name || 'Class'})`;
      } else {
        currentStatusText = `Period ${liveItem.periodNumber} Free Period`;
      }
    } else {
      // Find next upcoming
      const nextItem = todayTimeline.find((i) => i.status === 'upcoming');
      if (nextItem) {
        currentStatusText = `Next: Period ${nextItem.periodNumber} at ${nextItem.startTime}`;
      }
    }

    return {
      teachingSlotsCount,
      freeSlotsCount,
      classesCount: uniqueClasses.size,
      weeklyTotal: teachingSlotsCount * 6, // 6 working days Monday-Saturday
      currentStatusText,
    };
  }, [teacherSlots, totalPeriodsCount, todayTimeline]);

  // 3. Export PDF using jsPDF and jspdf-autotable (Landscape Faculty Timetable)
  const handleExportPDF = async () => {
    setExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const schoolName = 'Al Haram Public School and Iqra Academy';
      const teacherName = teacher?.name || 'Faculty Member';
      const designation = teacher?.designation || 'Senior Educator';

      // Header Brand
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(schoolName, 14, 18);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Faculty Timetable & Lecture Schedule · ${sessionName}`, 14, 25);

      // Teacher info box on right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Teacher: ${teacherName} (${designation})`, doc.internal.pageSize.getWidth() - 14, 18, {
        align: 'right',
      });
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Lectures: ${kpiStats.weeklyTotal} / Week`, doc.internal.pageSize.getWidth() - 14, 25, {
        align: 'right',
      });

      // Prepare Table Headers: [ 'Period / Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ]
      const headers = ['Period / Time', ...DAYS_OF_WEEK.map((d) => d.name)];

      // Prepare Table Rows for each period
      const tableData: any[] = [];

      for (let pIdx = 0; pIdx < totalPeriodsCount; pIdx++) {
        const masterP = periodsMaster.find((p) => p.period_index === pIdx);
        const startTime = masterP?.start_time || `${8 + pIdx}:00`;
        const endTime = masterP?.end_time || `${8 + pIdx}:45`;
        const timeLabel = `P${pIdx + 1}\n(${startTime}-${endTime})`;

        const slot = teacherSlots.find((s) => s.period_index === pIdx);
        const slotText = slot
          ? `${slot.subjects?.name || 'Subject'}\nClass ${slot.classes?.name || slot.class_id}`
          : '— Free —';

        // Routine repeats Monday through Saturday unless specified
        const row = [timeLabel, slotText, slotText, slotText, slotText, slotText, slotText];
        tableData.push(row);

        // Insert Break row
        if (pIdx === breakIndex) {
          tableData.push([
            `BREAK\n(${breakStart}-${breakEnd})`,
            'RECESS',
            'RECESS',
            'RECESS',
            'RECESS',
            'RECESS',
            'RECESS',
          ]);
        }
      }

      // Generate AutoTable
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 32,
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
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
          0: { cellWidth: 26, fontStyle: 'bold', fillColor: [245, 247, 250] },
        },
        didParseCell: function (data: any) {
          const val = String(data.cell.raw || '');
          if (val.includes('RECESS')) {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('Free')) {
            data.cell.styles.textColor = [156, 163, 175];
            data.cell.styles.fontStyle = 'italic';
          } else if (data.column.index > 0 && data.row.section !== 'head') {
            data.cell.styles.textColor = [30, 64, 175];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      // Footer
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on ${dateStr} · GrowMore Teachers Portal`, 14, pageHeight - 8);

      const fileName = `Faculty_Timetable_${teacherName.replace(/\s+/g, '_')}_(${dateStr.replace(/\//g, '-')}).pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Failed to export timetable PDF:', err);
      alert('Could not export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <TeacherLoader message="Loading weekly timetable schedule…" />;
  }

  return (
    <div className="timetable-module-page">
      {/* 1. MODULE CONTROL & TABS STRIP */}
      <div className="module-control-strip">
        <div className="module-strip-context">
          <span className="module-context-chip">
            <CalendarCheck size={14} className="text-emerald" />
            <span>Faculty Schedule</span>
          </span>
          <span className="module-session-pill">
            <Calendar size={13} />
            <span>{sessionName}</span>
          </span>
        </div>

        <div className="module-actions-row no-print">
          {/* View Tabs Navigation */}
          <nav className="module-tabs-nav" aria-label="Timetable Views">
            <button
              type="button"
              className={`module-tab-btn ${activeTab === 'today' ? 'active' : ''}`}
              onClick={() => setActiveTab('today')}
            >
              <Clock size={15} />
              <span>Today's Routine</span>
            </button>
            <button
              type="button"
              className={`module-tab-btn ${activeTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              <Layers size={15} />
              <span>Weekly Matrix</span>
            </button>
            <button
              type="button"
              className={`module-tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
              onClick={() => setActiveTab('classes')}
            >
              <Compass size={15} />
              <span>Class Explorer</span>
            </button>
          </nav>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportPDF}
            disabled={exportingPdf}
            title="Download official PDF timetable"
          >
            <FileDown size={14} />
            <span>{exportingPdf ? 'Exporting…' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrint}
            title="Print Timetable"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI SUMMARY RIBBON */}
      <section className="tt-kpi-bar glass-panel no-print" aria-label="Timetable Metrics">
        <div className="tt-kpi-item">
          <div className="tt-kpi-icon-box blue">
            <BookOpen size={20} />
          </div>
          <div className="tt-kpi-details">
            <span className="tt-kpi-label">Weekly Lectures</span>
            <span className="tt-kpi-val">{kpiStats.weeklyTotal}</span>
            <span className="tt-kpi-sub">{kpiStats.teachingSlotsCount} periods / day</span>
          </div>
        </div>

        <div className="tt-kpi-item">
          <div className="tt-kpi-icon-box emerald">
            <GraduationCap size={20} />
          </div>
          <div className="tt-kpi-details">
            <span className="tt-kpi-label">Assigned Classes</span>
            <span className="tt-kpi-val">{kpiStats.classesCount}</span>
            <span className="tt-kpi-sub">Grades 6th – 9th</span>
          </div>
        </div>

        <div className="tt-kpi-item">
          <div className="tt-kpi-icon-box amber">
            <Coffee size={20} />
          </div>
          <div className="tt-kpi-details">
            <span className="tt-kpi-label">Free Periods Today</span>
            <span className="tt-kpi-val">{kpiStats.freeSlotsCount}</span>
            <span className="tt-kpi-sub">Grading & prep time</span>
          </div>
        </div>

        <div className="tt-kpi-item">
          <div className="tt-kpi-icon-box purple">
            <Clock size={20} />
          </div>
          <div className="tt-kpi-details">
            <span className="tt-kpi-label">Live Status</span>
            <span className="tt-kpi-val" style={{ fontSize: '1rem', fontWeight: 700 }}>
              {kpiStats.currentStatusText}
            </span>
            <span className="tt-kpi-sub">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* TAB 1: TODAY'S LIVE ROUTINE                               */}
      {/* ========================================================= */}
      {activeTab === 'today' && (
        <section className="today-routine-layout">
          {/* Banner Strip */}
          <div className="routine-banner-card glass-panel">
            <div className="routine-banner-left">
              <div className="routine-day-badge">
                <span className="routine-day-short">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="routine-day-date">{currentTime.getDate()}</span>
              </div>
              <div className="routine-info-col">
                <h3>Today's Sequential Lecture Schedule</h3>
                <p>Real-time countdown and active period tracking</p>
              </div>
            </div>

            <div className="routine-banner-right">
              <span className="routine-status-pill active">
                <span className="pulse-dot"></span> Live Routine Active
              </span>
            </div>
          </div>

          {/* Timeline Cards Grid */}
          <div className="timeline-cards-grid">
            {todayTimeline.map((item, idx) => {
              if (item.isBreak) {
                return (
                  <div key="break-card" className="period-card card-break">
                    <div className="period-card-header">
                      <span className="period-badge-chip break-badge">
                        <Coffee size={13} /> Break Time
                      </span>
                      <span className="period-time-range">{item.timeRange}</span>
                    </div>
                    <div className="period-card-body">
                      <h4 className="period-subject-title" style={{ color: '#d97706' }}>
                        {item.breakLabel}
                      </h4>
                      <p className="period-free-note">Staff room refreshment & student recess interval.</p>
                    </div>
                  </div>
                );
              }

              const isLive = item.status === 'live';
              const isCompleted = item.status === 'completed';
              const isFree = item.isFree;

              return (
                <div
                  key={`period-${item.periodIndex}`}
                  className={`period-card ${isLive ? 'card-live' : ''} ${
                    isCompleted ? 'card-completed' : ''
                  } ${isFree ? 'card-free' : ''}`}
                >
                  <div className="period-card-header">
                    <span
                      className={`period-badge-chip ${isFree ? 'free-badge' : 'teaching'}`}
                    >
                      {isFree ? 'Free Slot' : `Period ${item.periodNumber}`}
                    </span>
                    <span className="period-time-range">{item.timeRange}</span>
                  </div>

                  <div className="period-card-body">
                    {isLive && (
                      <div className="period-live-indicator">
                        <span className="pulse-dot"></span> IN PROGRESS NOW
                      </div>
                    )}

                    {isFree ? (
                      <>
                        <h4 className="period-subject-title" style={{ color: 'var(--text-dim)' }}>
                          Free Period / Planning
                        </h4>
                        <p className="period-free-note">
                          No lecture assigned. Dedicated period for test grading, lesson planning, and student
                          mentorship.
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 className="period-subject-title">
                          <span>{item.slot?.subjects?.name || 'Assigned Subject'}</span>
                          {isCompleted && (
                            <CheckCircle2 size={16} className="text-emerald" title="Lecture completed" />
                          )}
                        </h4>
                        <div className="period-class-meta">
                          <span className="period-class-tag">
                            Class {item.slot?.classes?.name || item.slot?.class_id}
                          </span>
                          <span className="period-room-tag">
                            Lecture Room {item.periodNumber}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {!isFree && (
                    <div className="period-card-footer no-print">
                      <button
                        type="button"
                        className="card-action-link"
                        onClick={() => navigate('/attendance')}
                      >
                        <CalendarCheck size={13} />
                        <span>Attendance</span>
                      </button>
                      <button
                        type="button"
                        className="card-action-link"
                        onClick={() => navigate('/homework')}
                      >
                        <BookOpenCheck size={13} />
                        <span>Post Diary</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 2: WEEKLY SCHEDULE MASTER MATRIX                      */}
      {/* ========================================================= */}
      {activeTab === 'weekly' && (
        <section className="weekly-matrix-layout">
          <div className="weekly-matrix-table-wrap">
            <table className="weekly-table" aria-label="Weekly Faculty Timetable">
              <thead>
                <tr>
                  <th>Period</th>
                  {DAYS_OF_WEEK.map((d) => (
                    <th key={d.id}>{d.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: totalPeriodsCount }, (_, pIdx) => {
                  const masterP = periodsMaster.find((p) => p.period_index === pIdx);
                  const startTime = masterP?.start_time || `${8 + pIdx}:00`;
                  const endTime = masterP?.end_time || `${8 + pIdx}:45`;

                  const slot = teacherSlots.find((s) => s.period_index === pIdx);

                  return (
                    <React.Fragment key={`p-row-${pIdx}`}>
                      <tr>
                        <td className="day-header-cell">
                          <strong>Period {pIdx + 1}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {startTime} – {endTime}
                          </div>
                        </td>

                        {DAYS_OF_WEEK.map((day) => (
                          <td key={`slot-${day.id}-${pIdx}`}>
                            {slot ? (
                              <div className="matrix-slot-box teaching">
                                <span className="slot-subject-name">
                                  {slot.subjects?.name || 'Subject'}
                                </span>
                                <span className="slot-class-badge">
                                  Class {slot.classes?.name || slot.class_id}
                                </span>
                              </div>
                            ) : (
                              <div className="matrix-slot-box free">
                                <span className="slot-free-text">Free Period</span>
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>

                      {/* Recess Break Row */}
                      {pIdx === breakIndex && (
                        <tr key="break-row" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                          <td className="day-header-cell" style={{ color: '#d97706' }}>
                            <strong>RECESS</strong>
                            <div style={{ fontSize: '0.72rem' }}>
                              {breakStart} – {breakEnd}
                            </div>
                          </td>
                          {DAYS_OF_WEEK.map((day) => (
                            <td key={`break-col-${day.id}`}>
                              <div className="matrix-slot-box break-slot">
                                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#d97706' }}>
                                  ☕ Recess Break
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CLASS-WISE TIMETABLE EXPLORER                      */}
      {/* ========================================================= */}
      {activeTab === 'classes' && (
        <section className="class-explorer-layout">
          {/* Class Picker Strip */}
          <div className="class-picker-strip glass-panel no-print">
            <div className="class-picker-left">
              <label htmlFor="class-select" style={{ fontSize: '0.86rem', fontWeight: 700 }}>
                Select Class to View:
              </label>
              <select
                id="class-select"
                className="class-picker-select"
                value={selectedClassId || ''}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
              >
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    Class {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="routine-status-pill free">
                <Users size={13} /> Full Class Master View
              </span>
            </div>
          </div>

          {/* Class Timetable Grid */}
          <div className="timeline-cards-grid">
            {Array.from({ length: totalPeriodsCount }, (_, pIdx) => {
              const masterP = periodsMaster.find((p) => p.period_index === pIdx);
              const startTime = masterP?.start_time || `${8 + pIdx}:00`;
              const endTime = masterP?.end_time || `${8 + pIdx}:45`;

              // Find slot for this class
              const classSlot = allSchoolSlots.find(
                (s) => s.class_id === selectedClassId && s.period_index === pIdx
              );

              const isMyClass = classSlot?.teacher_id === teacher?.id;

              return (
                <div
                  key={`class-period-${pIdx}`}
                  className={`period-card ${isMyClass ? 'card-live' : ''}`}
                >
                  <div className="period-card-header">
                    <span className="period-badge-chip teaching">
                      Period {pIdx + 1}
                    </span>
                    <span className="period-time-range">
                      {startTime} – {endTime}
                    </span>
                  </div>

                  <div className="period-card-body">
                    {classSlot ? (
                      <>
                        <h4 className="period-subject-title">
                          <span>{classSlot.subjects?.name || 'Subject'}</span>
                          {isMyClass && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                background: '#10b981',
                                color: '#fff',
                                borderRadius: '4px',
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </h4>
                        <div className="period-class-meta">
                          <span className="period-room-tag">
                            Teacher: <strong>{classSlot.teachers?.name || 'Assigned Staff'}</strong>
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="period-subject-title" style={{ color: 'var(--text-dim)' }}>
                          Free Period / Activity
                        </h4>
                        <p className="period-free-note">No lecture assigned for this class slot.</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
