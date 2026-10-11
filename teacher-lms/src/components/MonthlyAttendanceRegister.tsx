import React, { useState, useEffect, useCallback, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../services/supabase';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCcw,
  Printer,
  FileDown,
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  Award,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import type { SectionOption, AttendanceStatus } from '../types/attendance';
import { TeacherLoader } from './TeacherLoader';
import { StudentAvatar, sanitizeAvatarUrl } from './StudentAvatar';
import './MonthlyAttendanceRegister.css';

interface MonthlyAttendanceRegisterProps {
  teacher: any;
  sections: SectionOption[];
  initialSectionId?: number | null;
  activeSessionId?: number | null;
}

interface MonthlyStudentRow {
  id: number;
  name: string;
  roll_number: string | null;
  father_name: string | null;
  picture_url: string | null;
}

interface AttendanceCellData {
  id?: number;
  status: AttendanceStatus;
  remarks?: string | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const MonthlyAttendanceRegister: React.FC<MonthlyAttendanceRegisterProps> = ({
  teacher,
  sections,
  initialSectionId,
  activeSessionId,
}) => {
  // Current date defaults
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    initialSectionId || (sections.length > 0 ? sections[0].id : null)
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<MonthlyStudentRow[]>([]);
  // Key: `${studentId}_${day}` -> { id, status, remarks }
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceCellData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [holidays, setHolidays] = useState<any[]>([]);

  // Active cell popover for quick status editing
  const [editingCell, setEditingCell] = useState<{
    studentId: number;
    studentName: string;
    day: number;
    currentStatus?: AttendanceStatus;
  } | null>(null);

  // Keep section in sync if initialSectionId changes
  useEffect(() => {
    if (initialSectionId && (!selectedSectionId || selectedSectionId !== initialSectionId)) {
      setSelectedSectionId(initialSectionId);
    }
  }, [initialSectionId]);

  // Number of days in the chosen month
  const totalDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Array of day numbers [1, 2, ... totalDaysInMonth]
  const monthDays = useMemo(() => {
    return Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);
  }, [totalDaysInMonth]);

  // Active section details
  const currentSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId);
  }, [sections, selectedSectionId]);

  // Navigate Previous Month
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
    setEditingCell(null);
  };

  // Navigate Next Month
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
    setEditingCell(null);
  };

  // 1. Fetch Students and Monthly Attendance from Supabase
  const loadMonthlyData = useCallback(async () => {
    if (!selectedSectionId || !teacher) return;
    setLoading(true);
    setEditingCell(null);

    try {
      const schoolId = teacher.school_id || 2;
      const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(
        totalDaysInMonth
      ).padStart(2, '0')}`;

      // A. Fetch students in this section (using real database column section_id and status)
      const { data: studentsData, error: stuErr } = await supabase
        .from('students')
        .select('id, name, roll_number, father_name, picture_url, gender, status')
        .eq('section_id', selectedSectionId)
        .order('id', { ascending: true });

      if (stuErr) throw stuErr;

      // Filter for active students, fallback to all if none marked active
      const activeList = (studentsData || []).filter(
        (s: any) => !s.status || s.status.toLowerCase() === 'active'
      );
      const studentRoster = (activeList.length > 0 ? activeList : (studentsData || [])).map((s: any) => ({
        ...s,
        picture_url: sanitizeAvatarUrl(s.picture_url),
      }));

      // Sort naturally by roll_number (e.g. S2-2 before S2-10) or id
      studentRoster.sort((a: any, b: any) => {
        if (a.roll_number && b.roll_number) {
          return a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true });
        }
        if (a.roll_number) return -1;
        if (b.roll_number) return 1;
        return a.id - b.id;
      });

      // B. Fetch all attendance records for this section in the month
      const { data: attData, error: attErr } = await supabase
        .from('attendance_records')
        .select('id, student_id, date, status, remarks')
        .eq('section_id', selectedSectionId)
        .gte('date', startStr)
        .lte('date', endStr);

      if (attErr) throw attErr;

      // C. Fetch school holidays
      const { data: holData } = await supabase
        .from('holidays')
        .select('*')
        .eq('school_id', schoolId);
      if (holData) setHolidays(holData);

      // Build Fast Lookup Map: key = `${student_id}_${dayNumber}`
      const map = new Map<string, AttendanceCellData>();
      (attData || []).forEach((rec: any) => {
        if (!rec.date) return;
        const dayNum = parseInt(rec.date.split('-')[2], 10);
        map.set(`${rec.student_id}_${dayNum}`, {
          id: rec.id,
          status: (rec.status?.toLowerCase() as AttendanceStatus) || 'present',
          remarks: rec.remarks,
        });
      });

      setStudents(studentRoster);
      setAttendanceMap(map);
    } catch (err) {
      console.error('Error loading monthly attendance register:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSectionId, selectedYear, selectedMonth, totalDaysInMonth, teacher]);

  useEffect(() => {
    loadMonthlyData();
  }, [loadMonthlyData]);

  // 2. Quick Cell Status Change directly from Register
  const handleUpdateCellStatus = async (
    studentId: number,
    day: number,
    newStatus: AttendanceStatus | null
  ) => {
    if (!selectedSectionId || !teacher) return;
    const cellKey = `${studentId}_${day}`;
    setUpdatingCell(cellKey);

    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
    const existing = attendanceMap.get(cellKey);
    const schoolId = teacher.school_id || 2;
    const classId = currentSection?.class_id || 1;

    try {
      if (newStatus === null) {
        // Delete record if exists
        if (existing?.id) {
          await supabase.from('attendance_records').delete().eq('id', existing.id);
        }
        setAttendanceMap((prev) => {
          const next = new Map(prev);
          next.delete(cellKey);
          return next;
        });
      } else {
        let savedRecordId = existing?.id;
        if (existing?.id) {
          const { error: updErr } = await supabase
            .from('attendance_records')
            .update({ status: newStatus })
            .eq('id', existing.id);
          if (updErr) throw updErr;
        } else {
          const payload: any = {
            student_id: studentId,
            class_id: classId,
            section_id: selectedSectionId,
            session_id: activeSessionId || 6,
            date: dateStr,
            status: newStatus,
            school_id: schoolId,
            source: 'monthly_register',
          };
          const { data: newRec, error: insErr } = await supabase
            .from('attendance_records')
            .insert(payload)
            .select('id')
            .single();
          if (insErr) throw insErr;
          savedRecordId = newRec?.id;
        }

        setAttendanceMap((prev) => {
          const next = new Map(prev);
          next.set(cellKey, {
            id: savedRecordId,
            status: newStatus,
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Error updating cell status:', err);
    } finally {
      setUpdatingCell(null);
      setEditingCell(null);
    }
  };

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

  // Compute student stats
  const computeStudentStats = (studentId: number) => {
    let p = 0;
    let a = 0;
    let l = 0;
    let lv = 0;
    let totalTracked = 0;

    monthDays.forEach((day) => {
      const rec = attendanceMap.get(`${studentId}_${day}`);
      if (rec) {
        totalTracked++;
        if (rec.status === 'present') p++;
        else if (rec.status === 'absent') a++;
        else if (rec.status === 'late') l++;
        else if (rec.status === 'leave') lv++;
      }
    });

    const percent = totalTracked > 0 ? Math.round((p / totalTracked) * 100) : 0;
    return { p, a, l, lv, totalTracked, percent };
  };

  // Class Aggregate Metrics
  const classMetrics = useMemo(() => {
    if (students.length === 0) {
      return { avgPercent: 0, perfectCount: 0, atRiskCount: 0, recordedDatesCount: 0 };
    }

    let totalPercentSum = 0;
    let perfectCount = 0;
    let atRiskCount = 0;
    const datesRecordedSet = new Set<number>();

    students.forEach((s) => {
      const { p, totalTracked, percent } = computeStudentStats(s.id);
      totalPercentSum += percent;
      if (totalTracked >= 10 && percent === 100) perfectCount++;
      if (totalTracked >= 5 && percent < 75) atRiskCount++;

      monthDays.forEach((day) => {
        if (attendanceMap.has(`${s.id}_${day}`)) {
          datesRecordedSet.add(day);
        }
      });
    });

    const avgPercent = Math.round(totalPercentSum / students.length);
    return {
      avgPercent,
      perfectCount,
      atRiskCount,
      recordedDatesCount: datesRecordedSet.size,
    };
  }, [students, attendanceMap, monthDays]);

  // Holiday day lookup map for current month: { [dayNumber]: holidayName }
  const holidayDayMap: Record<number, string> = useMemo(() => {
    const map: Record<number, string> = {};
    (holidays || []).forEach((h) => {
      if (!h.start_date) return;
      const sDate = new Date(h.start_date);
      const eDate = h.end_date ? new Date(h.end_date) : sDate;
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const curDate = new Date(selectedYear, selectedMonth - 1, d);
        curDate.setHours(0, 0, 0, 0);
        const s = new Date(sDate);
        s.setHours(0, 0, 0, 0);
        const e = new Date(eDate);
        e.setHours(0, 0, 0, 0);
        if (curDate >= s && curDate <= e) {
          map[d] = h.name;
        }
      }
    });
    return map;
  }, [holidays, selectedYear, selectedMonth, totalDaysInMonth]);

  // Working days in month (excluding Sundays and holidays)
  const workingDaysCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const date = new Date(selectedYear, selectedMonth - 1, d);
      if (date.getDay() !== 0 && !holidayDayMap[d]) {
        count++;
      }
    }
    return count;
  }, [totalDaysInMonth, selectedYear, selectedMonth, holidayDayMap]);

  // PDF Export Handler - IDENTICAL ARCHITECTURE & DESIGN AS @AttendanceReport
  const handleExportPDF = async () => {
    if (!selectedSectionId || students.length === 0) {
      alert('No student records available to export.');
      return;
    }

    setExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Set font styles
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);

      // Add title
      const title = `Monthly Attendance Report -`;
      doc.text(title, 14, 20);

      // Add class/section to top right
      const classSectionStr = currentSection
        ? `${currentSection.class_name} (${currentSection.name})`
        : 'Class Attendance';
      doc.text(classSectionStr, doc.internal.pageSize.getWidth() - 14, 20, { align: 'right' });

      // Add subtitle with month and stats
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const monthYear = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
      doc.text(`Month: ${monthYear}`, 14, 30);
      doc.text(`Working Days: ${workingDaysCount}`, 80, 30);
      doc.text(`Average Attendance: ${classMetrics.avgPercent}%`, 160, 30);

      // Prepare table data
      const sortedStudents = [...filteredStudents];
      const tableData: any[] = sortedStudents.map((student, idx) => {
        const row = [
          (idx + 1).toString(),
          (student.roll_number || student.id).toString(),
          student.name,
          ...Array.from({ length: totalDaysInMonth }, (_, dayIdx) => {
            const dayNum = dayIdx + 1;
            const date = new Date(selectedYear, selectedMonth - 1, dayNum);
            const isSunday = date.getDay() === 0;
            if (isSunday) return '';

            // Check for holiday
            if (holidayDayMap[dayNum]) return '';

            const cell = attendanceMap.get(`${student.id}_${dayNum}`);
            if (!cell || !cell.status) return '-';
            const s = cell.status.toLowerCase();
            if (s === 'present') return 'P';
            if (s === 'absent') return 'A';
            if (s === 'late') return 'Lt';
            if (s === 'leave') return 'L';
            return '-';
          }),
        ];
        return row;
      });

      // Add summary row for absents/leaves
      const summaryRow = [
        '',
        '',
        'Absents/Leaves:',
        ...Array.from({ length: totalDaysInMonth }, (_, dayIdx) => {
          const dayNum = dayIdx + 1;
          const date = new Date(selectedYear, selectedMonth - 1, dayNum);
          const isSunday = date.getDay() === 0;
          if (isSunday) return '';

          // Check for holidays
          if (holidayDayMap[dayNum]) return '';

          // Count absent and leave students for this day
          let absentCount = 0;
          sortedStudents.forEach((student) => {
            const cell = attendanceMap.get(`${student.id}_${dayNum}`);
            if (cell && (cell.status === 'absent' || cell.status === 'leave')) {
              absentCount++;
            }
          });

          return absentCount > 0 ? absentCount.toString() : '-';
        }),
      ];
      tableData.push(summaryRow);

      // Prepare table headers
      const headers = [
        '#',
        'ID',
        'Student Name',
        ...Array.from({ length: totalDaysInMonth }, (_, i) => (i + 1).toString()),
      ];

      // Build columnStyles for uniform day columns
      const totalWidth = 270;
      const fixedColsWidth = 8 + 15 + 40; // #, ID, Name
      const daysColCount = totalDaysInMonth;
      const dayColWidth = (totalWidth - fixedColsWidth) / daysColCount;
      const columnStyles: any = {
        0: { cellWidth: 8 },
        1: { cellWidth: 15 },
        2: { cellWidth: 40, halign: 'left' },
      };
      for (let i = 3; i < totalDaysInMonth + 3; i++) {
        columnStyles[i] = { cellWidth: dayColWidth, halign: 'center' };
      }

      // Add table using autoTable
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 35,
        margin: { left: 14 },
        styles: {
          fontSize: 8,
          cellPadding: 1,
          overflow: 'linebreak',
          halign: 'center',
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles,
        didParseCell: function (data: any) {
          // Style for Sunday columns
          if (data.column.index > 2) {
            const dayNum = data.column.index - 2;
            const date = new Date(selectedYear, selectedMonth - 1, dayNum);
            if (date.getDay() === 0) {
              data.cell.styles.fillColor = [255, 235, 235];
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
          // Style for holiday columns
          if (data.column.index > 2) {
            const dayNum = data.column.index - 2;
            if (holidayDayMap[dayNum]) {
              data.cell.styles.fillColor = [234, 247, 255];
              data.cell.styles.textColor = [74, 108, 247];
              if (data.row.section !== 'head') {
                data.cell.text = [''];
              }
            }
          }
          // Style for status cells
          if (data.column.index > 2 && data.cell.raw !== '') {
            const cellValue = String(data.cell.raw || '');

            // Check if this is the summary row (last row)
            const isSummaryRow = data.row.index === tableData.length - 1;

            if (isSummaryRow) {
              // Style summary row
              data.cell.styles.fillColor = [248, 249, 250];
              data.cell.styles.fontStyle = 'bold';
              if (cellValue !== '-' && cellValue !== '') {
                data.cell.styles.textColor = [220, 38, 38];
              }
            } else {
              // Style regular status cells
              if (cellValue === 'HL') {
                data.cell.styles.textColor = [236, 72, 153];
                data.cell.styles.fontStyle = 'bold';
              } else if (cellValue === 'P') {
                data.cell.styles.textColor = [22, 163, 74];
              } else if (cellValue === 'A') {
                data.cell.styles.textColor = [220, 38, 38];
              } else if (cellValue === 'L') {
                data.cell.styles.textColor = [74, 108, 247];
              } else if (cellValue === 'Lt') {
                data.cell.styles.textColor = [245, 158, 66];
              }
            }
          }
        },
      });

      // Add holidays list at bottom if any holidays in this month
      const monthHolidays = (holidays || []).filter((h) => {
        if (!h.start_date) return false;
        const sMonth = new Date(h.start_date).getMonth() + 1;
        const sYear = new Date(h.start_date).getFullYear();
        return sYear === selectedYear && sMonth === selectedMonth;
      });

      if (monthHolidays.length > 0) {
        const sortedHolidays = [...monthHolidays].sort(
          (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
        const pageHeight = doc.internal.pageSize.height;
        const finalY = pageHeight - (sortedHolidays.length * 5 + 20);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Holidays:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        sortedHolidays.forEach((holiday: any, index: number) => {
          const startDate = holiday.start_date;
          const endDate = holiday.end_date;
          const dateRange = startDate === endDate || !endDate ? startDate : `${startDate} - ${endDate}`;
          doc.text(`• ${holiday.name} (${dateRange})`, 18, finalY + (index + 1) * 5);
        });
      }

      // Add footer with page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10
        );
      }

      // Format date for filename: Attendance Report (DD-MMM-YYYY).pdf
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = months[now.getMonth()];
      const yearStr = now.getFullYear();
      const fileName = `Attendance Report (${day}-${monthStr}-${yearStr}).pdf`;

      doc.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="monthly-register-container">
      {/* 1. TOP TOOLBAR & CONTROLS STRIP */}
      <div className="register-toolbar glass-panel no-print">
        <div className="toolbar-left-group">
          {/* Section Picker */}
          <div className="register-field">
            <label className="register-label">Class & Section:</label>
            <select
              className="toolbar-select register-select"
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

          {/* Month / Year Navigator */}
          <div className="register-field">
            <label className="register-label">Month & Year:</label>
            <div className="month-stepper">
              <button
                type="button"
                className="stepper-arrow-btn"
                onClick={handlePrevMonth}
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="month-display-pill">
                <CalendarRange size={14} className="text-emerald" />
                <span className="month-name-text">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              </div>

              <button
                type="button"
                className="stepper-arrow-btn"
                onClick={handleNextMonth}
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="register-field register-search-field">
            <label className="register-label">Filter Student:</label>
            <div className="search-wrapper">
              <Search size={14} className="search-lens" />
              <input
                type="text"
                className="toolbar-search-input"
                placeholder="Name or roll no…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar Actions (Export PDF, Print, Refresh) */}
        <div className="toolbar-right-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadMonthlyData}
            disabled={loading}
            title="Reload from database"
          >
            <RotateCcw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm register-export-btn"
            onClick={handleExportPDF}
            disabled={exportingPdf || loading || students.length === 0}
            title="Export exact PDF matching Attendance Report"
          >
            <FileDown size={15} />
            <span>{exportingPdf ? 'Generating…' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm register-print-btn"
            onClick={handlePrint}
            title="Print Attendance Register Sheet"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE MONTHLY SUMMARY KPI RIBBON */}
      <div className="register-kpi-bar glass-panel no-print">
        <div className="kpi-chip total">
          <span className="kpi-label">Enrolled Students</span>
          <span className="kpi-val">{students.length}</span>
        </div>
        <div className="kpi-chip present">
          <span className="kpi-label">Class Avg Rate</span>
          <span className="kpi-val text-emerald">{classMetrics.avgPercent}%</span>
        </div>
        <div className="kpi-chip late">
          <span className="kpi-label">Recorded Days</span>
          <span className="kpi-val text-amber">{classMetrics.recordedDatesCount} Days</span>
        </div>
        <div className="kpi-chip leave">
          <span className="kpi-label">100% Attendance</span>
          <span className="kpi-val text-indigo">
            <Award size={16} /> {classMetrics.perfectCount}
          </span>
        </div>
        {classMetrics.atRiskCount > 0 && (
          <div className="kpi-chip absent">
            <span className="kpi-label">Low Attendance (&lt;75%)</span>
            <span className="kpi-val text-rose">
              <AlertTriangle size={15} /> {classMetrics.atRiskCount}
            </span>
          </div>
        )}
      </div>

      {/* 3. LEGEND STRIP */}
      <div className="register-legend-strip no-print">
        <div className="legend-items">
          <span className="legend-chip legend-p">
            <strong>P</strong> Present
          </span>
          <span className="legend-chip legend-a">
            <strong>A</strong> Absent
          </span>
          <span className="legend-chip legend-l">
            <strong>L</strong> Late
          </span>
          <span className="legend-chip legend-lv">
            <strong>LV</strong> Leave
          </span>
          <span className="legend-chip legend-sun">
            <strong>S</strong> Sunday
          </span>
          <span className="legend-chip legend-empty">
            <strong>—</strong> Unmarked
          </span>
        </div>
        <span className="legend-tip">
          💡 Click any cell on the matrix to quickly update or change a student's status.
        </span>
      </div>

      {/* 4. PRINT HEADER (Only visible when printing) */}
      <div className="print-only-header">
        <h2 className="print-school-name">{teacher?.school_name || 'Al Haram Public School and Iqra Academy'}</h2>
        <h3 className="print-report-title">
          MONTHLY CLASS ATTENDANCE REGISTER — {MONTH_NAMES[selectedMonth - 1].toUpperCase()}{' '}
          {selectedYear}
        </h3>
        <div className="print-meta-row">
          <span>
            <strong>Class & Section:</strong> {currentSection?.class_name} · Section {currentSection?.name}
          </span>
          <span>
            <strong>Class In-Charge:</strong> {teacher?.name || 'Faculty'}
          </span>
          <span>
            <strong>Working Days Recorded:</strong> {classMetrics.recordedDatesCount}
          </span>
          <span>
            <strong>Generated Date:</strong> {today.toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* 5. THE ATTENDANCE MATRIX TABLE */}
      {loading ? (
        <div className="register-loader-card glass-panel">
          <TeacherLoader
            message={`Loading monthly attendance grid for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}…`}
            fullScreen={false}
          />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="register-empty-card glass-panel">
          <FileSpreadsheet size={40} className="text-dim" />
          <h3>No Student Records</h3>
          <p>
            {students.length === 0
              ? `No active students found in ${currentSection?.class_name} · Section ${currentSection?.name}.`
              : `No students match your filter "${searchQuery}".`}
          </p>
        </div>
      ) : (
        <div className="matrix-table-container glass-panel">
          <div className="matrix-table-scroll">
            <table className="register-matrix-table">
              <thead>
                {/* Row 1: Day of Month Numbers */}
                <tr className="header-days-row">
                  <th className="sticky-col col-idx" rowSpan={2}>
                    #
                  </th>
                  <th className="sticky-col col-roll" rowSpan={2}>
                    Roll
                  </th>
                  <th className="sticky-col col-name" rowSpan={2}>
                    Student Name
                  </th>

                  {/* Day Columns */}
                  {monthDays.map((day) => {
                    const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                    const isSun = dateObj.getDay() === 0;
                    const isToday =
                      today.getFullYear() === selectedYear &&
                      today.getMonth() + 1 === selectedMonth &&
                      today.getDate() === day;

                    return (
                      <th
                        key={day}
                        className={`day-col-header ${isSun ? 'col-sunday' : ''} ${
                          isToday ? 'col-today' : ''
                        }`}
                        title={`${MONTH_NAMES[selectedMonth - 1]} ${day}, ${selectedYear} (${
                          ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                            dateObj.getDay()
                          ]
                        })`}
                      >
                        <span className="day-number-text">{day}</span>
                      </th>
                    );
                  })}

                  {/* Summary Headers */}
                  <th className="summary-col col-p" rowSpan={2} title="Total Presents">
                    P
                  </th>
                  <th className="summary-col col-a" rowSpan={2} title="Total Absents">
                    A
                  </th>
                  <th className="summary-col col-l" rowSpan={2} title="Total Late">
                    L
                  </th>
                  <th className="summary-col col-lv" rowSpan={2} title="Total Leaves">
                    LV
                  </th>
                  <th className="summary-col col-pct" rowSpan={2} title="Attendance %">
                    %
                  </th>
                </tr>

                {/* Row 2: Day of Week Letter (M, T, W, T, F, S, S) */}
                <tr className="header-weekday-row">
                  {monthDays.map((day) => {
                    const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                    const isSun = dateObj.getDay() === 0;
                    const dayLetter = DAY_LETTERS[dateObj.getDay()];

                    return (
                      <th key={day} className={`weekday-letter-cell ${isSun ? 'col-sunday' : ''}`}>
                        {dayLetter}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student, sIdx) => {
                  const stats = computeStudentStats(student.id);
                  const isLow = stats.totalTracked >= 5 && stats.percent < 75;

                  return (
                    <tr key={student.id} className="student-matrix-row">
                      {/* Sticky Index */}
                      <td className="sticky-col col-idx text-dim">{sIdx + 1}</td>

                      {/* Sticky Roll Badge */}
                      <td className="sticky-col col-roll">
                        <span className="matrix-roll-pill">{student.roll_number || '—'}</span>
                      </td>

                      {/* Sticky Student Name + Avatar */}
                      <td className="sticky-col col-name">
                        <div className="matrix-student-info">
                          <StudentAvatar
                            src={student.picture_url}
                            name={student.name}
                            gender={student.gender}
                            size={32}
                          />
                          <div className="matrix-names-block">
                            <span className="matrix-student-name">{student.name}</span>
                            {student.father_name && (
                              <span className="matrix-father-name">S/O: {student.father_name}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Day Status Cells */}
                      {monthDays.map((day) => {
                        const cellKey = `${student.id}_${day}`;
                        const rec = attendanceMap.get(cellKey);
                        const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                        const isSun = dateObj.getDay() === 0;
                        const isUpdating = updatingCell === cellKey;
                        const status = rec?.status;

                        return (
                          <td
                            key={day}
                            className={`matrix-status-cell ${isSun ? 'cell-sunday' : ''} ${
                              status ? `status--${status}` : 'status--empty'
                            }`}
                            onClick={() => {
                              if (isSun) return; // Do not edit Sunday
                              setEditingCell({
                                studentId: student.id,
                                studentName: student.name,
                                day,
                                currentStatus: status,
                              });
                            }}
                            title={`${student.name} — ${MONTH_NAMES[selectedMonth - 1]} ${day}: ${
                              isSun ? 'Sunday (Weekend)' : status ? status.toUpperCase() : 'Unmarked'
                            }`}
                          >
                            {isUpdating ? (
                              <span className="cell-spinner" />
                            ) : isSun ? (
                              <span className="cell-sun-tag">S</span>
                            ) : status === 'present' ? (
                              <span className="cell-badge badge-p">P</span>
                            ) : status === 'absent' ? (
                              <span className="cell-badge badge-a">A</span>
                            ) : status === 'late' ? (
                              <span className="cell-badge badge-l">L</span>
                            ) : status === 'leave' ? (
                              <span className="cell-badge badge-lv">LV</span>
                            ) : (
                              <span className="cell-empty-dash">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary Columns */}
                      <td className="summary-col col-p font-bold text-emerald">{stats.p}</td>
                      <td className="summary-col col-a font-bold text-rose">{stats.a}</td>
                      <td className="summary-col col-l font-bold text-amber">{stats.l}</td>
                      <td className="summary-col col-lv font-bold text-indigo">{stats.lv}</td>
                      <td className="summary-col col-pct">
                        <span
                          className={`pct-badge ${
                            stats.percent >= 85
                              ? 'pct-high'
                              : stats.percent >= 70
                              ? 'pct-mid'
                              : stats.totalTracked > 0
                              ? 'pct-low'
                              : 'pct-none'
                          }`}
                        >
                          {stats.totalTracked > 0 ? `${stats.percent}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. CELL QUICK-EDIT MODAL / POPOVER */}
      {editingCell && (
        <div className="cell-popover-overlay no-print" onClick={() => setEditingCell(null)}>
          <div className="cell-popover-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="popover-header">
              <div>
                <h4 className="popover-title">{editingCell.studentName}</h4>
                <p className="popover-date">
                  {MONTH_NAMES[selectedMonth - 1]} {editingCell.day}, {selectedYear}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setEditingCell(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="popover-status-grid">
              <button
                type="button"
                className={`popover-btn p ${editingCell.currentStatus === 'present' ? 'active' : ''}`}
                onClick={() =>
                  handleUpdateCellStatus(editingCell.studentId, editingCell.day, 'present')
                }
              >
                <Check size={16} />
                <span>Mark Present (P)</span>
              </button>

              <button
                type="button"
                className={`popover-btn a ${editingCell.currentStatus === 'absent' ? 'active' : ''}`}
                onClick={() =>
                  handleUpdateCellStatus(editingCell.studentId, editingCell.day, 'absent')
                }
              >
                <XCircle size={16} />
                <span>Mark Absent (A)</span>
              </button>

              <button
                type="button"
                className={`popover-btn l ${editingCell.currentStatus === 'late' ? 'active' : ''}`}
                onClick={() =>
                  handleUpdateCellStatus(editingCell.studentId, editingCell.day, 'late')
                }
              >
                <Clock size={16} />
                <span>Mark Late (L)</span>
              </button>

              <button
                type="button"
                className={`popover-btn lv ${editingCell.currentStatus === 'leave' ? 'active' : ''}`}
                onClick={() =>
                  handleUpdateCellStatus(editingCell.studentId, editingCell.day, 'leave')
                }
              >
                <Calendar size={16} />
                <span>Mark Leave (LV)</span>
              </button>
            </div>

            {editingCell.currentStatus && (
              <button
                type="button"
                className="btn btn-ghost btn-sm w-full mt-2 text-rose"
                onClick={() => handleUpdateCellStatus(editingCell.studentId, editingCell.day, null)}
              >
                Clear / Remove Attendance Mark
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. PRINT FOOTER (Signatures) */}
      <div className="print-signatures-block">
        <div className="sig-item">
          <div className="sig-line" />
          <span>Class In-Charge Signature</span>
        </div>
        <div className="sig-item">
          <div className="sig-line" />
          <span>Academic Coordinator</span>
        </div>
        <div className="sig-item">
          <div className="sig-line" />
          <span>Principal / Head of Institution</span>
        </div>
      </div>
    </div>
  );
};
