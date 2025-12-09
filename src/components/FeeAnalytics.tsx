import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
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
  PieChart as PieChartIcon,
  Receipt,
  CalendarToday,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import { useLoading } from '../contexts/LoadingContext';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, Legend } from 'recharts';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 2rem; /* Extra padding at bottom to prevent clipping */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    padding-bottom: 2rem;
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
  const classLegendScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position
  const checkScrollPosition = useCallback(() => {
    if (classLegendScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = classLegendScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  // Scroll handlers
  const scrollLeft = () => {
    if (classLegendScrollRef.current) {
      classLegendScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (classLegendScrollRef.current) {
      classLegendScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

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
        .select('id, name, is_active, start_date, end_date')
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
    const totalReceived = matchedPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
    const totalDiscount = matchedPayments.reduce((sum, pay) => sum + Number(pay.discount_amount || 0), 0);
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
    
    // Determine date range based on selected session
    let startDate: Date;
    let endDate: Date;
    
    if (selectedSession && selectedSession !== '') {
      // If a specific session is selected, use session date range
      const selectedSessionData = sessions.find(s => String(s.id) === selectedSession);
      if (selectedSessionData && selectedSessionData.start_date && selectedSessionData.end_date) {
        startDate = new Date(selectedSessionData.start_date);
        endDate = new Date(selectedSessionData.end_date);
      } else {
        // Fallback to last 12 months if session data not available
        endDate = new Date();
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);
      }
    } else {
      // If "All Sessions" is selected, show last 12 months
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
    }
    
    // Generate all months in the date range
    const monthMap: { [key: string]: { amount: number; count: number } } = {};
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    // Initialize all months in range with 0
    while (current <= endMonth) {
      const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
      monthMap[monthKey] = { amount: 0, count: 0 };
      current.setMonth(current.getMonth() + 1);
    }
    
    // Fill in actual payment data
    payments.forEach(pay => {
      const payDate = new Date(pay.payment_date);
      const monthKey = `${payDate.getFullYear()}-${payDate.getMonth()}`;
      
      // Only include payments within the date range
      if (payDate >= startDate && payDate <= endDate && monthMap[monthKey]) {
        monthMap[monthKey].amount += Number(pay.net_amount || pay.amount || 0);
        monthMap[monthKey].count += 1;
      }
    });
    
    // Convert to array and format, ensuring proper chronological order
    Object.entries(monthMap)
      .sort(([a], [b]) => {
        // Sort by year first, then by month
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        if (yearA !== yearB) {
          return yearA - yearB;
        }
        return monthA - monthB;
      })
      .forEach(([monthKey, data]) => {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(year, month, 1);
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
      totalReceived,
      totalDiscount,
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
  }, [students, invoices, payments, classes, sections, selectedSession, sessions]);

  // Check scroll position on mount and when data changes
  useEffect(() => {
    checkScrollPosition();
    const timer = setTimeout(checkScrollPosition, 100);
    return () => clearTimeout(timer);
  }, [analyticsData?.classWiseData, checkScrollPosition]);

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
          <StatLabel theme={theme}>Total Received</StatLabel>
          <StatValue theme={theme}>{formatCurrency(analyticsData.totalReceived)}</StatValue>
          <StatChange $positive={true} theme={theme}>
            <CheckCircle style={{ fontSize: '0.75rem' }} />
              Without discounts
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Discount</StatLabel>
          <StatValue theme={theme}>{formatCurrency(analyticsData.totalDiscount)}</StatValue>
          <StatChange $positive={true} theme={theme}>
            <TrendingDown style={{ fontSize: '0.75rem' }} />
            {analyticsData.totalReceived > 0 ? ((analyticsData.totalDiscount / analyticsData.totalReceived) * 100).toFixed(1) : 0}% of received
          </StatChange>
        </StatCard>
      </StatsGrid>

      <ContentGrid theme={theme}>
        {/* Monthly Trends */}
        <ContentCard theme={theme} style={{ padding: '1rem' }}>
          <CardTitle theme={theme} style={{ marginBottom: '0.75rem' }}>
            <TrendingUp />
              Monthly Collection Trends
          </CardTitle>
          <div style={{ height: '450px', position: 'relative' }}>
            {analyticsData.monthlyTrends.length === 0 ? (
              <EmptyState theme={theme}>
                <div style={{ fontSize: '0.9rem' }}>No monthly data available</div>
              </EmptyState>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analyticsData.monthlyTrends}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                  />
                  <XAxis 
                    dataKey="month" 
                    stroke={theme.TEXT_SECONDARY}
                    tick={{ fill: theme.TEXT_SECONDARY, fontSize: 12 }}
                    tickLine={{ stroke: theme.TEXT_SECONDARY }}
                  />
                  <YAxis 
                    stroke={theme.TEXT_SECONDARY}
                    tick={{ fill: theme.TEXT_SECONDARY, fontSize: 12 }}
                    tickLine={{ stroke: theme.TEXT_SECONDARY }}
                    domain={[0, 1000000]}
                    ticks={[0, 100000, 200000, 300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000]}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                      return value.toFixed(0);
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark(theme) ? '#1e293b' : '#ffffff',
                      border: `1px solid ${isDark(theme) ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      color: theme.TEXT_PRIMARY,
                      boxShadow: isDark(theme) 
                        ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
                        : '0 4px 12px rgba(0, 0, 0, 0.15)',
                      padding: '12px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ 
                      color: isDark(theme) ? '#f1f5f9' : '#1e293b',
                      fontWeight: 600,
                      marginBottom: '4px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#colorCollection)"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ContentCard>

        {/* Collection Rate by Class */}
        <ContentCard theme={theme} style={{ padding: '1rem' }}>
          <CardTitle theme={theme} style={{ marginBottom: '0.75rem' }}>
            <PieChartIcon />
              Collection Rate by Class
          </CardTitle>
          {analyticsData.classWiseData.filter(c => c.totalPaid > 0).length > 0 ? (
            <div style={{ height: '450px', position: 'relative', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                    <Pie
                      data={sortClasses(
                        analyticsData.classWiseData
                          .filter(c => c.totalPaid > 0)
                          .map((classData) => ({
                            name: classData.className,
                            value: classData.totalPaid,
                            total: classData.totalFee,
                            rate: classData.collectionRate,
                            students: classData.totalStudents
                          }))
                      )}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={180}
                      fill="#8884d8"
                      dataKey="value"
                    >
                    {sortClasses(
                      analyticsData.classWiseData
                        .filter(c => c.totalPaid > 0)
                        .map((classData) => ({
                          name: classData.className,
                          value: classData.totalPaid,
                          total: classData.totalFee,
                          rate: classData.collectionRate,
                          students: classData.totalStudents
                        }))
                    ).map((classData, index) => {
                        const colors = [
                          '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
                          '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
                          '#14b8a6', '#a855f7', '#f43f5e', '#fb923c', '#38bdf8',
                          '#34d399', '#fbbf24', '#60a5fa', '#c084fc', '#fb7185',
                          '#4ade80', '#facc15', '#818cf8', '#e879f9', '#f472b6'
                        ];
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]}
                          />
                        );
                      })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: 0
                    }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      
                      const data = payload[0]?.payload;
                      if (!data) return null;
                      
                      return (
                        <div style={{
                          backgroundColor: isDark(theme) ? '#1e293b' : '#ffffff',
                          border: `1px solid ${isDark(theme) ? '#334155' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          boxShadow: isDark(theme) 
                            ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
                            : '0 4px 12px rgba(0, 0, 0, 0.15)',
                          padding: '12px'
                        }}>
                          <div style={{
                            color: isDark(theme) ? '#ffffff' : '#1e293b',
                            fontWeight: 600,
                            fontSize: '13px',
                            marginBottom: '8px',
                            borderBottom: `1px solid ${isDark(theme) ? '#334155' : '#e2e8f0'}`,
                            paddingBottom: '6px'
                          }}>
                            {data.name}
                          </div>
                          <div style={{
                            color: isDark(theme) ? '#ffffff' : '#1e293b',
                            fontSize: '12px'
                          }}>
                            <div style={{ marginBottom: '4px' }}>
                              <span style={{ color: isDark(theme) ? '#94a3b8' : '#64748b' }}>Collected: </span>
                              <span style={{ fontWeight: 600 }}>
                                {formatCurrency(data.value)} / {formatCurrency(data.total)} ({data.rate.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                    <Legend
                      wrapperStyle={{ 
                        fontSize: '0.85rem', 
                        color: isDark(theme) ? '#f1f5f9' : '#1e293b',
                        fontWeight: 500
                      }}
                      iconType="square"
                      verticalAlign="top"
                      height={0}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ 
                paddingTop: '0.75rem',
                borderTop: `1px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {canScrollLeft && (
                  <button
                    onClick={scrollLeft}
                    style={{
                      position: 'absolute',
                      left: 0,
                      zIndex: 10,
                      background: isDark(theme) ? '#1e293b' : '#ffffff',
                      border: `1px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: isDark(theme) ? '#f1f5f9' : '#1e293b',
                      boxShadow: isDark(theme) 
                        ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease',
                      padding: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDark(theme) ? '#334155' : '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isDark(theme) ? '#1e293b' : '#ffffff';
                    }}
                  >
                    <ChevronLeft style={{ fontSize: '20px' }} />
                  </button>
                )}
                <div
                  ref={classLegendScrollRef}
                  onScroll={checkScrollPosition}
                  style={{
                    flex: 1,
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollBehavior: 'smooth',
                    paddingLeft: canScrollLeft ? '40px' : '0',
                    paddingRight: canScrollRight ? '40px' : '0',
                    scrollbarWidth: 'thin',
                    scrollbarColor: isDark(theme) ? '#475569 #1e293b' : '#cbd5e1 #f1f5f9'
                  }}
                >
                  {sortClasses(
                    analyticsData.classWiseData
                      .filter(c => c.totalPaid > 0)
                      .map((classData) => ({
                        name: classData.className,
                        value: classData.totalPaid,
                        total: classData.totalFee,
                        rate: classData.collectionRate,
                        students: classData.totalStudents
                      }))
                  ).map((classData, index) => {
                    const colors = [
                      '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
                      '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
                      '#14b8a6', '#a855f7', '#f43f5e', '#fb923c', '#38bdf8',
                      '#34d399', '#fbbf24', '#60a5fa', '#c084fc', '#fb7185',
                      '#4ade80', '#facc15', '#818cf8', '#e879f9', '#f472b6'
                    ];
                    return (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        color: isDark(theme) ? '#f1f5f9' : '#1e293b',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          backgroundColor: colors[index % colors.length]
                        }} />
                        <span>{classData.name} ({classData.rate.toFixed(1)}%)</span>
                      </div>
                    );
                  })}
                </div>
                {canScrollRight && (
                  <button
                    onClick={scrollRight}
                    style={{
                      position: 'absolute',
                      right: 0,
                      zIndex: 10,
                      background: isDark(theme) ? '#1e293b' : '#ffffff',
                      border: `1px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: isDark(theme) ? '#f1f5f9' : '#1e293b',
                      boxShadow: isDark(theme) 
                        ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease',
                      padding: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDark(theme) ? '#334155' : '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isDark(theme) ? '#1e293b' : '#ffffff';
                    }}
                  >
                    <ChevronRight style={{ fontSize: '20px' }} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState theme={theme}>
              <div style={{ fontSize: '0.9rem' }}>No class data available</div>
            </EmptyState>
          )}
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
          <PieChartIcon />
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
