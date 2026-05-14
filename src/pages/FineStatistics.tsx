import React, { useEffect, useState, useMemo, useContext } from 'react';
import styled, { useTheme } from 'styled-components';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardHeader } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, ComposedChart } from 'recharts';
import { MonetizationOn, TrendingUp, TrendingDown, PieChart as PieChartIcon, Leaderboard, CalendarToday, Info } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllRows } from '../utils/paginationHelper';
import { useLoading } from '../contexts/LoadingContext';
import { formatAppDate } from '../utils/dateUtils';
import NoStudentsFound from '../components/NoStudentsFound';
import { useProgress } from '../components/Layout';

import Loader from '../components/Loader';
const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
`;
const PageTitle = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
`;
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;
const StatCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;
const StatTitle = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;
const StatValue = styled.div<{ color?: string }>`
  font-size: 2.1rem;
  font-weight: 700;
  color: ${({ color, theme }) => color || theme.ACCENT};
`;
const ChartCard = styled(StatCard)`
  min-height: 340px;
  align-items: stretch;
`;
const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  margin-top: 1.2rem;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 4px #0001;
`;
const Th = styled.th`
  padding: 0.7rem 0.5rem;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  border-bottom: 1.5px solid ${({ theme }) => theme.BORDER};
  font-size: 1.01rem;
`;
const Td = styled.td`
  padding: 0.6rem 0.5rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.97rem;
  background: ${({ theme }) => theme.CARD};
