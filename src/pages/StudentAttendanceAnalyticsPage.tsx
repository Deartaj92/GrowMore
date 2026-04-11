import React, { useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { CircularProgress } from '@mui/material';
import {
  Analytics,
  Assessment,
  Groups,
  School,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useTheme } from '../components/Layout/contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
import AppDateField from '../components/shared/AppDateField';
import NoSessionsFound from '../components/NoSessionsFound';
import { getStudentDisplayId } from '../utils/studentUtils';
import { sortClasses } from '../utils/classUtils';
import {
  CARD_RADIUS_LG,
  clayCardStyle,
  clayInputStyle,
  clayPanelStyle,
  getDashboardPalette,
  getLayoutPalette,
  isDark as checkIsDark,
  minimalSelectMenuStyle,
} from '../styles/DesignSystem';

type AttendanceRow = {
  id: number;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'late' | 'half_day';
  student_id: number;
  class_id: number;
  section_id: number;
};

type StudentRow = {
  id: number;
  name: string;
  roll_number?: string;
  class_id: number | null;
  section_id: number | null;
  session_id?: number | null;
};

type ClassRow = {
  id: number;
  name: string;
};

type SectionRow = {
  id: number;
  name: string;
  class_id: number;
};

type SessionRow = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
};

const PIE_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#6366f1'];

const isPresentLike = (status: AttendanceRow['status']) =>
  ['present', 'late', 'half_day'].includes(status);

const shortDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Page = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    const dark = checkIsDark(theme);
    return `
      radial-gradient(circle at top left, ${dark ? 'rgba(255,255,255,0.035)' : `${theme.ACCENT}10`} 0%, transparent 28%),
      linear-gradient(180deg, rgba(255,255,255,${dark ? '0.025' : '0.36'}) 0%, transparent 16%),
      ${layout.shellBg}
    `;
  }};
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: 0.375rem;
    gap: 0.3rem;
  }
`;

const Hero = styled.section`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayPanelStyle}
      border: 1px solid ${layout.shellBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(340px, 0.9fr);
  gap: 0.65rem;
  padding: 0.75rem 0.85rem;
  border-radius: ${CARD_RADIUS_LG};

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const TitleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
`;

const TitleIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT} 0%, #2563eb 100%);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.28);
  flex-shrink: 0;
`;

const TitleBlock = styled.div`
  min-width: 0;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.02rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  letter-spacing: 0.2px;
`;

const Subtitle = styled.p`
  margin: 0.18rem 0 0;
  font-size: 0.78rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  line-height: 1.45;
`;

const SessionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

const SessionChip = styled.div`
  ${({ theme }) => {
    const palette = getDashboardPalette(theme);
    return css`
      background: ${palette.accentTintSoft};
      border: 1px solid ${palette.divider};
      color: ${theme.TEXT_PRIMARY};
    `;
  }}
  border-radius: 999px;
  padding: 0.28rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 700;
`;

const FilterCard = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayCardStyle}
      border: 1px solid ${layout.shellBorder};
    `;
  }}
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Input = styled.input`
  ${clayInputStyle}
  padding: 0.5rem 0.72rem;
  border-radius: ${CARD_RADIUS_LG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
`;

const Select = styled.select`
  ${clayInputStyle}
  ${minimalSelectMenuStyle}
  padding: 0.5rem 1.9rem 0.5rem 0.72rem;
  border-radius: ${CARD_RADIUS_LG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  cursor: pointer;
`;

const MiniNote = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const MetricsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 0.4rem;
`;

const MetricCard = styled.article`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayCardStyle}
      border: 1px solid ${layout.shellBorder};
    `;
  }}
  padding: 0.65rem 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 92px;
`;

const MetricLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.73rem;
  font-weight: 700;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const MetricValue = styled.div`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.01em;
`;

const MetricMeta = styled.div`
  color: ${({ theme }) => getLayoutPalette(theme).shellSoftText};
  font-size: 0.72rem;
  line-height: 1.35;
