import React, { useContext, useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useTheme } from '../components/Layout/contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
import { CircularProgress } from '@mui/material';
import AppDateField from '../components/shared/AppDateField';
import {
    PieChart as PieChartIcon,
    TrendingUp,
    Assessment,
    Group,
    School,
    CalendarMonth,
    AccessTime,
    CheckCircle,
    Cancel
} from '@mui/icons-material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    LineChart,
    Line,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
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

const Page = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    const dark = checkIsDark(theme);
    return `
      radial-gradient(circle at top left, ${dark ? 'rgba(255,255,255,0.035)' : `${theme.ACCENT}10`} 0%, transparent 26%),
      linear-gradient(180deg, rgba(255,255,255,${dark ? '0.02' : '0.35'}) 0%, transparent 18%),
      ${layout.shellBg}
    `;
  }};
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow-y: auto;
  overflow-x: hidden;

  @media (max-width: 768px) {
    padding: 0.375rem;
    gap: 0.2rem;
    height: auto;
    min-height: 100%;
    padding-bottom: 2rem;
  }
`;

const Header = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayPanelStyle}
      border: 1px solid ${layout.shellBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  border-radius: ${CARD_RADIUS_LG};
  margin-bottom: 0.25rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 0.5rem;
    margin-bottom: 0.2rem;
    gap: 0.5rem;
  }
`;

const Title = styled.h1`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  letter-spacing: 0.2px;

  svg {
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const Filters = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
  min-width: 0;
  margin-bottom: 0.25rem;
  gap: 0.4rem;

  @media (max-width: 768px) {
    width: 100%;
    margin-left: 0;
  }
`;

const HeaderSegmentedGroup = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      background: ${layout.surfaceBg};
      border: 1px solid ${layout.surfaceBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  display: flex;
  align-items: stretch;
  border-radius: ${CARD_RADIUS_LG};
  overflow: hidden;
  min-width: 0;

  @media (max-width: 768px) {
    width: 100%;
    flex-wrap: wrap;
  }
`;

const HeaderSegmentBase = css`
  ${minimalSelectMenuStyle}
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.78rem;
  font-weight: 600;
  min-height: 32px;
`;

const HeaderSegmentInput = styled.input`
  ${HeaderSegmentBase}
  padding: 0.5rem 0.72rem;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  min-width: 130px;
  flex: 1;

  &::placeholder {
    color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  }

  @media (max-width: 768px) {
    min-width: 0;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  }
`;

const HeaderSegmentSelect = styled.select`
  ${HeaderSegmentBase}
  padding: 0.5rem 1.9rem 0.5rem 0.72rem;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  min-width: 130px;
  flex: 1;
  cursor: pointer;

  &:last-child {
    border-right: none;
  }

  @media (max-width: 768px) {
    min-width: 0;
    width: 50%;
    border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
    border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};

    &:nth-last-child(-n + 2) {
      border-bottom: none;
    }
  }