`;
const SmallCardGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  margin-bottom: 2rem;
  align-items: stretch;
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 0.7rem;
  }
`;
const LargeCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  align-items: stretch;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }
`;


const FineStatistics: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  
  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <Container>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem', 
          gap: 16,
          color: '#888',
          fontSize: '1.1rem',
          fontWeight: 600
        }}>
          <Info style={{ fontSize: '1.5rem' }} />
          No school context found. Please contact your administrator.
        </div>
      </Container>
    );
  }

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user?.school_id) return;
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
      startProgress(false);
      setProgress(10);
      const [
        studentsData,
        classesData,
        sectionsData,
        finesData,
        paymentsData,
        attendanceData,
      ] = await Promise.all([
        fetchAllRows(async (from, to) => {
          return await supabase.from('students')
            .select('id, name, father_name, class_id, section_id')
            .eq('school_id', user.school_id)
            .eq('status', 'active')
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('classes')
            .select('id, name')
            .eq('school_id', user.school_id)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('sections')
            .select('id, name, class_id')
            .eq('school_id', user.school_id)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('fines')
            .select('*')
            .eq('school_id', user.school_id)
            .order('effective_from', { ascending: true })
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('fine_payments')
            .select('*')
            .eq('school_id', user.school_id)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('attendance_records')
            .select('*')
            .eq('school_id', user.school_id)
            .in('status', ['absent', 'late'])
            .range(from, to);
        }),
      ]);
      setProgress(70);
      setStudents(studentsData);
      setClasses(classesData);
      setSections(sectionsData || []);
      setFines(finesData || []);
      setPayments(paymentsData || []);
      setAttendanceRecords(attendanceData || []);
      setProgress(100);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
      }
    };
    fetchAll();
  }, [user?.school_id]);

  // --- Data Processing ---
  // Helper: get class/section name
  const getClassName = (classId: any) => classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  const getSectionName = (sectionId: any) => sections.find((s: any) => String(s.id) === String(sectionId))?.name || '';


  // Calculate total fine for a student - uses class_id from attendance records for accurate fine calculation
  function calculateFine(student: any) {
    if (!fines || fines.length === 0) return 0;

    const studentAtt = attendanceRecords.filter(
      (rec: any) => rec.student_id === student.id && (rec.status === 'absent' || rec.status === 'late')
    );
    let total = 0;
    
    for (const rec of studentAtt) {
      // Use the class_id directly from the attendance record (this is the class the student was in when attendance was marked)
      const classIdFromRecord = rec.class_id || student.class_id;
      
      // Find fines for that specific class
      const classFines = fines.filter((f: any) => String(f.class_id) === String(classIdFromRecord));
      
      let applicableFine = null;
      for (const f of classFines) {
        if (f.effective_from <= rec.date) {
          applicableFine = f;
        }
      }
      
      if (applicableFine) {
        if (rec.status === 'absent') total += Number(applicableFine.absent_fine || 0);
        else if (rec.status === 'late') total += Number(applicableFine.late_fine || 0);
      }
    }
    return total;
  }
  // Payment calculation
  function calculatePayments(student: any) {
    const studentPayments = payments.filter((p: any) => p.student_id === student.id);
    const paid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const remission = studentPayments.reduce((sum: number, p: any) => sum + Number(p.remission || 0), 0);
    return { paid, remission };
  }

  // --- Summary Stats ---
  const summary = useMemo(() => {
    let totalFine = 0, totalPaid = 0, totalRemission = 0, totalRemaining = 0;
    students.forEach(stu => {
      const fine = calculateFine(stu);
      const { paid, remission } = calculatePayments(stu);
      const remaining = fine - paid - remission;
      totalFine += fine;
      totalPaid += paid;
      totalRemission += remission;
      totalRemaining += remaining;
    });
    return { totalFine, totalPaid, totalRemission, totalRemaining };
  }, [students, payments, fines, attendanceRecords]);

  // --- Fines by Class ---
  const finesByClass = useMemo(() => {
    return classes.map(cls => {
      let fine = 0, paid = 0, remission = 0, remaining = 0;
      students.filter(stu => String(stu.class_id) === String(cls.id)).forEach(stu => {
        const f = calculateFine(stu);
        const p = calculatePayments(stu);
        fine += f;
        paid += p.paid;
        remission += p.remission;
        remaining += f - p.paid - p.remission;
      });
      return { class: cls.name, fine, paid, remission, remaining };
    });
  }, [classes, students, payments, fines, attendanceRecords]);

  // --- Fines by Month ---
  const finesByMonth = useMemo(() => {
    const map: { [key: string]: { fine: number, paid: number, remission: number } } = {};
    students.forEach(stu => {
      attendanceRecords.filter(
        (rec: any) => rec.student_id === stu.id && (rec.status === 'absent' || rec.status === 'late')
      ).forEach(rec => {
        const month = rec.date.slice(0, 7); // YYYY-MM
        if (!map[month]) map[month] = { fine: 0, paid: 0, remission: 0 };
        // Find fine amount using the class from the attendance record
        const classIdFromRecord = rec.class_id || stu.class_id;
        const classFines = fines.filter((f: any) => String(f.class_id) === String(classIdFromRecord));
        let applicableFine = null;
        for (const f of classFines) {
          if (f.effective_from <= rec.date) applicableFine = f;
        }
        if (applicableFine) {
          if (rec.status === 'absent') map[month].fine += Number(applicableFine.absent_fine || 0);
          else if (rec.status === 'late') map[month].fine += Number(applicableFine.late_fine || 0);
        }
      });
      // Payments by month
      payments.filter(p => p.student_id === stu.id).forEach(p => {
        const month = p.payment_date ? p.payment_date.slice(0, 7) : 'Unknown';
        if (!map[month]) map[month] = { fine: 0, paid: 0, remission: 0 };
        map[month].paid += Number(p.amount || 0);
        map[month].remission += Number(p.remission || 0);
      });
    });
    return Object.entries(map).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month));
  }, [students, payments, fines, attendanceRecords]);

  // --- Daily Collection Trend ---
  const dailyCollections = useMemo(() => {
    const map: { [key: string]: { paid: number } } = {};
    payments.forEach(p => {
      const date = p.payment_date || 'Unknown';
      if (!map[date]) map[date] = { paid: 0 };
      map[date].paid += Number(p.amount || 0);
    });
    const sorted = Object.entries(map)
      .filter(([date]) => date !== 'Unknown')
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Limit to last 30 active collection days to keep chart readable
    return sorted.slice(-30);
  }, [payments]);

  const maxDailyCollected = useMemo(() => {
    return Math.max(...dailyCollections.map(d => d.paid), 0);
  }, [dailyCollections]);

  // --- Top Defaulters ---
  const topDefaulters = useMemo(() => {
    return students.map(stu => {
      const fine = calculateFine(stu);
      const { paid, remission } = calculatePayments(stu);
      const remaining = fine - paid - remission;
      return { ...stu, fine, paid, remission, remaining };
    }).sort((a, b) => b.remaining - a.remaining).slice(0, 7);
  }, [students, payments, fines, attendanceRecords]);

  // --- Fines by Type ---
  const fineTypeStats = useMemo(() => {
    let absent = 0, late = 0;
    attendanceRecords.forEach(rec => {
      if (rec.status !== 'absent' && rec.status !== 'late') return;
      const stu = students.find(s => s.id === rec.student_id);
      if (!stu) return;
      const classIdFromRecord = rec.class_id || stu.class_id;
      const classFines = fines.filter((f: any) => String(f.class_id) === String(classIdFromRecord));
      let applicableFine = null;
      for (const f of classFines) {
        if (f.effective_from <= rec.date) applicableFine = f;
      }
      if (applicableFine) {
        if (rec.status === 'absent') absent += Number(applicableFine.absent_fine || 0);
        else if (rec.status === 'late') late += Number(applicableFine.late_fine || 0);
      }
    });
    return [
      { name: 'Absent', value: absent },
      { name: 'Late', value: late }
    ];
  }, [attendanceRecords, students, fines]);

  // --- Recent Payments ---
  const recentPayments = useMemo(() => {
    return payments.slice().sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || '')).slice(0, 7);
  }, [payments]);

  // --- Fines by Section ---
  const finesBySection = useMemo(() => {
    return sections.map(sec => {
      let fine = 0, paid = 0, remission = 0, remaining = 0;
      students.filter(stu => String(stu.section_id) === String(sec.id)).forEach(stu => {
        const f = calculateFine(stu);
        const p = calculatePayments(stu);
        fine += f;
        paid += p.paid;
        remission += p.remission;
        remaining += f - p.paid - p.remission;
      });
      return { section: sec.name, class: getClassName(sec.class_id), fine, paid, remission, remaining };
    });
  }, [sections, students, payments, fines, attendanceRecords]);

  // --- Fine Distribution (Histogram) ---
  const fineDistribution = useMemo(() => {
    const buckets = [0, 100, 200, 300, 400, 500, 1000, 2000];
    const dist = buckets.map((min, i) => {
      const max = buckets[i + 1] || Infinity;
      const count = students.filter(stu => {
        const fine = calculateFine(stu);
        return fine >= min && fine < max;
      }).length;
      return { range: max === Infinity ? `${min}+` : `${min}-${max - 1}`, count };
    });
    return dist;
  }, [students, fines, attendanceRecords]);

  // --- Average Fine per Student/Class/Section ---
  const avgFinePerStudent = useMemo(() => summary.totalFine / (students.length || 1), [summary, students]);
  const avgFinePerClass = useMemo(() => {
    return classes.map(cls => {
      const classStudents = students.filter(stu => String(stu.class_id) === String(cls.id));
      const total = classStudents.reduce((sum, stu) => sum + calculateFine(stu), 0);
      return { class: cls.name, avg: classStudents.length ? total / classStudents.length : 0 };
    });
  }, [classes, students, fines, attendanceRecords]);
  const avgFinePerSection = useMemo(() => {
    return sections.map(sec => {
      const sectionStudents = students.filter(stu => String(stu.section_id) === String(sec.id));
      const total = sectionStudents.reduce((sum, stu) => sum + calculateFine(stu), 0);
      return { section: sec.name, class: getClassName(sec.class_id), avg: sectionStudents.length ? total / sectionStudents.length : 0 };
    });
  }, [sections, students, fines, attendanceRecords]);

  // --- Most Fined Students (by count) ---
  const mostFinedStudents = useMemo(() => {
    return students.map(stu => {
      const count = attendanceRecords.filter(
        rec => rec.student_id === stu.id && (rec.status === 'absent' || rec.status === 'late')
      ).length;
      return { ...stu, count };
    }).sort((a, b) => b.count - a.count).slice(0, 7);
  }, [students, attendanceRecords]);

  // --- Most Fined Classes/Sections ---
  const mostFinedClasses = useMemo(() => {
    return classes.map(cls => {
      const total = students.filter(stu => String(stu.class_id) === String(cls.id)).reduce((sum, stu) => sum + calculateFine(stu), 0);
      return { class: cls.name, total };
    }).sort((a, b) => b.total - a.total).slice(0, 7);
  }, [classes, students, fines, attendanceRecords]);
  const mostFinedSections = useMemo(() => {
    return sections.map(sec => {
      const total = students.filter(stu => String(stu.section_id) === String(sec.id)).reduce((sum, stu) => sum + calculateFine(stu), 0);
      return { section: sec.name, class: getClassName(sec.class_id), total };
    }).sort((a, b) => b.total - a.total).slice(0, 7);
  }, [sections, students, fines, attendanceRecords]);

  // --- Fine Payment Rate by Class/Section ---
  const paymentRateByClass = useMemo(() => {
    return classes.map(cls => {
      let fine = 0, paid = 0;
      students.filter(stu => String(stu.class_id) === String(cls.id)).forEach(stu => {
        fine += calculateFine(stu);
        paid += calculatePayments(stu).paid;
      });
      return { class: cls.name, rate: fine ? (paid / fine) * 100 : 0 };
    });
  }, [classes, students, fines, attendanceRecords, payments]);
  const paymentRateBySection = useMemo(() => {
    return sections.map(sec => {
      let fine = 0, paid = 0;
      students.filter(stu => String(stu.section_id) === String(sec.id)).forEach(stu => {
        fine += calculateFine(stu);
        paid += calculatePayments(stu).paid;
      });
      return { section: sec.name, class: getClassName(sec.class_id), rate: fine ? (paid / fine) * 100 : 0 };
    });
  }, [sections, students, fines, attendanceRecords, payments]);

  // --- Monthly Fine Trends (Stacked by Type) ---
  const monthlyFineTypeTrends = useMemo(() => {
    const map: { [key: string]: { absent: number, late: number } } = {};
    students.forEach(stu => {
      attendanceRecords.filter(
        (rec: any) => rec.student_id === stu.id && (rec.status === 'absent' || rec.status === 'late')
      ).forEach(rec => {
        const month = rec.date.slice(0, 7);
        if (!map[month]) map[month] = { absent: 0, late: 0 };
        const classIdFromRecord = rec.class_id || stu.class_id;
        const classFines = fines.filter((f: any) => String(f.class_id) === String(classIdFromRecord));
        let applicableFine = null;
        for (const f of classFines) {
          if (f.effective_from <= rec.date) applicableFine = f;
        }
        if (applicableFine) {
          if (rec.status === 'absent') map[month].absent += Number(applicableFine.absent_fine || 0);
          else if (rec.status === 'late') map[month].late += Number(applicableFine.late_fine || 0);
        }
      });
    });
    return Object.entries(map).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month));
  }, [students, fines, attendanceRecords]);

  // --- Remission Rate Over Time ---
  const remissionRateByMonth = useMemo(() => {
    const map: { [key: string]: { fine: number, remission: number } } = {};
    students.forEach(stu => {
      attendanceRecords.filter(
        (rec: any) => rec.student_id === stu.id && (rec.status === 'absent' || rec.status === 'late')
      ).forEach(rec => {
        const month = rec.date.slice(0, 7);
        if (!map[month]) map[month] = { fine: 0, remission: 0 };
        const classIdFromRecord = rec.class_id || stu.class_id;
        const classFines = fines.filter((f: any) => String(f.class_id) === String(classIdFromRecord));
        let applicableFine = null;
        for (const f of classFines) {
          if (f.effective_from <= rec.date) applicableFine = f;
        }
        if (applicableFine) {
          if (rec.status === 'absent') map[month].fine += Number(applicableFine.absent_fine || 0);
          else if (rec.status === 'late') map[month].fine += Number(applicableFine.late_fine || 0);
        }
      });
      payments.filter(p => p.student_id === stu.id).forEach(p => {
        const month = p.payment_date ? p.payment_date.slice(0, 7) : 'Unknown';
        if (!map[month]) map[month] = { fine: 0, remission: 0 };
        map[month].remission += Number(p.remission || 0);
      });
    });
    return Object.entries(map).map(([month, v]) => ({ month, rate: v.fine ? (v.remission / v.fine) * 100 : 0 })).sort((a, b) => a.month.localeCompare(b.month));
  }, [students, payments, fines, attendanceRecords]);

  // --- Top Remissions ---
  const topRemissions = useMemo(() => {
    return students.map(stu => {
      const { remission } = calculatePayments(stu);
      return { ...stu, remission };
    }).sort((a, b) => b.remission - a.remission).slice(0, 7);
  }, [students, payments]);

  // --- Fine Collection Efficiency ---
  const collectionEfficiency = useMemo(() => summary.totalFine ? (summary.totalPaid / summary.totalFine) * 100 : 0, [summary]);

  // --- Zero Fine Students ---
  const zeroFineStudents = useMemo(() => students.filter(stu => calculateFine(stu) === 0).length, [students, fines, attendanceRecords]);

  // --- Recent Largest Payments ---
  const recentLargestPayments = useMemo(() => {
    return payments.slice().sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 7);
  }, [payments]);

  // --- Colors for charts ---
  const COLORS = ['#6366f1', '#22c55e', '#f59e42', '#f43f5e', '#0ea5e9', '#a78bfa', '#f472b6'];

  if (loading) return <Loader />;

  // Show NoStudentsFound if there are no students
  if (students.length === 0) {
    return <NoStudentsFound />;
  }

  return (
    <Container>
      <PageTitle><PieChartIcon style={{ fontSize: '2.1rem' }} /> Fine Statistics</PageTitle>
      <SmallCardGrid>
        <StatCard>
          <StatTitle>Total Fine Issued</StatTitle>
          <StatValue color="#6366f1">Rs {summary.totalFine.toLocaleString()}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Total Paid</StatTitle>
          <StatValue color="#22c55e">Rs {summary.totalPaid.toLocaleString()}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Total Remission</StatTitle>
          <StatValue color="#a78bfa">Rs {summary.totalRemission.toLocaleString()}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Total Remaining</StatTitle>
          <StatValue color="#f43f5e">Rs {summary.totalRemaining.toLocaleString()}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Average Fine per Student</StatTitle>
          <StatValue color="#6366f1">Rs {avgFinePerStudent.toLocaleString()}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Fine Collection Efficiency</StatTitle>
          <StatValue color="#6366f1">{collectionEfficiency.toFixed(2)}%</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Zero Fine Students</StatTitle>
          <StatValue color="#6366f1">{zeroFineStudents}</StatValue>
        </StatCard>
      </SmallCardGrid>
      <LargeCardGrid>
        <ChartCard>
          <StatTitle>Fines by Class</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={finesByClass} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="class" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Bar dataKey="fine" fill="#6366f1" name="Total Fine" />
              <Bar dataKey="paid" fill="#22c55e" name="Paid" />
              <Bar dataKey="remission" fill="#a78bfa" name="Remission" />
              <Bar dataKey="remaining" fill="#f43f5e" name="Remaining" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Fines by Section</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={finesBySection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="section" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Bar dataKey="fine" fill="#6366f1" name="Total Fine" />
              <Bar dataKey="paid" fill="#22c55e" name="Paid" />
              <Bar dataKey="remission" fill="#a78bfa" name="Remission" />
              <Bar dataKey="remaining" fill="#f43f5e" name="Remaining" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Fines by Month</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={finesByMonth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="fine" stroke="#6366f1" name="Fine" />
              <Line type="monotone" dataKey="paid" stroke="#22c55e" name="Paid" />
              <Line type="monotone" dataKey="remission" stroke="#a78bfa" name="Remission" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Daily Collection Trend</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={dailyCollections} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} domain={[0, maxDailyCollected === 0 ? 'auto' : maxDailyCollected]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="paid" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Paid" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Fines by Type</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={fineTypeStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {fineTypeStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Fine Distribution</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={fineDistribution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="range" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Average Fine per Class</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={avgFinePerClass} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="class" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg" fill="#6366f1" name="Average Fine" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Average Fine per Section</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={avgFinePerSection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="section" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg" fill="#6366f1" name="Average Fine" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Most Fined Students</StatTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Name</Th>
                  <Th>Father</Th>
                  <Th>Class</Th>
                  <Th>Count</Th>
                </tr>
              </thead>
              <tbody>
                {mostFinedStudents.map((stu, idx) => (
                  <tr key={stu.id}>
                    <Td>{idx + 1}</Td>
                    <Td>{stu.name}</Td>
                    <Td>{stu.father_name}</Td>
                    <Td>{getClassName(stu.class_id)}{getSectionName(stu.section_id) ? ' (' + getSectionName(stu.section_id) + ')' : ''}</Td>
                    <Td>{stu.count}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </ChartCard>
        <ChartCard>
          <StatTitle>Most Fined Classes</StatTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Class</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody>
                {mostFinedClasses.map((cls, idx) => (
                  <tr key={cls.class}>
                    <Td>{idx + 1}</Td>
                    <Td>{cls.class}</Td>
                    <Td>{cls.total}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </ChartCard>
        <ChartCard>
          <StatTitle>Most Fined Sections</StatTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Section</Th>
                  <Th>Class</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody>
                {mostFinedSections.map((sec, idx) => (
                  <tr key={sec.section}>
                    <Td>{idx + 1}</Td>
                    <Td>{sec.section}</Td>
                    <Td>{sec.class}</Td>
                    <Td>{sec.total}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </ChartCard>
        <ChartCard>
          <StatTitle>Fine Payment Rate by Class</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={paymentRateByClass} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="class" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Bar dataKey="rate" fill="#6366f1" name="Payment Rate" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Fine Payment Rate by Section</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={paymentRateBySection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="section" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Bar dataKey="rate" fill="#6366f1" name="Payment Rate" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Monthly Fine Trends</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={monthlyFineTypeTrends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="absent" stroke="#6366f1" fill="#6366f1" name="Absent" />
              <Area type="monotone" dataKey="late" stroke="#22c55e" fill="#22c55e" name="Late" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Remission Rate Over Time</StatTitle>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={remissionRateByMonth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" stroke={(theme as any).TEXT_SECONDARY} />
              <YAxis stroke={(theme as any).TEXT_SECONDARY} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#6366f1" name="Remission Rate" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard>
          <StatTitle>Top Remissions</StatTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Name</Th>
                  <Th>Father</Th>
                  <Th>Class</Th>
                  <Th>Remission</Th>
                </tr>
              </thead>
              <tbody>
                {topRemissions.map((stu, idx) => (
                  <tr key={stu.id}>
                    <Td>{idx + 1}</Td>
                    <Td>{stu.name}</Td>
                    <Td>{stu.father_name}</Td>
                    <Td>{getClassName(stu.class_id)}{getSectionName(stu.section_id) ? ' (' + getSectionName(stu.section_id) + ')' : ''}</Td>
                    <Td>Rs. {stu.remission}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </ChartCard>
        <ChartCard>
          <StatTitle>Recent Fine Payments</StatTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Name</Th>
                  <Th>Class</Th>
                  <Th>Date</Th>
                  <Th>Amount</Th>
                  <Th>Remission</Th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p, idx) => {
                  const stu = students.find(s => s.id === p.student_id);
                  return (
                    <tr key={p.id || idx}>
                      <Td>{idx + 1}</Td>
                      <Td>{stu?.name || '-'}</Td>
                      <Td>{stu ? getClassName(stu.class_id) : '-'}</Td>
                      <Td>{formatAppDate(p.payment_date)}</Td>
                      <Td>Rs. {p.amount}</Td>
                      <Td>Rs. {p.remission}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrapper>
        </ChartCard>
        <ChartCard>
          <StatTitle>Recent Largest Payments</StatTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Name</Th>
                  <Th>Class</Th>
                  <Th>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {recentLargestPayments.map((p, idx) => {
                  const stu = students.find(s => s.id === p.student_id);
                  return (
                    <tr key={p.id || idx}>
                      <Td>{idx + 1}</Td>
                      <Td>{stu?.name || '-'}</Td>
                      <Td>{stu ? getClassName(stu.class_id) : '-'}</Td>
                      <Td>Rs. {p.amount}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrapper>
        </ChartCard>
      </LargeCardGrid>
    </Container>
  );
};

export default FineStatistics;
