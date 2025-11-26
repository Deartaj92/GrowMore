import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { supabase } from '../supabaseClient';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId } from '../utils/studentUtils';
import {
  Assessment,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  People,
  MonetizationOn,
  Payment,
  Warning,
  CheckCircle,
  Refresh as RefreshIcon,
  BarChart,
  PieChart,
  Receipt,
  CalendarToday
} from '@mui/icons-material';
import { useLoading } from '../contexts/LoadingContext';
import { format } from 'date-fns';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    gap: 0.2rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    margin-bottom: 0.2rem;
    gap: 0.5rem;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    flex-shrink: 0;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
`;

const StyledSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover, &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.9)'};
  }
  
  & option {
    background: ${({ theme }) => isDark(theme) ? '#2a2a2a' : '#ffffff'};
    color: ${({ theme }) => isDark(theme) ? '#e2e8f0' : '#1e293b'};
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.05)'};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
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

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const StatChange = styled.div<{ $positive?: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ContentCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
`;

const TableRow = styled.tr`
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const TableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled.div<{ $percentage: number; $color: string }>`
  height: 100%;
  width: ${({ $percentage }) => Math.min($percentage, 100)}%;
  background: ${({ $color }) => $color};
  transition: width 0.3s ease;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

// ===== MAIN COMPONENT =====

interface FeeAnalyticsProps {
  className?: string;
}