`;

const Input = styled.input`
  ${clayInputStyle}
  padding: 0.48rem 0.7rem;
  border-radius: ${CARD_RADIUS_LG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.82rem;
  outline: none;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 150px;

`;

const Select = styled.select`
  ${clayInputStyle}
  ${minimalSelectMenuStyle}
  padding: 0.48rem 2rem 0.48rem 0.7rem;
  border-radius: ${CARD_RADIUS_LG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.82rem;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 150px;

`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.4rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
  }
`;

const Card = styled.div`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.8rem;
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
`;

const Label = styled.div`
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  font-size: 0.72rem;
  margin-bottom: 0.22rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const Value = styled.div`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.96rem;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

const StatChange = styled.span<{ $positive?: boolean }>`
  font-size: 0.68rem;
  font-weight: 600;
  color: ${({ theme, $positive }) => $positive ? getDashboardPalette(theme).status.success : getDashboardPalette(theme).status.danger};
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  margin-bottom: 0.25rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  ${clayPanelStyle}
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.85rem;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  display: flex;
  flex-direction: column;
`;

const PanelTitle = styled.h3`
  margin: 0 0 0.6rem 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  letter-spacing: 0.2px;

  svg {
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  border-radius: ${CARD_RADIUS_LG};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TH = styled.th`
  text-align: left;
  padding: 0.58rem;
  font-size: 0.72rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
`;

const TD = styled.td`
  padding: 0.58rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
`;

const Status = styled.span<{ $type: 'present' | 'absent' | 'leave' | 'late', theme: any }>`
  padding: 0.22rem 0.46rem;
  border-radius: ${CARD_RADIUS_LG};
  font-size: 0.68rem;
  font-weight: 700;
  display: inline-block;
  background: ${({ $type, theme }) =>
        $type === 'present' ? getDashboardPalette(theme).status.successBg :
            $type === 'absent' ? getDashboardPalette(theme).status.dangerBg :
                $type === 'leave' ? getDashboardPalette(theme).status.warningBg :
                    getDashboardPalette(theme).status.infoBg
    };
  color: ${({ $type, theme }) =>
        $type === 'present' ? getDashboardPalette(theme).status.success :
            $type === 'absent' ? getDashboardPalette(theme).status.danger :
                $type === 'leave' ? getDashboardPalette(theme).status.warningStrong :
                    getDashboardPalette(theme).status.info
    };
`;

type AttendanceRow = {
    id: number;
    date: string;
    status: string;
    student_id: number;
    class_id: number;
    section_id: number;
};

type StudentRow = {
    id: number;
    name: string;
    roll_number?: string;
    father_name?: string;
    class_id: number | null;
    section_id: number | null;
    session_id?: number | null;
    status: string;
};

type ClassRow = { id: number; name: string };
type SectionRow = { id: number; name: string; class_id: number };
type SessionRow = { id: number; name: string; is_active?: boolean };

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];

const StudentAttendanceAnalyticsPage: React.FC = () => {
    const { theme } = useTheme();
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    const { user } = useAuth();
    const toast = useToast();

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [fromDate, setFromDate] = useState(monthStart.toISOString().slice(0, 10));
    const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
    const [selectedSession, setSelectedSession] = useState('all');
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedSection, setSelectedSection] = useState('all');
    const [studentQuery, setStudentQuery] = useState('');

    const [loading, setLoading] = useState(false);
    const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [sections, setSections] = useState<SectionRow[]>([]);
    const [sessions, setSessions] = useState<SessionRow[]>([]);

    const studentsMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
    const classesMap = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
    const sectionsMap = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

    const fetchReferenceData = async () => {
        if (!user?.school_id) return;
        try {
            const [classesRes, sectionsRes, studentsRes, sessionsRes] = await Promise.all([
                supabase.from('classes').select('id,name').eq('school_id', user.school_id).order('name'),
                supabase.from('sections').select('id,name,class_id').eq('school_id', user.school_id).order('name'),
                supabase.from('students').select('id,name,roll_number,father_name,class_id,section_id,session_id,status').eq('school_id', user.school_id),
                supabase.from('sessions').select('id,name,is_active').eq('school_id', user.school_id).order('name')
            ]);

            if (classesRes.error) throw classesRes.error;
            if (sectionsRes.error) throw sectionsRes.error;
            if (studentsRes.error) throw studentsRes.error;
            if (sessionsRes.error) throw sessionsRes.error;

            setClasses((classesRes.data || []) as ClassRow[]);
            setSections((sectionsRes.data || []) as SectionRow[]);
            setStudents((studentsRes.data || []) as StudentRow[]);
            setSessions((sessionsRes.data || []) as SessionRow[]);
        } catch (e: any) {
            toast.showToast(`Failed to load reference data: ${e?.message || 'Unknown error'}`, 'error');
        }
    };

    const fetchAttendance = async () => {
        if (!user?.school_id) return;
        setLoading(true);
        try {
            const data = await fetchAllRows<AttendanceRow>(async (from, to) => {
                return await supabase
                    .from('attendance_records')
                    .select('id,date,status,student_id,class_id,section_id')
                    .eq('school_id', user.school_id)
                    .gte('date', fromDate)
                    .lte('date', toDate)
                    .order('date', { ascending: true })
                    .range(from, to);
            });
            setAttendance(data || []);
        } catch (e: any) {
            toast.showToast(`Failed to load attendance analytics: ${e?.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferenceData();
    }, [user?.school_id]);

    useEffect(() => {
        fetchAttendance();
    }, [user?.school_id, fromDate, toDate]);

    const filteredAttendance = useMemo(() => {
        return attendance.filter((a) => {
            const st = studentsMap.get(a.student_id);

            if (selectedSession !== 'all' && String(st?.session_id || '') !== selectedSession) return false;
            if (selectedClass !== 'all' && String(st?.class_id || String(a.class_id)) !== selectedClass) return false;
            if (selectedSection !== 'all' && String(st?.section_id || String(a.section_id)) !== selectedSection) return false;

            if (studentQuery.trim() && st) {
                const q = studentQuery.toLowerCase();
                const sName = (st.name || '').toLowerCase();
                const sFather = (st.father_name || '').toLowerCase();
                const sRoll = String(st.roll_number || '').toLowerCase();
                if (!sName.includes(q) && !sFather.includes(q) && !sRoll.includes(q)) return false;
            }
            return true;
        });
    }, [attendance, selectedSession, selectedClass, selectedSection, studentQuery, studentsMap]);

    const stats = useMemo(() => {
        const total = filteredAttendance.length;
        const presentCount = filteredAttendance.filter(a => ['present', 'late', 'half_day'].includes(a.status)).length;
        const absentCount = filteredAttendance.filter(a => ['absent', 'leave'].includes(a.status)).length;

        const presentPercent = total ? Math.round((presentCount / total) * 100) : 0;
        const absentPercent = total ? Math.round((absentCount / total) * 100) : 0;

        return { total, presentCount, absentCount, presentPercent, absentPercent };
    }, [filteredAttendance]);

    const pieData = useMemo(() => {
        return [
            { name: 'Present (incl Late)', value: stats.presentCount },
            { name: 'Absent (incl Leave)', value: stats.absentCount },
        ].filter(d => d.value > 0);
    }, [stats]);

    const classwiseBreakdown = useMemo(() => {
        const map: Record<string, { className: string; total: number; present: number; absent: number }> = {};
        filteredAttendance.forEach((a) => {
            const st = studentsMap.get(a.student_id);
            const cid = st?.class_id || a.class_id;
            const key = String(cid || '0');
            const className = cid ? classesMap.get(cid) || 'Unknown Class' : 'Unassigned';
            if (!map[key]) map[key] = { className, total: 0, present: 0, absent: 0 };

            map[key].total += 1;
            if (['present', 'late', 'half_day'].includes(a.status)) map[key].present += 1;
            else if (['absent', 'leave'].includes(a.status)) map[key].absent += 1;
        });

        const withRates = Object.values(map)
            .map(v => ({
                ...v,
                presentRate: Math.round((v.present / v.total) * 100) || 0,
                name: v.className
            }));

        return sortClasses(withRates);
    }, [filteredAttendance, studentsMap, classesMap]);

    const dailyTrend = useMemo(() => {
        const map: Record<string, { total: number; present: number; absent: number }> = {};
        filteredAttendance.forEach(a => {
            const date = a.date;
            if (!map[date]) map[date] = { total: 0, present: 0, absent: 0 };
            map[date].total += 1;
            if (['present', 'late', 'half_day'].includes(a.status)) map[date].present += 1;
            else if (['absent', 'leave'].includes(a.status)) map[date].absent += 1;
        });

        return Object.entries(map).map(([date, counts]) => ({
            date,
            presentRate: Math.round((counts.present / counts.total) * 100) || 0,
            ...counts
        })).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredAttendance]);

    const studentPerformance = useMemo(() => {
        const map: Record<string, { id: number, name: string, roll_number?: string, cls: string, total: number, present: number, absent: number }> = {};
        filteredAttendance.forEach(a => {
            const sid = String(a.student_id);
            const st = studentsMap.get(a.student_id);

            const cid = st?.class_id || a.class_id;
            const cls = cid ? classesMap.get(cid) || '' : '';
            const secid = st?.section_id || a.section_id;
            const sec = secid ? sectionsMap.get(secid)?.name || '' : '';

            if (!map[sid]) {
                map[sid] = {
                    id: a.student_id,
                    name: st?.name || `Student ${sid}`,
                    roll_number: st?.roll_number,
                    cls: sec ? `${cls} (${sec})` : cls,
                    total: 0,
                    present: 0,
                    absent: 0
                };
            }
            map[sid].total += 1;
            if (['present', 'late', 'half_day'].includes(a.status)) map[sid].present += 1;
            else if (['absent', 'leave'].includes(a.status)) map[sid].absent += 1;
        });

        return Object.values(map)
            .map(v => ({
                ...v,
                rate: Math.round((v.present / v.total) * 100) || 0
            }));
    }, [filteredAttendance, studentsMap, classesMap, sectionsMap]);

    const topStudents = useMemo(() => {
        return [...studentPerformance]
            .sort((a, b) => b.present - a.present || b.rate - a.rate || b.total - a.total)
            .slice(0, 10);
    }, [studentPerformance]);

    const bottomStudents = useMemo(() => {
        return [...studentPerformance]
            .filter(s => s.total > 2)
            .sort((a, b) => b.absent - a.absent || a.rate - b.rate || b.total - a.total)
            .slice(0, 10);
    }, [studentPerformance]);

    const filteredSections = useMemo(() => {
        if (selectedClass === 'all') return sections;
        return sections.filter((s) => String(s.class_id) === selectedClass);
    }, [sections, selectedClass]);

    const isDark = theme === 'dark';
    const statusPalette = getDashboardPalette(themeObj).status;

    return (
        <Page theme={themeObj}>
            <Header theme={themeObj}>
                <Title theme={themeObj}>
                    <Assessment />
                    Student Attendance Analytics
                </Title>

                <Filters>
                    <HeaderSegmentedGroup theme={themeObj}>
                    <HeaderSegmentSelect theme={themeObj} value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
                        <option value="all">All Sessions</option>
                        {sessions.map((session) => (
                            <option key={session.id} value={String(session.id)}>
                                {session.name}
                            </option>
                        ))}
                    </HeaderSegmentSelect>

                    <AppDateField value={fromDate} onChange={(e) => setFromDate(e.target.value)} fullWidth={false} textFieldProps={{ InputLabelProps: { shrink: true }, sx: { minWidth: 170 } }} />
                    <AppDateField value={toDate} onChange={(e) => setToDate(e.target.value)} fullWidth={false} textFieldProps={{ InputLabelProps: { shrink: true }, sx: { minWidth: 170 } }} />

                    <HeaderSegmentSelect theme={themeObj} value={selectedClass} onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedSection('all');
                    }}>
                        <option value="all">All Classes</option>
                        {classes.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </HeaderSegmentSelect>

                    {filteredSections.length > 0 && (
                        <HeaderSegmentSelect theme={themeObj} value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                            <option value="all">All Sections</option>
                            {filteredSections.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                        </HeaderSegmentSelect>
                    )}

                    <HeaderSegmentInput
                        theme={themeObj}
                        type="text"
                        placeholder="Search student / father / roll"
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        style={{ minWidth: 220 }}
                    />
                    </HeaderSegmentedGroup>
                </Filters>
            </Header>

            {loading ? (
                <Panel theme={themeObj}>
                    <CircularProgress size={22} />
                </Panel>
            ) : (
                <>
                    <Grid>
                        <Card theme={themeObj}>
                            <Label theme={themeObj}><CheckCircle fontSize="small" /> Present/Late</Label>
                            <Value theme={themeObj}>
                                {stats.presentCount} <StatChange $positive={true}>({stats.presentPercent}%)</StatChange>
                            </Value>
                        </Card>
                        <Card theme={themeObj}>
                            <Label theme={themeObj}><Cancel fontSize="small" /> Absent/Leave</Label>
                            <Value theme={themeObj}>
                                {stats.absentCount} <StatChange $positive={false}>({stats.absentPercent}%)</StatChange>
                            </Value>
                        </Card>
                    </Grid>

                    <TwoCol>
                        <Panel theme={themeObj}>
                            <PanelTitle theme={themeObj}><TrendingUp fontSize="small" /> Attendance Daily Trend</PanelTitle>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'} />
                                        <XAxis dataKey="date" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
                                        <YAxis tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', border: 'none', borderRadius: '8px', color: isDark ? '#f3f4f6' : '#1e293b' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="present" stroke={statusPalette.success} strokeWidth={2} name="Present" dot={false} />
                                        <Line type="monotone" dataKey="absent" stroke={statusPalette.danger} strokeWidth={2} name="Absent" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Panel>

                        <Panel theme={themeObj}>
                            <PanelTitle theme={themeObj}><PieChartIcon fontSize="small" /> Overall Breakdown</PanelTitle>
                            <div style={{ width: '100%', height: 300 }}>
                                {pieData.length === 0 ? (
                                    <Label theme={themeObj} style={{ justifyContent: 'center', height: '100%' }}>No data available.</Label>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', border: 'none', borderRadius: '8px', color: isDark ? '#f3f4f6' : '#1e293b' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Panel>
                    </TwoCol>

                    <TwoCol>
                        <Panel theme={themeObj}>
                            <PanelTitle theme={themeObj}><School fontSize="small" /> Irregular Students (Lowest %)</PanelTitle>
                            <TableWrap theme={themeObj}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <TH theme={themeObj}>Student</TH>
                                            <TH theme={themeObj}>Roll No</TH>
                                            <TH theme={themeObj}>Class</TH>
                                            <TH theme={themeObj}>Total Days</TH>
                                            <TH theme={themeObj}>Absent</TH>
                                            <TH theme={themeObj}>Rate</TH>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bottomStudents.map((s) => (
                                            <tr key={s.id}>
                                                <TD theme={themeObj}>{s.name}</TD>
                                                <TD theme={themeObj}>{getStudentDisplayId({ id: s.id, roll_number: (s as any).roll_number })}</TD>
                                                <TD theme={themeObj}>{s.cls}</TD>
                                                <TD theme={themeObj}>{s.total}</TD>
                                                <TD theme={themeObj}>{s.absent}</TD>
                                                <TD theme={themeObj} style={{ color: statusPalette.danger, fontWeight: 'bold' }}>{s.rate}%</TD>
                                            </tr>
                                        ))}
                                        {bottomStudents.length === 0 && (
                                            <tr>
                                                <TD theme={themeObj} colSpan={6} style={{ textAlign: 'center' }}>No irregular students detected.</TD>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </TableWrap>
                        </Panel>

                        <Panel theme={themeObj}>
                            <PanelTitle theme={themeObj}><School fontSize="small" /> Regular Students (Highest %)</PanelTitle>
                            <TableWrap theme={themeObj}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <TH theme={themeObj}>Student</TH>
                                            <TH theme={themeObj}>Roll No</TH>
                                            <TH theme={themeObj}>Class</TH>
                                            <TH theme={themeObj}>Total Days</TH>
                                            <TH theme={themeObj}>Present</TH>
                                            <TH theme={themeObj}>Rate</TH>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topStudents.map((s) => (
                                            <tr key={s.id}>
                                                <TD theme={themeObj}>{s.name}</TD>
                                                <TD theme={themeObj}>{getStudentDisplayId({ id: s.id, roll_number: (s as any).roll_number })}</TD>
                                                <TD theme={themeObj}>{s.cls}</TD>
                                                <TD theme={themeObj}>{s.total}</TD>
                                                <TD theme={themeObj}>{s.present}</TD>
                                                <TD theme={themeObj} style={{ color: statusPalette.success, fontWeight: 'bold' }}>{s.rate}%</TD>
                                            </tr>
                                        ))}
                                        {topStudents.length === 0 && (
                                            <tr>
                                                <TD theme={themeObj} colSpan={6} style={{ textAlign: 'center' }}>No regular students detected.</TD>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </TableWrap>
                        </Panel>
                    </TwoCol>

                    {selectedClass === 'all' && (
                        <TwoCol>
                            <Panel theme={themeObj} style={{ gridColumn: 'span 2' }}>
                                <PanelTitle theme={themeObj}><Group fontSize="small" /> Class-wise Attendance Rate</PanelTitle>
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={classwiseBreakdown.slice(0, 15)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'} />
                                            <XAxis dataKey="className" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
                                            <YAxis tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
                                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', border: 'none', borderRadius: '8px', color: isDark ? '#f3f4f6' : '#1e293b' }} />
                                            <Legend />
                                            <Bar dataKey="presentRate" fill={statusPalette.info} name="Present %" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Panel>
                        </TwoCol>
                    )}
                </>
            )}
        </Page>
    );
};

export default StudentAttendanceAnalyticsPage;
