import React, { useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useTheme } from '../components/Layout/contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
import { CircularProgress } from '@mui/material';
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

const Page = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => theme.BG === '#252525'
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => theme.BG === '#252525'
        ? '0 4px 20px rgba(0, 0, 0, 0.3)'
        : '0 4px 20px rgba(0, 0, 0, 0.1)'};
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
  font-size: 1.2rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  letter-spacing: 0.2px;

  svg {
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const Filters = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  border: ${({ theme }) => theme.BG === '#252525'
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => theme.BG === '#252525'
        ? '0 4px 20px rgba(0, 0, 0, 0.3)'
        : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  margin-bottom: 0.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-end;

  @media (max-width: 768px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: ${({ theme }) => theme.BG === '#252525'
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => theme.BG === '#252525'
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 150px;

  &:hover, &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => theme.BG === '#252525'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)'};
  }
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: ${({ theme }) => theme.BG === '#252525'
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => theme.BG === '#252525'
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 150px;

  &:hover, &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => theme.BG === '#252525'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)'};
  }

  & option {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#ffffff'};
    color: ${({ theme }) => theme.BG === '#252525' ? '#e2e8f0' : '#1e293b'};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  border: ${({ theme }) => theme.BG === '#252525'
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => theme.BG === '#252525'
        ? '0 4px 20px rgba(0, 0, 0, 0.3)'
        : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
`;

const Label = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.78rem;
  margin-bottom: 0.22rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const Value = styled.div`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.06rem;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

const StatChange = styled.span<{ $positive?: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.25rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: ${({ theme }) => theme.BG === '#252525'
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 12px;
  padding: 1rem;
  box-shadow: ${({ theme }) => theme.BG === '#252525'
        ? '0 4px 20px rgba(0, 0, 0, 0.3)'
        : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  display: flex;
  flex-direction: column;
`;

const PanelTitle = styled.h3`
  margin: 0 0 0.72rem 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
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
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  background: ${({ theme }) => theme.CARD};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TH = styled.th`
  text-align: left;
  padding: 0.58rem;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: rgba(148, 163, 184, 0.08);
`;

const TD = styled.td`
  padding: 0.58rem;
  font-size: 0.84rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const Status = styled.span<{ $type: 'present' | 'absent' | 'leave' | 'late', theme: any }>`
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;
  background: ${({ $type }) =>
        $type === 'present' ? 'rgba(34, 197, 94, 0.1)' :
            $type === 'absent' ? 'rgba(239, 68, 68, 0.1)' :
                $type === 'leave' ? 'rgba(234, 179, 8, 0.1)' :
                    'rgba(59, 130, 246, 0.1)'
    };
  color: ${({ $type }) =>
        $type === 'present' ? '#22c55e' :
            $type === 'absent' ? '#ef4444' :
                $type === 'leave' ? '#eab308' :
                    '#3b82f6'
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
    status: string;
};

type ClassRow = { id: number; name: string };
type SectionRow = { id: number; name: string; class_id: number };

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
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedSection, setSelectedSection] = useState('all');
    const [studentQuery, setStudentQuery] = useState('');

    const [loading, setLoading] = useState(false);
    const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [sections, setSections] = useState<SectionRow[]>([]);

    const studentsMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
    const classesMap = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
    const sectionsMap = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

    const fetchReferenceData = async () => {
        if (!user?.school_id) return;
        try {
            const [classesRes, sectionsRes, studentsRes] = await Promise.all([
                supabase.from('classes').select('id,name').eq('school_id', user.school_id).order('name'),
                supabase.from('sections').select('id,name,class_id').eq('school_id', user.school_id).order('name'),
                supabase.from('students').select('id,name,roll_number,father_name,class_id,section_id,status').eq('school_id', user.school_id)
            ]);

            if (classesRes.error) throw classesRes.error;
            if (sectionsRes.error) throw sectionsRes.error;
            if (studentsRes.error) throw studentsRes.error;

            setClasses((classesRes.data || []) as ClassRow[]);
            setSections((sectionsRes.data || []) as SectionRow[]);
            setStudents((studentsRes.data || []) as StudentRow[]);
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
    }, [attendance, selectedClass, selectedSection, studentQuery, studentsMap]);

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

    return (
        <Page theme={themeObj}>
            <Header theme={themeObj}>
                <Title theme={themeObj}>
                    <Assessment />
                    Student Attendance Analytics
                </Title>

                <Filters>
                    <Input theme={themeObj} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    <Input theme={themeObj} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

                    <Select theme={themeObj} value={selectedClass} onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedSection('all');
                    }}>
                        <option value="all">All Classes</option>
                        {classes.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </Select>

                    {filteredSections.length > 0 && (
                        <Select theme={themeObj} value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                            <option value="all">All Sections</option>
                            {filteredSections.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                        </Select>
                    )}

                    <Input
                        theme={themeObj}
                        type="text"
                        placeholder="Search student / father / roll"
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        style={{ gridColumn: '1 / -1' }}
                    />
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
                                        <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} name="Present" dot={false} />
                                        <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" dot={false} />
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
                                                <TD theme={themeObj} style={{ color: '#ef4444', fontWeight: 'bold' }}>{s.rate}%</TD>
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
                                                <TD theme={themeObj} style={{ color: '#22c55e', fontWeight: 'bold' }}>{s.rate}%</TD>
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
                                            <Bar dataKey="presentRate" fill="#3b82f6" name="Present %" radius={[4, 4, 0, 0]} />
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
