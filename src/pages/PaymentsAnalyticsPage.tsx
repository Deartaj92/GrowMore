import React, { useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
import { CircularProgress } from '@mui/material';
import AppDateField from '../components/shared/AppDateField';
import {
  Payments as PaymentsIcon,
  TrendingUp,
  AccountBalanceWallet,
  PieChart,
  Person,
  School,
  Group
} from '@mui/icons-material';

const Page = styled.div`
  width: 100%;
  min-height: 100%;
  padding: 0.9rem;
  background: ${({ theme }) => theme.BG};
  box-sizing: border-box;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
  margin-bottom: 0.9rem;
  padding: 0.8rem;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
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
  display: grid;
  grid-template-columns: repeat(4, minmax(130px, 1fr));
  gap: 0.5rem;
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(120px, 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 10px;
  padding: 0.5rem 0.65rem;
  font-size: 0.82rem;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.22);
    transform: translateY(-1px);
  }
`;

const Select = styled.select`
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 10px;
  padding: 0.5rem 0.65rem;
  font-size: 0.82rem;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.22);
    transform: translateY(-1px);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 0.8rem;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  position: relative;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 0.85rem;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
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
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  margin-bottom: 0.8rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 0.85rem;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
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

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.46rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.84rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};

  &:last-child {
    border-bottom: none;
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

type PaymentRow = {
  id: number;
  payment_date: string;
  amount: number;
  discount_amount: number;
  net_amount: number;
  payment_mode: string;
  student_id: number;
  received_by: number | null;
};

type StudentRow = {
  id: number;
  name: string;
  roll_number?: string;
  father_name?: string;
  class_id: number | null;
  section_id: number | null;
};

type ClassRow = { id: number; name: string };
type SectionRow = { id: number; name: string; class_id: number };
type UserRow = { id: number; name: string };

const formatCurrency = (n: number) => {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const getWeekKey = (dateStr: string) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

const PaymentsAnalyticsPage: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const toast = useToast();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [fromDate, setFromDate] = useState(monthStart.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [studentQuery, setStudentQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const studentsMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const classesMap = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const sectionsMap = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const usersMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const paymentMethods = useMemo(() => {
    return Array.from(new Set(payments.map((p) => p.payment_mode).filter(Boolean))).sort();
  }, [payments]);

  const fetchReferenceData = async () => {
    if (!user?.school_id) return;

    try {
      const [classesRes, sectionsRes, usersRes, studentsRes] = await Promise.all([
        supabase.from('classes').select('id,name').eq('school_id', user.school_id).order('name'),
        supabase.from('sections').select('id,name,class_id').eq('school_id', user.school_id).order('name'),
        supabase.from('users').select('id,name').eq('school_id', user.school_id).order('name'),
        supabase.from('students').select('id,name,roll_number,father_name,class_id,section_id').eq('school_id', user.school_id)
      ]);

      if (classesRes.error) throw classesRes.error;
      if (sectionsRes.error) throw sectionsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setClasses((classesRes.data || []) as ClassRow[]);
      setSections((sectionsRes.data || []) as SectionRow[]);
      setUsers((usersRes.data || []) as UserRow[]);
      setStudents((studentsRes.data || []) as StudentRow[]);
    } catch (e: any) {
      toast.showToast(`Failed to load reference data: ${e?.message || 'Unknown error'}`, 'error');
    }
  };

  const fetchPayments = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const data = await fetchAllRows<PaymentRow>(async (from, to) => {
        return await supabase
          .from('fee_payments')
          .select('id,payment_date,amount,discount_amount,net_amount,payment_mode,student_id,received_by')
          .eq('school_id', user.school_id)
          .gte('payment_date', fromDate)
          .lte('payment_date', toDate)
          .order('payment_date', { ascending: false })
          .range(from, to);
      });
      setPayments(data || []);
    } catch (e: any) {
      toast.showToast(`Failed to load payments analytics: ${e?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, [user?.school_id]);

  useEffect(() => {
    fetchPayments();
  }, [user?.school_id, fromDate, toDate]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (selectedMethod !== 'all' && p.payment_mode !== selectedMethod) return false;
      if (selectedCollector !== 'all' && String(p.received_by || '') !== selectedCollector) return false;

      const st = studentsMap.get(p.student_id);

      if (selectedClass !== 'all' && String(st?.class_id || '') !== selectedClass) return false;
      if (selectedSection !== 'all' && String(st?.section_id || '') !== selectedSection) return false;

      if (studentQuery.trim()) {
        const q = studentQuery.toLowerCase();
        const sName = (st?.name || '').toLowerCase();
        const sFather = (st?.father_name || '').toLowerCase();
        const sRoll = String(st?.roll_number || '').toLowerCase();
        if (!sName.includes(q) && !sFather.includes(q) && !sRoll.includes(q)) return false;
      }

      return true;
    });
  }, [payments, selectedMethod, selectedCollector, selectedClass, selectedSection, studentQuery, studentsMap]);

  const stats = useMemo(() => {
    const tx = filteredPayments.length;
    const gross = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const discount = filteredPayments.reduce((s, p) => s + Number(p.discount_amount || 0), 0);
    const net = filteredPayments.reduce((s, p) => s + Number(p.net_amount || p.amount || 0), 0);
    const avg = tx ? net / tx : 0;
    const uniqueStudents = new Set(filteredPayments.map((p) => p.student_id)).size;
    return { tx, gross, discount, net, avg, uniqueStudents };
  }, [filteredPayments]);

  const byMethod = useMemo(() => {
    const map: Record<string, { count: number; net: number }> = {};
    filteredPayments.forEach((p) => {
      const key = p.payment_mode || 'Unknown';
      if (!map[key]) map[key] = { count: 0, net: 0 };
      map[key].count += 1;
      map[key].net += Number(p.net_amount || p.amount || 0);
    });
    return Object.entries(map).map(([method, v]) => ({ method, ...v })).sort((a, b) => b.net - a.net);
  }, [filteredPayments]);

  const byCollector = useMemo(() => {
    const map: Record<string, { name: string; count: number; net: number }> = {};
    filteredPayments.forEach((p) => {
      const key = String(p.received_by || '0');
      const name = p.received_by ? (usersMap.get(p.received_by) || `User ${p.received_by}`) : 'Unknown';
      if (!map[key]) map[key] = { name, count: 0, net: 0 };
      map[key].count += 1;
      map[key].net += Number(p.net_amount || p.amount || 0);
    });
    return Object.values(map).sort((a, b) => b.net - a.net);
  }, [filteredPayments, usersMap]);

  const byDay = useMemo(() => {
    const map: Record<string, { count: number; net: number }> = {};
    filteredPayments.forEach((p) => {
      const key = (p.payment_date || '').slice(0, 10);
      if (!key) return;
      if (!map[key]) map[key] = { count: 0, net: 0 };
      map[key].count += 1;
      map[key].net += Number(p.net_amount || p.amount || 0);
    });
    return Object.entries(map).map(([date, v]) => ({ date, ...v })).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredPayments]);

  const classwiseBreakdown = useMemo(() => {
    const map: Record<string, { className: string; count: number; students: Set<number>; net: number }> = {};
    filteredPayments.forEach((p) => {
      const st = studentsMap.get(p.student_id);
      const key = String(st?.class_id || '0');
      const className = st?.class_id ? classesMap.get(st.class_id) || 'Unknown Class' : 'Unassigned';
      if (!map[key]) map[key] = { className, count: 0, students: new Set<number>(), net: 0 };
      map[key].count += 1;
      map[key].students.add(p.student_id);
      map[key].net += Number(p.net_amount || p.amount || 0);
    });

    return Object.values(map)
      .map((v) => ({ className: v.className, count: v.count, students: v.students.size, net: v.net }))
      .sort((a, b) => b.net - a.net);
  }, [filteredPayments, studentsMap, classesMap]);

  const weeklyTrend = useMemo(() => {
    const map: Record<string, { count: number; net: number }> = {};
    filteredPayments.forEach((p) => {
      const key = getWeekKey(p.payment_date || '');
      if (!key) return;
      if (!map[key]) map[key] = { count: 0, net: 0 };
      map[key].count += 1;
      map[key].net += Number(p.net_amount || p.amount || 0);
    });
    return Object.entries(map)
      .map(([week, v]) => ({ week, ...v }))
      .sort((a, b) => b.week.localeCompare(a.week));
  }, [filteredPayments]);

  const monthlyTrend = useMemo(() => {
    const map: Record<string, { count: number; net: number }> = {};
    filteredPayments.forEach((p) => {
      const key = (p.payment_date || '').slice(0, 7);
      if (!key) return;
      if (!map[key]) map[key] = { count: 0, net: 0 };
      map[key].count += 1;
      map[key].net += Number(p.net_amount || p.amount || 0);
    });
    return Object.entries(map)
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredPayments]);

  const topStudents = useMemo(() => {
    const map: Record<string, { id: number; name: string; cls: string; count: number; net: number }> = {};
    filteredPayments.forEach((p) => {
      const st = studentsMap.get(p.student_id);
      const key = String(p.student_id);
      if (!map[key]) {
        const cls = st?.class_id ? classesMap.get(st.class_id) || '-' : '-';
        const sec = st?.section_id ? sectionsMap.get(st.section_id)?.name || '' : '';
        map[key] = {
          id: p.student_id,
          name: st?.name || `Student ${p.student_id}`,
          cls: sec ? `${cls} (${sec})` : cls,
          count: 0,
          net: 0
        };
      }
      map[key].count += 1;
      map[key].net += Number(p.net_amount || p.amount || 0);
    });

    return Object.values(map).sort((a, b) => b.net - a.net).slice(0, 10);
  }, [filteredPayments, studentsMap, classesMap, sectionsMap]);

  const filteredSections = useMemo(() => {
    if (selectedClass === 'all') return sections;
    return sections.filter((s) => String(s.class_id) === selectedClass);
  }, [sections, selectedClass]);

  return (
    <Page theme={themeObj}>
      <Header>
        <Title theme={themeObj}>
          <PaymentsIcon />
          Payments Analytics
        </Title>

        <Filters>
          <AppDateField value={fromDate} onChange={(e) => setFromDate(e.target.value)} fullWidth={false} textFieldProps={{ InputLabelProps: { shrink: true }, sx: { minWidth: 170 } }} />
          <AppDateField value={toDate} onChange={(e) => setToDate(e.target.value)} fullWidth={false} textFieldProps={{ InputLabelProps: { shrink: true }, sx: { minWidth: 170 } }} />

          <Select theme={themeObj} value={selectedClass} onChange={(e) => {
            setSelectedClass(e.target.value);
            setSelectedSection('all');
          }}>
            <option value="all">All Classes</option>
            {classes.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </Select>

          <Select theme={themeObj} value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
            <option value="all">All Sections</option>
            {filteredSections.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </Select>

          <Select theme={themeObj} value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
            <option value="all">All Methods</option>
            {paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>

          <Select theme={themeObj} value={selectedCollector} onChange={(e) => setSelectedCollector(e.target.value)}>
            <option value="all">All Collectors</option>
            {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
          </Select>

          <Input
            theme={themeObj}
            type="text"
            placeholder="Search student / father / roll"
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
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
            <Card theme={themeObj}><Label theme={themeObj}>Transactions</Label><Value theme={themeObj}>{stats.tx}</Value></Card>
            <Card theme={themeObj}><Label theme={themeObj}>Gross Collected</Label><Value theme={themeObj}>Rs. {formatCurrency(stats.gross)}</Value></Card>
            <Card theme={themeObj}><Label theme={themeObj}>Discount Given</Label><Value theme={themeObj}>Rs. {formatCurrency(stats.discount)}</Value></Card>
            <Card theme={themeObj}><Label theme={themeObj}>Net Collected</Label><Value theme={themeObj}>Rs. {formatCurrency(stats.net)}</Value></Card>
          </Grid>

          <Grid style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <Card theme={themeObj}><Label theme={themeObj}><AccountBalanceWallet fontSize="small" /> Avg Transaction</Label><Value theme={themeObj}>Rs. {formatCurrency(stats.avg)}</Value></Card>
            <Card theme={themeObj}><Label theme={themeObj}><Group fontSize="small" /> Unique Students</Label><Value theme={themeObj}>{stats.uniqueStudents}</Value></Card>
            <Card theme={themeObj}><Label theme={themeObj}>Active Collectors</Label><Value theme={themeObj}>{byCollector.length}</Value></Card>
          </Grid>

          <TwoCol>
            <Panel theme={themeObj}>
              <PanelTitle theme={themeObj}><PieChart fontSize="small" /> Payment Mode Breakdown</PanelTitle>
              {byMethod.length === 0 ? (
                <Label theme={themeObj}>No data for selected filters.</Label>
              ) : byMethod.map((r) => (
                <Row key={r.method} theme={themeObj}>
                  <span>{r.method}</span>
                  <span>{r.count} tx | Rs. {formatCurrency(r.net)}</span>
                </Row>
              ))}
            </Panel>

            <Panel theme={themeObj}>
              <PanelTitle theme={themeObj}><Person fontSize="small" /> Collector Breakdown</PanelTitle>
              {byCollector.length === 0 ? (
                <Label theme={themeObj}>No collector data.</Label>
              ) : byCollector.map((r) => (
                <Row key={r.name} theme={themeObj}>
                  <span>{r.name}</span>
                  <span>{r.count} tx | Rs. {formatCurrency(r.net)}</span>
                </Row>
              ))}
            </Panel>
          </TwoCol>

          <TwoCol>
            <Panel theme={themeObj}>
              <PanelTitle theme={themeObj}><TrendingUp fontSize="small" /> Daily Trend</PanelTitle>
              <TableWrap theme={themeObj}>
                <Table>
                  <thead>
                    <tr>
                      <TH theme={themeObj}>Date</TH>
                      <TH theme={themeObj}>Transactions</TH>
                      <TH theme={themeObj}>Net</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {byDay.slice(0, 15).map((d) => (
                      <tr key={d.date}>
                        <TD theme={themeObj}>{d.date}</TD>
                        <TD theme={themeObj}>{d.count}</TD>
                        <TD theme={themeObj}>Rs. {formatCurrency(d.net)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </Panel>

            <Panel theme={themeObj}>
              <PanelTitle theme={themeObj}><School fontSize="small" /> Top Students by Collection</PanelTitle>
              <TableWrap theme={themeObj}>
                <Table>
                  <thead>
                    <tr>
                      <TH theme={themeObj}>Student</TH>
                      <TH theme={themeObj}>Class</TH>
                      <TH theme={themeObj}>Tx</TH>
                      <TH theme={themeObj}>Net</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {topStudents.map((s) => (
                      <tr key={s.id}>
                        <TD theme={themeObj}>{s.name}</TD>
                        <TD theme={themeObj}>{s.cls}</TD>
                        <TD theme={themeObj}>{s.count}</TD>
                        <TD theme={themeObj}>Rs. {formatCurrency(s.net)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </Panel>
          </TwoCol>

          <TwoCol>
            <Panel theme={themeObj}>
              <PanelTitle theme={themeObj}><School fontSize="small" /> Class-wise Breakdown</PanelTitle>
              <TableWrap theme={themeObj}>
                <Table>
                  <thead>
                    <tr>
                      <TH theme={themeObj}>Class</TH>
                      <TH theme={themeObj}>Students</TH>
                      <TH theme={themeObj}>Tx</TH>
                      <TH theme={themeObj}>Net</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {classwiseBreakdown.slice(0, 15).map((c) => (
                      <tr key={c.className}>
                        <TD theme={themeObj}>{c.className}</TD>
                        <TD theme={themeObj}>{c.students}</TD>
                        <TD theme={themeObj}>{c.count}</TD>
                        <TD theme={themeObj}>Rs. {formatCurrency(c.net)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </Panel>

            <Panel theme={themeObj}>
              <PanelTitle theme={themeObj}><TrendingUp fontSize="small" /> Weekly & Monthly Trends</PanelTitle>
              <TwoCol style={{ marginBottom: 0, gap: '0.6rem' }}>
                <TableWrap theme={themeObj}>
                  <Table>
                    <thead>
                      <tr>
                        <TH theme={themeObj}>Week</TH>
                        <TH theme={themeObj}>Tx</TH>
                        <TH theme={themeObj}>Net</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyTrend.slice(0, 10).map((w) => (
                        <tr key={w.week}>
                          <TD theme={themeObj}>{w.week}</TD>
                          <TD theme={themeObj}>{w.count}</TD>
                          <TD theme={themeObj}>Rs. {formatCurrency(w.net)}</TD>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>

                <TableWrap theme={themeObj}>
                  <Table>
                    <thead>
                      <tr>
                        <TH theme={themeObj}>Month</TH>
                        <TH theme={themeObj}>Tx</TH>
                        <TH theme={themeObj}>Net</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyTrend.slice(0, 12).map((m) => (
                        <tr key={m.month}>
                          <TD theme={themeObj}>{m.month}</TD>
                          <TD theme={themeObj}>{m.count}</TD>
                          <TD theme={themeObj}>Rs. {formatCurrency(m.net)}</TD>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </TwoCol>
            </Panel>
          </TwoCol>
        </>
      )}
    </Page>
  );
};

export default PaymentsAnalyticsPage;