const FeeAnalytics: React.FC<FeeAnalyticsProps> = ({ className }) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { setLoading } = useLoading();
  const { showToast } = useToast();
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');

  // Helper functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch data similar to ledger
  const fetchAnalyticsData = useCallback(async () => {
    if (!user?.school_id) return;

    setLoading(true);
    setIsLoadingData(true);
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, roll_number, class_id, section_id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (studentsError) throw studentsError;

      // Fetch classes and sections
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', user.school_id)
        .order('is_active', { ascending: false })
        .order('name', { ascending: false });

      if (sessionsData) {
        setSessions(sessionsData);
      }

      // Fetch invoices (filtered by selected session if one is selected)
      let invoicesQuery = supabase
        .from('fee_invoices')
        .select('*')
        .eq('school_id', user.school_id);
      
      if (selectedSession && selectedSession !== '') {
        invoicesQuery = invoicesQuery.eq('session_id', parseInt(selectedSession));
      }
      
      const { data: invoicesData, error: invoicesError } = await invoicesQuery
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch all payments (for analytics)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('school_id', user.school_id)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      setStudents(studentsData || []);
      setInvoices(invoicesData || []);
      setPayments(paymentsData || []);
      setClasses(classesData || []);
      setSections(sectionsData || []);
    } catch (error: any) {
      console.error('Error fetching analytics data:', error);
      showToast('Failed to fetch analytics data', 'error');
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  }, [user?.school_id, selectedSession, setLoading, showToast]);

  // Set default session to active session when sessions are loaded
  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      const activeSession = sessions.find(s => s.is_active);
      if (activeSession) {
        setSelectedSession(String(activeSession.id));
      }
    }
  }, [sessions, selectedSession]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Process analytics data
  const analyticsData = useMemo(() => {
    if (!students.length || !invoices.length) {
      return null;
    }

    // Calculate totals (matching ledger calculation)
    const totalFeeAmount = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    // Match payments to invoices (like ledger does)
    const matchedPayments = payments.filter(pay => 
      invoices.some(inv => inv.id === pay.invoice_id)
    );
    const totalPaidAmount = matchedPayments.reduce((sum, pay) => sum + Number(pay.net_amount || pay.amount || 0), 0);
    const totalRemaining = totalFeeAmount - totalPaidAmount;
    const collectionRate = totalFeeAmount > 0 ? (totalPaidAmount / totalFeeAmount) * 100 : 0;

    // Top defaulters
    const studentRemainingFees = students.map(student => {
      const studentInvoices = invoices.filter(inv => inv.student_id === student.id);
      const studentPayments = matchedPayments.filter(pay => 
        studentInvoices.some(inv => inv.id === pay.invoice_id)
      );
      
      const studentTotalFee = studentInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      const studentTotalPaid = studentPayments.reduce((sum, pay) => sum + Number(pay.net_amount || pay.amount || 0), 0);
      const remaining = studentTotalFee - studentTotalPaid;
      
      return {
        ...student,
        totalFee: studentTotalFee,
        totalPaid: studentTotalPaid,
        remaining: remaining,
        className: classes.find(c => c.id === student.class_id)?.name || 'Unknown',
        sectionName: sections.find(s => s.id === student.section_id && s.class_id === student.class_id)?.name || ''
      };
    }).filter(s => s.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 10);

    // Recent payments
    const recentPaymentsData = matchedPayments
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 10)
      .map(payment => {
        const invoice = invoices.find(inv => inv.id === payment.invoice_id);
        const student = students.find(s => s.id === invoice?.student_id);
        return {
          ...payment,
          studentName: student?.name || 'Unknown',
          className: classes.find(c => c.id === student?.class_id)?.name || 'Unknown'
        };
      });

    // Class-wise data
    const classWiseData = classes.map(cls => {
      const classStudents = students.filter(s => s.class_id === cls.id);
      const classInvoices = invoices.filter(inv => 
        classStudents.some(s => s.id === inv.student_id)
      );
      const classPayments = matchedPayments.filter(pay =>
        classInvoices.some(inv => inv.id === pay.invoice_id)
      );
      
      const classTotalFee = classInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      const classTotalPaid = classPayments.reduce((sum, pay) => sum + Number(pay.net_amount || pay.amount || 0), 0);
      const classRemaining = classTotalFee - classTotalPaid;
      const classCollectionRate = classTotalFee > 0 ? (classTotalPaid / classTotalFee) * 100 : 0;
      
      return {
        className: cls.name,
        totalStudents: classStudents.length,
        totalFee: classTotalFee,
        totalPaid: classTotalPaid,
        remaining: classRemaining,
        collectionRate: classCollectionRate
      };
    }).sort((a, b) => b.totalFee - a.totalFee);

    // Monthly trends
    const monthlyTrends: Array<{ month: string; amount: number; count: number }> = [];
    const monthMap: { [key: string]: { amount: number; count: number } } = {};
    
    payments.forEach(pay => {
      const payDate = new Date(pay.payment_date);
      const monthKey = `${payDate.getFullYear()}-${payDate.getMonth()}`;
      
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { amount: 0, count: 0 };
      }
      
      monthMap[monthKey].amount += Number(pay.net_amount || pay.amount || 0);
      monthMap[monthKey].count += 1;
    });
    
    Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .forEach(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month), 1);
        monthlyTrends.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          amount: data.amount,
          count: data.count
        });
      });

    // Payment method statistics
    const paymentMethodStats: Array<{ method: string; amount: number; count: number; percentage: number }> = [];
    const methodCounts: { [key: string]: { amount: number; count: number } } = {};
    
    payments.forEach(pay => {
      const method = pay.payment_mode || 'Unknown';
      if (!methodCounts[method]) {
        methodCounts[method] = { amount: 0, count: 0 };
      }
      methodCounts[method].amount += Number(pay.net_amount || pay.amount || 0);
      methodCounts[method].count += 1;
    });
    
    Object.entries(methodCounts).forEach(([method, data]) => {
      paymentMethodStats.push({
        method: method,
        amount: data.amount,
        count: data.count,
        percentage: payments.length > 0 ? (data.count / payments.length) * 100 : 0
      });
    });
    
    paymentMethodStats.sort((a, b) => b.amount - a.amount);

    return {
      totalFeeAmount,
      totalPaidAmount,
      totalRemaining,
      collectionRate,
      totalStudents: students.length,
      totalInvoices: invoices.length,
      totalPayments: matchedPayments.length,
      topDefaulters: studentRemainingFees,
      recentPayments: recentPaymentsData,
      classWiseData,
      monthlyTrends,
      paymentMethodStats
    };
  }, [students, invoices, payments, classes, sections]);

  if (isLoadingData) {
    return (
      <PageContainer theme={theme} className={className}>
        <Header theme={theme}>
          <SkeletonBox $width="200px" $height="28px" />
          <SkeletonBox $width="100px" $height="36px" />
        </Header>
        <StatsGrid theme={theme}>
          {[1, 2, 3, 4].map(i => (
            <StatCard key={i} theme={theme}>
              <SkeletonBox $width="80px" $height="14px" />
              <SkeletonBox $width="120px" $height="24px" />
            </StatCard>
          ))}
        </StatsGrid>
      </PageContainer>
    );
  }

  if (!analyticsData) {
    return (
      <PageContainer theme={theme} className={className}>
        <Header theme={theme}>
          <HeaderTitle theme={theme}>
            <Assessment />
            Fee Analytics
          </HeaderTitle>
          <HeaderActions theme={theme}>
            <ActionButton theme={theme} onClick={fetchAnalyticsData}>
              <RefreshIcon style={{ fontSize: '1rem' }} />
              Refresh
            </ActionButton>
          </HeaderActions>
        </Header>
        <EmptyState theme={theme}>
          <Assessment style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
          No analytics data available
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer theme={theme} className={className}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <Assessment />
          Fee Analytics
        </HeaderTitle>
        <HeaderActions theme={theme}>
          <StyledSelect
            theme={theme}
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
          >
            <option value="">All Sessions</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.name} {session.is_active ? '(Active)' : ''}
              </option>
            ))}
          </StyledSelect>
          <ActionButton theme={theme} onClick={fetchAnalyticsData}>
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </ActionButton>
        </HeaderActions>
      </Header>

      <StatsGrid theme={theme}>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Collected</StatLabel>
          <StatValue theme={theme}>{formatCurrency(analyticsData.totalPaidAmount)}</StatValue>
          <StatChange $positive={true} theme={theme}>
            <TrendingUp style={{ fontSize: '0.75rem' }} />
            {analyticsData.collectionRate.toFixed(1)}% of total fees
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <StatLabel theme={theme}>Outstanding Amount</StatLabel>
          <StatValue theme={theme}>{formatCurrency(analyticsData.totalRemaining)}</StatValue>
          <StatChange $positive={false} theme={theme}>
            <TrendingDown style={{ fontSize: '0.75rem' }} />
            {(100 - analyticsData.collectionRate).toFixed(1)}% pending
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Students</StatLabel>
          <StatValue theme={theme}>{analyticsData.totalStudents}</StatValue>
          <StatChange $positive={true} theme={theme}>
            <CheckCircle style={{ fontSize: '0.75rem' }} />
            {analyticsData.totalInvoices} invoices
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Payments</StatLabel>
          <StatValue theme={theme}>{analyticsData.totalPayments}</StatValue>
          <StatChange $positive={true} theme={theme}>
            <TrendingUp style={{ fontSize: '0.75rem' }} />
            Avg: {formatCurrency(analyticsData.totalPayments > 0 ? analyticsData.totalPaidAmount / analyticsData.totalPayments : 0)}
          </StatChange>
        </StatCard>
      </StatsGrid>

      <ContentGrid theme={theme}>
        {/* Monthly Trends */}
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <TrendingUp />
            Monthly Collection Trends
          </CardTitle>
          <div style={{ height: '200px', position: 'relative', padding: '1rem 0.5rem 2rem 0.5rem' }}>
            {analyticsData.monthlyTrends.length === 0 ? (
              <EmptyState theme={theme}>
                <div style={{ fontSize: '0.9rem' }}>No monthly data available</div>
              </EmptyState>
            ) : (
              (() => {
                const maxAmount = Math.max(...analyticsData.monthlyTrends.map(t => t.amount), 1);
                const chartHeight = 150;
                const chartWidth = 100;
                const padding = 20;
                const points = analyticsData.monthlyTrends.map((trend, index) => {
                  const x = (index / (analyticsData.monthlyTrends.length - 1 || 1)) * (chartWidth - padding * 2) + padding;
                  const y = chartHeight - (trend.amount / maxAmount) * (chartHeight - padding * 2) - padding;
                  return { x, y, amount: trend.amount, month: trend.month };
                });
                const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                
                return (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                        <line
                          key={i}
                          x1={padding}
                          y1={padding + (chartHeight - padding * 2) * ratio}
                          x2={chartWidth - padding}
                          y2={padding + (chartHeight - padding * 2) * ratio}
                          stroke={isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}
                          strokeWidth="1"
                        />
                      ))}
                      {/* Line chart */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Area under line */}
                      <path
                        d={`${pathData} L ${points[points.length - 1].x} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`}
                        fill="url(#gradient)"
                        opacity="0.2"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Data points */}
                      {points.map((point, index) => (
                        <g key={index}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#3b82f6"
                            stroke={theme.CARD}
                            strokeWidth="2"
                          />
                          {/* Tooltip on hover */}
                          <title>{point.month}: {formatCurrency(point.amount)}</title>
                        </g>
                      ))}
                    </svg>
                    {/* Month labels */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', padding: '0 0.5rem' }}>
                      {analyticsData.monthlyTrends.map((trend, index) => (
                        <div key={index} style={{ fontSize: '0.7rem', color: theme.TEXT_SECONDARY, textAlign: 'center', flex: 1 }}>
                          {trend.month}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </ContentCard>

        {/* Collection Rate by Class */}
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <PieChart />
            Collection Rate by Class
          </CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {analyticsData.classWiseData.slice(0, 5).map((classData, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: theme.TEXT_PRIMARY }}>
                    {classData.className}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY }}>
                    {classData.collectionRate.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar theme={theme}>
                  <ProgressFill 
                    $percentage={classData.collectionRate} 
                    $color={classData.collectionRate >= 80 ? '#22c55e' : classData.collectionRate >= 60 ? '#f59e0b' : '#ef4444'}
                  />
                </ProgressBar>
                <div style={{ fontSize: '0.7rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                  {formatCurrency(classData.totalPaid)} / {formatCurrency(classData.totalFee)}
                </div>
              </div>
            ))}
          </div>
        </ContentCard>
      </ContentGrid>

      <ContentGrid theme={theme}>
        {/* Top Defaulters */}
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <Warning />
            Top Fee Defaulters
          </CardTitle>
          {analyticsData.topDefaulters.length > 0 ? (
            <Table>
              <TableHead theme={theme}>
                <TableRow theme={theme}>
                  <TableHeaderCell theme={theme}>Student</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Class</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Outstanding</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {analyticsData.topDefaulters.map((defaulter) => (
                  <TableRow key={defaulter.id} theme={theme}>
                    <TableCell theme={theme}>
                      <div style={{ fontWeight: '600' }}>{defaulter.name}</div>
                      <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                        ID: {getStudentDisplayId(defaulter)}
                      </div>
                    </TableCell>
                    <TableCell theme={theme}>
                      {defaulter.className} {defaulter.sectionName}
                    </TableCell>
                    <TableCell theme={theme} style={{ fontWeight: '600', color: '#ef4444' }}>
                      {formatCurrency(defaulter.remaining)}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState theme={theme}>
              <CheckCircle style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#22c55e' }} />
              No fee defaulters found
            </EmptyState>
          )}
        </ContentCard>

        {/* Recent Payments */}
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <Receipt />
            Recent Payments
          </CardTitle>
          {analyticsData.recentPayments.length > 0 ? (
            <Table>
              <TableHead theme={theme}>
                <TableRow theme={theme}>
                  <TableHeaderCell theme={theme}>Student</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Amount</TableHeaderCell>
                  <TableHeaderCell theme={theme}>Date</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {analyticsData.recentPayments.map((payment) => (
                  <TableRow key={payment.id} theme={theme}>
                    <TableCell theme={theme}>
                      <div style={{ fontWeight: '600' }}>{payment.studentName}</div>
                      <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                        {payment.className}
                      </div>
                    </TableCell>
                    <TableCell theme={theme} style={{ fontWeight: '600', color: '#22c55e' }}>
                      {formatCurrency(Number(payment.net_amount || payment.amount || 0))}
                    </TableCell>
                    <TableCell theme={theme}>
                      {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState theme={theme}>
              <Payment style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }} />
              No recent payments found
            </EmptyState>
          )}
        </ContentCard>
      </ContentGrid>

      {/* Payment Methods Analysis */}
      <ContentCard theme={theme} style={{ marginBottom: '0.25rem' }}>
        <CardTitle theme={theme}>
          <PieChart />
          Payment Methods Analysis
        </CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {analyticsData.paymentMethodStats.length === 0 ? (
            <div style={{ 
              gridColumn: '1 / -1',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: theme.TEXT_SECONDARY,
              fontSize: '0.9rem',
              padding: '2rem 0'
            }}>
              No payment method data available
            </div>
          ) : (
            analyticsData.paymentMethodStats.map((method, index) => (
              <div key={index} style={{ 
                padding: '1rem', 
                border: `1px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`, 
                borderRadius: '8px',
                background: isDark(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: theme.TEXT_PRIMARY }}>
                    {method.method}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY }}>
                    {method.percentage.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar theme={theme}>
                  <ProgressFill 
                    $percentage={method.percentage} 
                    $color={['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'][index % 5]}
                  />
                </ProgressBar>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: theme.TEXT_SECONDARY }}>
                    {method.count} payments
                  </div>
                  <div style={{ fontSize: '0.7rem', color: theme.TEXT_PRIMARY, fontWeight: '600' }}>
                    {formatCurrency(method.amount)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ContentCard>
    </PageContainer>
  );
};

// Skeleton Components
const SkeletonBox = styled.div<{ $width?: string; $height?: string }>`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  border-radius: 8px;
  animation: shimmer 1.5s infinite;
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '20px'};
  
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  
  background: linear-gradient(
    90deg,
    ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.03)'} 0%,
    ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.08)'} 50%,
    ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.03)'} 100%
  );
  background-size: 1000px 100%;
`;

export default FeeAnalytics;