`;

const LayoutGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0.45rem;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section<{ $span?: number }>`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayPanelStyle}
      border: 1px solid ${layout.shellBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  grid-column: span ${({ $span = 12 }) => $span};
  padding: 0.72rem 0.8rem;
  border-radius: ${CARD_RADIUS_LG};
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;

  @media (max-width: 1100px) {
    grid-column: span 1;
  }
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const PanelTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.38rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const PanelMeta = styled.span`
  font-size: 0.72rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const InsightStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InsightCard = styled.div`
  ${({ theme }) => {
    const palette = getDashboardPalette(theme);
    return css`
      background: ${palette.selectionBg};
      border: 1px solid ${palette.divider};
    `;
  }}
  border-radius: 12px;
  padding: 0.55rem 0.65rem;
`;

const InsightLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const InsightValue = styled.div`
  margin-top: 0.18rem;
  font-size: 0.86rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ChartBox = styled.div`
  width: 100%;
  height: 280px;
`;

const TableWrap = styled.div`
  overflow: auto;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
`;

const Table = styled.table`
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
`;

const TH = styled.th`
  padding: 0.62rem 0.7rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  background: ${({ theme }) => getDashboardPalette(theme).selectionBg};
  border-bottom: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
  white-space: nowrap;
`;

const TD = styled.td`
  padding: 0.62rem 0.7rem;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
  white-space: nowrap;
`;

const NameCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
`;

const SubText = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const BadgePill = styled.span<{ $tone: 'success' | 'warning' | 'danger' | 'info' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  padding: 0.24rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  ${({ $tone }) => {
    if ($tone === 'success') return css`background: rgba(34, 197, 94, 0.12); color: #16a34a;`;
    if ($tone === 'warning') return css`background: rgba(245, 158, 11, 0.12); color: #d97706;`;
    if ($tone === 'danger') return css`background: rgba(239, 68, 68, 0.12); color: #dc2626;`;
    return css`background: rgba(59, 130, 246, 0.12); color: #2563eb;`;
  }}
`;

const EmptyState = styled.div`
  padding: 1.1rem;
  text-align: center;
  font-size: 0.8rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const CenterPanel = styled(Panel)`
  align-items: center;
  justify-content: center;
  min-height: 180px;
`;

const StudentAttendanceAnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const toast = useToast();
  const isDark = theme === 'dark';

  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [studentQuery, setStudentQuery] = useState('');
  const [loadingRef, setLoadingRef] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [didSeedRange, setDidSeedRange] = useState(false);

  useEffect(() => {
    const fetchReferenceData = async () => {
      if (!user?.school_id) return;

      setLoadingRef(true);
      try {
        const [sessionRes, classesRes, sectionsRes, studentsRes] = await Promise.all([
          supabase
            .from('sessions')
            .select('id, name, start_date, end_date')
            .eq('school_id', user.school_id)
            .eq('is_active', true)
            .order('start_date', { ascending: false })
            .limit(1),
          supabase
            .from('classes')
            .select('id, name')
            .eq('school_id', user.school_id)
            .order('name', { ascending: true }),
          supabase
            .from('sections')
            .select('id, name, class_id')
            .eq('school_id', user.school_id)
            .order('name', { ascending: true }),
          supabase
            .from('students')
            .select('id, name, roll_number, class_id, section_id, session_id')
            .eq('school_id', user.school_id)
            .eq('status', 'active')
            .order('name', { ascending: true }),
        ]);

        if (sessionRes.error) throw sessionRes.error;
        if (classesRes.error) throw classesRes.error;
        if (sectionsRes.error) throw sectionsRes.error;
        if (studentsRes.error) throw studentsRes.error;

        const session = sessionRes.data?.[0] || null;
        setActiveSession(session);
        setHasActiveSession(Boolean(session));
        setClasses((classesRes.data || []) as ClassRow[]);
        setSections((sectionsRes.data || []) as SectionRow[]);
        setStudents((studentsRes.data || []) as StudentRow[]);

        if (session && !didSeedRange) {
          setFromDate(session.start_date);
          setToDate(session.end_date);
          setDidSeedRange(true);
        }
      } catch (error: any) {
        toast.showToast(`Failed to load student attendance analytics: ${error?.message || 'Unknown error'}`, 'error');
      } finally {
        setLoadingRef(false);
      }
    };

    fetchReferenceData();
  }, [didSeedRange, toast, user?.school_id]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?.school_id || !activeSession?.id || !fromDate || !toDate) return;

      setLoadingAttendance(true);
      try {
        const data = await fetchAllRows<AttendanceRow>(async (from, to) => (
          supabase
            .from('attendance_records')
            .select('id, date, status, student_id, class_id, section_id')
            .eq('school_id', user.school_id)
            .eq('session_id', activeSession.id)
            .gte('date', fromDate)
            .lte('date', toDate)
            .order('date', { ascending: true })
            .range(from, to)
        ));

        setAttendance(data || []);
      } catch (error: any) {
        toast.showToast(`Failed to load attendance records: ${error?.message || 'Unknown error'}`, 'error');
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [activeSession?.id, fromDate, toDate, toast, user?.school_id]);

  const classesMap = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const sectionsMap = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const studentsMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const availableClasses = useMemo(
    () => Array.from(new Set(classes.map((item) => item.name))).sort(),
    [classes]
  );

  const filteredSections = useMemo(() => {
    if (selectedClass === 'all') return sections;
    const classId = classes.find((c) => c.name === selectedClass)?.id;
    if (!classId) return [];
    return sections.filter((s) => s.class_id === classId);
  }, [classes, sections, selectedClass]);

  const filteredStudents = useMemo(() => (
    students.filter((student) => {
      const className = student.class_id ? classesMap.get(student.class_id) : null;
      const matchesClass = selectedClass === 'all' || className === selectedClass;
      const matchesSection = selectedSection === 'all' || String(student.section_id) === selectedSection;
      const query = studentQuery.trim().toLowerCase();
      const matchesQuery = !query || 
        student.name.toLowerCase().includes(query) || 
        (student.roll_number?.toLowerCase().includes(query));
      return matchesClass && matchesSection && matchesQuery;
    })
  ), [selectedClass, selectedSection, studentQuery, students, classesMap]);

  const filteredStaffIds = useMemo(() => new Set(filteredStudents.map((item) => item.id)), [filteredStudents]);

  const filteredAttendance = useMemo(() => (
    attendance.filter((record) => {
      if (!filteredStaffIds.has(record.student_id)) return false;
      return true;
    })
  ), [attendance, filteredStaffIds]);

  const studentsWithAttendance = useMemo(() => {
    const studentIdsWithRecords = new Set(filteredAttendance.map((r) => r.student_id));
    return filteredStudents.filter((student) => studentIdsWithRecords.has(student.id));
  }, [filteredAttendance, filteredStudents]);

  const aggregatedStudents = useMemo(() => {
    const map = new Map<number, {
      id: number;
      name: string;
      roll_number?: string;
      className: string;
      sectionName: string;
      total: number;
      present: number;
      late: number;
      absent: number;
      leave: number;
      halfDay: number;
    }>();

    studentsWithAttendance.forEach((student) => {
      const className = student.class_id ? classesMap.get(student.class_id) || 'Unassigned' : 'Unassigned';
      const sectionName = student.section_id ? sectionsMap.get(student.section_id)?.name || '' : '';
      map.set(student.id, {
        id: student.id,
        name: student.name,
        roll_number: student.roll_number,
        className,
        sectionName,
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        halfDay: 0,
      });
    });

    filteredAttendance.forEach((record) => {
      const student = map.get(record.student_id);
      if (!student) return;

      student.total += 1;
      if (record.status === 'present') student.present += 1;
      if (record.status === 'late') student.late += 1;
      if (record.status === 'absent') student.absent += 1;
      if (record.status === 'leave') student.leave += 1;
      if (record.status === 'half_day') student.halfDay += 1;
    });

    return Array.from(map.values()).map((item) => {
      const attendedDays = item.present + item.late + item.halfDay;
      return {
        ...item,
        attendedDays,
        attendanceRate: item.total ? Math.round((attendedDays / item.total) * 100) : 0,
      };
    });
  }, [filteredAttendance, studentsWithAttendance, classesMap, sectionsMap]);

  const overview = useMemo(() => {
    const recordedDays = Array.from(new Set(filteredAttendance.map((item) => item.date))).sort();
    const attendanceRecords = filteredAttendance.length;
    const presentDays = filteredAttendance.filter((item) => item.status === 'present').length;
    const lateDays = filteredAttendance.filter((item) => item.status === 'late').length;
    const halfDays = filteredAttendance.filter((item) => item.status === 'half_day').length;
    const leaveDays = filteredAttendance.filter((item) => item.status === 'leave').length;
    const absentDays = filteredAttendance.filter((item) => item.status === 'absent').length;

    return {
      recordedDays: recordedDays.length,
      attendanceRecords,
      presentDays,
      lateDays,
      halfDays,
      leaveDays,
      absentDays,
      presentRate: attendanceRecords ? Math.round(((presentDays + lateDays + halfDays) / attendanceRecords) * 100) : 0,
    };
  }, [filteredAttendance]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, {
      date: string;
      total: number;
      attended: number;
      late: number;
    }>();

    filteredAttendance.forEach((item) => {
      if (!map.has(item.date)) {
        map.set(item.date, {
          date: item.date,
          total: 0,
          attended: 0,
          late: 0,
        });
      }

      const entry = map.get(item.date)!;
      entry.total += 1;
      if (isPresentLike(item.status)) entry.attended += 1;
      if (item.status === 'late') entry.late += 1;
    });

    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        label: shortDateLabel(item.date),
        attendanceRate: item.total ? Math.round((item.attended / item.total) * 100) : 0,
      }));
  }, [filteredAttendance]);

  const statusBreakdown = useMemo(() => ([
    { name: 'Present', value: overview.presentDays, color: PIE_COLORS[0] },
    { name: 'Late', value: overview.lateDays, color: PIE_COLORS[1] },
    { name: 'Absent', value: overview.absentDays, color: PIE_COLORS[2] },
    { name: 'Leave', value: overview.leaveDays, color: PIE_COLORS[3] },
    { name: 'Half Day', value: overview.halfDays, color: PIE_COLORS[4] },
  ].filter((item) => item.value > 0)), [overview.absentDays, overview.halfDays, overview.lateDays, overview.leaveDays, overview.presentDays]);

  const classBreakdown = useMemo(() => {
    const map = new Map<string, { className: string; total: number; attended: number; late: number }>();

    aggregatedStudents.forEach((item) => {
      const key = item.className || 'Unassigned';
      if (!map.has(key)) {
        map.set(key, { className: key, total: 0, attended: 0, late: 0 });
      }
      const entry = map.get(key)!;
      entry.total += item.total;
      entry.attended += item.attendedDays;
      entry.late += item.late;
    });

    return Array.from(map.values())
      .map((item) => ({
        className: item.className,
        attendanceRate: item.total ? Math.round((item.attended / item.total) * 100) : 0,
        lateRate: item.total ? Math.round((item.late / item.total) * 100) : 0,
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 8);
  }, [aggregatedStudents]);

  const topRegularStudents = useMemo(() => (
    [...aggregatedStudents]
      .filter((item) => item.total > 0)
      .sort((a, b) => b.attendanceRate - a.attendanceRate || b.attendedDays - a.attendedDays || a.name.localeCompare(b.name))
      .slice(0, 8)
  ), [aggregatedStudents]);

  const irregularStudents = useMemo(() => (
    [...aggregatedStudents]
      .filter((item) => item.absent > 0 || item.leave > 0)
      .sort((a, b) => b.absent - a.absent || b.leave - a.leave || a.name.localeCompare(b.name))
      .slice(0, 8)
  ), [aggregatedStudents]);

  const fullTable = useMemo(() => (
    [...aggregatedStudents].sort((a, b) => a.name.localeCompare(b.name))
  ), [aggregatedStudents]);

  const chartTheme = useMemo(() => ({
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    tick: isDark ? '#9ca3af' : '#64748b',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    tooltipText: isDark ? '#f8fafc' : '#0f172a',
  }), [isDark]);

  if (loadingRef && !didSeedRange) {
    return (
      <Page theme={themeObj}>
        <CenterPanel theme={themeObj}>
          <CircularProgress size={24} />
        </CenterPanel>
      </Page>
    );
  }

  if (hasActiveSession === false) {
    return <NoSessionsFound />;
  }

  return (
    <Page theme={themeObj}>
      <Hero theme={themeObj}>
        <TitleWrap>
          <TitleRow>
            <TitleIcon theme={themeObj}>
              <Assessment fontSize="small" />
            </TitleIcon>
            <TitleBlock>
              <Title theme={themeObj}>Student Attendance Analytics</Title>
              <Subtitle theme={themeObj}>
                Compact view of presence, class-wise performance, and student-level attendance for the active session.
              </Subtitle>
            </TitleBlock>
          </TitleRow>

          <SessionMeta>
            <SessionChip theme={themeObj}>{activeSession?.name || 'Active Session'}</SessionChip>
            <SessionChip theme={themeObj}>
              {activeSession ? `${shortDateLabel(activeSession.start_date)} to ${shortDateLabel(activeSession.end_date)}` : 'Session range unavailable'}
            </SessionChip>
            <SessionChip theme={themeObj}>
              {studentsWithAttendance.length} student{studentsWithAttendance.length === 1 ? '' : 's'} with attendance
            </SessionChip>
          </SessionMeta>
        </TitleWrap>

        <FilterCard theme={themeObj}>
          <FilterGrid>
            <AppDateField
              label="From"
              value={fromDate}
              onChangeValue={setFromDate}
              minDate={activeSession?.start_date}
              maxDate={toDate || activeSession?.end_date}
              fullWidth
            />
            <AppDateField
              label="To"
              value={toDate}
              onChangeValue={setToDate}
              minDate={fromDate || activeSession?.start_date}
              maxDate={activeSession?.end_date}
              fullWidth
            />
            <Select theme={themeObj} value={selectedClass} onChange={(event) => {
              setSelectedClass(event.target.value);
              setSelectedSection('all');
            }}>
              <option value="all">All Classes</option>
              {availableClasses.map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </Select>
            <Select theme={themeObj} value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)}>
              <option value="all">All Sections</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={String(section.id)}>{section.name}</option>
              ))}
            </Select>
          </FilterGrid>
          <Input
            theme={themeObj}
            type="text"
            placeholder="Search student name or roll number..."
            value={studentQuery}
            onChange={(event) => setStudentQuery(event.target.value)}
          />
          <MiniNote theme={themeObj}>
            <span>{studentsWithAttendance.length} student{studentsWithAttendance.length === 1 ? '' : 's'} with attendance</span>
            <span>{overview.recordedDays} recorded day{overview.recordedDays === 1 ? '' : 's'} in range</span>
          </MiniNote>
        </FilterCard>
      </Hero>

      <MetricsGrid>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><Groups fontSize="inherit" /> Attendance Coverage</MetricLabel>
          <MetricValue theme={themeObj}>{overview.attendanceRecords}</MetricValue>
          <MetricMeta theme={themeObj}>{overview.recordedDays} recorded dates across {studentsWithAttendance.length} students</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><School fontSize="inherit" /> Present Rate</MetricLabel>
          <MetricValue theme={themeObj}>{overview.presentRate}%</MetricValue>
          <MetricMeta theme={themeObj}>{overview.presentDays + overview.lateDays + overview.halfDays} present-like records</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><Analytics fontSize="inherit" /> Late Arrivals</MetricLabel>
          <MetricValue theme={themeObj}>{overview.lateDays}</MetricValue>
          <MetricMeta theme={themeObj}>{overview.presentRate > 0 ? 'Students marked late' : 'No data yet'}</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><Groups fontSize="inherit" /> Total Students</MetricLabel>
          <MetricValue theme={themeObj}>{studentsWithAttendance.length}</MetricValue>
          <MetricMeta theme={themeObj}>with attendance records</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><School fontSize="inherit" /> Total Absent</MetricLabel>
          <MetricValue theme={themeObj}>{overview.absentDays}</MetricValue>
          <MetricMeta theme={themeObj}>{overview.leaveDays} leave records</MetricMeta>
        </MetricCard>
        <MetricCard theme={themeObj}>
          <MetricLabel theme={themeObj}><Analytics fontSize="inherit" /> Half Days</MetricLabel>
          <MetricValue theme={themeObj}>{overview.halfDays}</MetricValue>
          <MetricMeta theme={themeObj}>half-day attendance records</MetricMeta>
        </MetricCard>
      </MetricsGrid>

      {loadingAttendance ? (
        <CenterPanel theme={themeObj}>
          <CircularProgress size={24} />
        </CenterPanel>
      ) : (
        <LayoutGrid>
          <Panel theme={themeObj} $span={7}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Analytics fontSize="small" /> Daily Attendance Pattern</PanelTitle>
              <PanelMeta theme={themeObj}>Attendance rate and late records by day</PanelMeta>
            </PanelHead>
            <InsightStrip>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Best Day</InsightLabel>
                <InsightValue theme={themeObj}>
                  {dailyTrend.length ? `${dailyTrend.slice().sort((a, b) => b.attendanceRate - a.attendanceRate)[0].label} (${dailyTrend.slice().sort((a, b) => b.attendanceRate - a.attendanceRate)[0].attendanceRate}%)` : '-'}
                </InsightValue>
              </InsightCard>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Most Late</InsightLabel>
                <InsightValue theme={themeObj}>
                  {dailyTrend.length ? `${dailyTrend.slice().sort((a, b) => b.late - a.late)[0].label} (${dailyTrend.slice().sort((a, b) => b.late - a.late)[0].late})` : '-'}
                </InsightValue>
              </InsightCard>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Recorded Days</InsightLabel>
                <InsightValue theme={themeObj}>{overview.recordedDays}</InsightValue>
              </InsightCard>
            </InsightStrip>
            <ChartBox>
              {dailyTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend} margin={{ top: 12, right: 14, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="label" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, color: chartTheme.tooltipText, borderRadius: 12, border: 'none' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="attendanceRate" name="Attendance %" stroke="#2563eb" strokeWidth={2.4} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="late" name="Late Records" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState theme={themeObj}>No attendance data found in the selected range.</EmptyState>
              )}
            </ChartBox>
          </Panel>

          <Panel theme={themeObj} $span={5}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Assessment fontSize="small" /> Status Breakdown</PanelTitle>
              <PanelMeta theme={themeObj}>Current filter composition</PanelMeta>
            </PanelHead>
            <InsightStrip>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Present</InsightLabel>
                <InsightValue theme={themeObj}>{overview.presentDays}</InsightValue>
              </InsightCard>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Absent</InsightLabel>
                <InsightValue theme={themeObj}>{overview.absentDays}</InsightValue>
              </InsightCard>
              <InsightCard theme={themeObj}>
                <InsightLabel theme={themeObj}>Leave</InsightLabel>
                <InsightValue theme={themeObj}>{overview.leaveDays}</InsightValue>
              </InsightCard>
            </InsightStrip>
            <ChartBox>
              {statusBreakdown.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={2}>
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, color: chartTheme.tooltipText, borderRadius: 12, border: 'none' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState theme={themeObj}>Status breakup will appear once records are available.</EmptyState>
              )}
            </ChartBox>
          </Panel>

          <Panel theme={themeObj} $span={12}>
            <PanelHead>
              <PanelTitle theme={themeObj}><School fontSize="small" /> Class Performance</PanelTitle>
              <PanelMeta theme={themeObj}>Attendance rate and late rate by class</PanelMeta>
            </PanelHead>
            <ChartBox>
              {classBreakdown.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classBreakdown} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="className" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, color: chartTheme.tooltipText, borderRadius: 12, border: 'none' }} />
                    <Legend />
                    <Bar dataKey="attendanceRate" name="Attendance %" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="lateRate" name="Late %" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState theme={themeObj}>Class-based analytics will appear when student records exist.</EmptyState>
              )}
            </ChartBox>
          </Panel>

          <Panel theme={themeObj} $span={6}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Groups fontSize="small" /> Most Regular Students</PanelTitle>
              <PanelMeta theme={themeObj}>Ranked by attendance rate and present days</PanelMeta>
            </PanelHead>
            <TableWrap theme={themeObj}>
              <Table>
                <thead>
                  <tr>
                    <TH theme={themeObj}>Student</TH>
                    <TH theme={themeObj}>Class</TH>
                    <TH theme={themeObj}>Attendance</TH>
                    <TH theme={themeObj}>Present Days</TH>
                  </tr>
                </thead>
                <tbody>
                  {topRegularStudents.length ? topRegularStudents.map((item) => (
                    <tr key={`regular-${item.id}`}>
                      <TD theme={themeObj}>
                        <NameCell>
                          <span>{item.name}</span>
                          <SubText theme={themeObj}>{getStudentDisplayId({ id: item.id, roll_number: item.roll_number })}</SubText>
                        </NameCell>
                      </TD>
                      <TD theme={themeObj}>
                        {item.sectionName ? `${item.className} (${item.sectionName})` : item.className}
                      </TD>
                      <TD theme={themeObj}><BadgePill $tone="success">{item.attendanceRate}%</BadgePill></TD>
                      <TD theme={themeObj}>{item.attendedDays}</TD>
                    </tr>
                  )) : (
                    <tr>
                      <TD theme={themeObj} colSpan={4}><EmptyState theme={themeObj}>No student records match the current filter.</EmptyState></TD>
                    </tr>
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </Panel>

          <Panel theme={themeObj} $span={6}>
            <PanelHead>
              <PanelTitle theme={themeObj}><School fontSize="small" /> Irregular Students</PanelTitle>
              <PanelMeta theme={themeObj}>Students with absences or leaves</PanelMeta>
            </PanelHead>
            <TableWrap theme={themeObj}>
              <Table>
                <thead>
                  <tr>
                    <TH theme={themeObj}>Student</TH>
                    <TH theme={themeObj}>Class</TH>
                    <TH theme={themeObj}>Absent</TH>
                    <TH theme={themeObj}>Leave</TH>
                  </tr>
                </thead>
                <tbody>
                  {irregularStudents.length ? irregularStudents.map((item) => (
                    <tr key={`irregular-${item.id}`}>
                      <TD theme={themeObj}>
                        <NameCell>
                          <span>{item.name}</span>
                          <SubText theme={themeObj}>{getStudentDisplayId({ id: item.id, roll_number: item.roll_number })}</SubText>
                        </NameCell>
                      </TD>
                      <TD theme={themeObj}>
                        {item.sectionName ? `${item.className} (${item.sectionName})` : item.className}
                      </TD>
                      <TD theme={themeObj}><BadgePill $tone={item.absent > 0 ? 'danger' : 'success'}>{item.absent}</BadgePill></TD>
                      <TD theme={themeObj}><BadgePill $tone={item.leave > 0 ? 'warning' : 'success'}>{item.leave}</BadgePill></TD>
                    </tr>
                  )) : (
                    <tr>
                      <TD theme={themeObj} colSpan={4}><EmptyState theme={themeObj}>No irregular students in the current results.</EmptyState></TD>
                    </tr>
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </Panel>

          <Panel theme={themeObj} $span={12}>
            <PanelHead>
              <PanelTitle theme={themeObj}><Groups fontSize="small" /> Student Detail Matrix</PanelTitle>
              <PanelMeta theme={themeObj}>Attendance, presence, and absence records per student</PanelMeta>
            </PanelHead>
            <TableWrap theme={themeObj}>
              <Table>
                <thead>
                  <tr>
                    <TH theme={themeObj}>Student</TH>
                    <TH theme={themeObj}>Class</TH>
                    <TH theme={themeObj}>Roll No</TH>
                    <TH theme={themeObj}>Total</TH>
                    <TH theme={themeObj}>Present</TH>
                    <TH theme={themeObj}>Late</TH>
                    <TH theme={themeObj}>Absent</TH>
                    <TH theme={themeObj}>Leave</TH>
                    <TH theme={themeObj}>Half Day</TH>
                    <TH theme={themeObj}>Attendance %</TH>
                  </tr>
                </thead>
                <tbody>
                  {fullTable.length ? fullTable.map((item) => (
                    <tr key={`detail-${item.id}`}>
                      <TD theme={themeObj}>
                        <NameCell>
                          <span>{item.name}</span>
                          <SubText theme={themeObj}>ID {item.id}</SubText>
                        </NameCell>
                      </TD>
                      <TD theme={themeObj}>
                        {item.sectionName ? `${item.className} (${item.sectionName})` : item.className}
                      </TD>
                      <TD theme={themeObj}>{getStudentDisplayId({ id: item.id, roll_number: item.roll_number })}</TD>
                      <TD theme={themeObj}>{item.total}</TD>
                      <TD theme={themeObj}>{item.present}</TD>
                      <TD theme={themeObj}>{item.late}</TD>
                      <TD theme={themeObj}>{item.absent}</TD>
                      <TD theme={themeObj}>{item.leave}</TD>
                      <TD theme={themeObj}>{item.halfDay}</TD>
                      <TD theme={themeObj}>
                        <BadgePill $tone={item.attendanceRate >= 85 ? 'success' : item.attendanceRate >= 65 ? 'warning' : 'danger'}>
                          {item.attendanceRate}%
                        </BadgePill>
                      </TD>
                    </tr>
                  )) : (
                    <tr>
                      <TD theme={themeObj} colSpan={10}><EmptyState theme={themeObj}>No student attendance analytics available for this selection.</EmptyState></TD>
                    </tr>
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </Panel>
        </LayoutGrid>
      )}
    </Page>
  );
};

export default StudentAttendanceAnalyticsPage;
