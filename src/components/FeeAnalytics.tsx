import React, { useState, useEffect, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { 
  TrendingUp, 
  TrendingDown, 
  AccountBalance, 
  People, 
  Assessment, 
  PieChart, 
  BarChart, 
  CalendarToday,
  MonetizationOn,
  School,
  Class,
  Receipt,
  Payment,
  Warning,
  CheckCircle,
  Info,
  Refresh
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { CircularProgress, Button, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { getStudentDisplayId } from '../utils/studentUtils';

// ===== STYLED COMPONENTS =====

const AnalyticsContainer = styled.div`
  width: 100%;
  padding: 1rem;
  background: ${({ theme }) => theme.BG};
  min-height: 100vh;
  box-sizing: border-box;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const RefreshButton = styled(Button)`
  min-width: auto;
  padding: 8px 12px;
  border-radius: 8px;
  text-transform: none;
  font-weight: 600;
`;

// Metrics Grid
const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }
`;

const MetricIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $color }) => $color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color};
  font-size: 1.5rem;
`;

const MetricContent = styled.div`
  flex: 1;
`;

const MetricValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.25rem;
`;

const MetricChange = styled.div<{ $positive?: boolean }>`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

// Charts Grid
const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const ChartTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// Tables
const TablesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const TableCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const TableHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const TableTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: ${({ theme }) => theme.FIELD_BG};
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
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
  border-right: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-right: none;
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-right: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-right: none;
  }
`;

// Status indicators
const StatusBadge = styled.span<{ $status: 'paid' | 'partial' | 'unpaid' }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  
  ${({ $status }) => {
    switch ($status) {
      case 'paid':
        return 'background: #dcfce7; color: #166534;';
      case 'partial':
        return 'background: #fef3c7; color: #92400e;';
      case 'unpaid':
        return 'background: #fee2e2; color: #991b1b;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
`;

// Loading and Error States
const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #ef4444;
  background: #fef2f2;
  border-radius: 8px;
  margin: 1rem 0;
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

// Progress bars
const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled.div<{ $percentage: number; $color: string }>`
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  background: ${({ $color }) => $color};
  transition: width 0.3s ease;
`;

// ===== MAIN COMPONENT =====

interface FeeAnalyticsProps {
  className?: string;
}

const FeeAnalytics: React.FC<FeeAnalyticsProps> = ({ className }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Data state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [topDefaulters, setTopDefaulters] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [classWiseData, setClassWiseData] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [yearlyComparison, setYearlyComparison] = useState<any[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);
  const [paymentMethodStats, setPaymentMethodStats] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <AnalyticsContainer className={className}>
        <ErrorContainer>
          <Info style={{ marginRight: '0.5rem' }} />
          No school context found. Please contact your administrator.
        </ErrorContainer>
      </AnalyticsContainer>
    );
  }

  // Load analytics data
  const loadAnalyticsData = async () => {
    if (!user?.school_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get current session
      const { data: currentSession } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .single();

      if (!currentSession) {
        throw new Error('No active session found');
      }

      // Always get all data (no period filtering)
      const startDate = new Date('2020-01-01'); // Start from 2020 to get all data

      // Fetch all required data in parallel
      const [
        { data: feeInvoices },
        { data: feePayments },
        { data: allFeePayments },
        { data: students },
        { data: classes },
        { data: sections }
      ] = await Promise.all([
        supabase
          .from('fee_invoices')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('session_id', currentSession.id),
        supabase
          .from('fee_payments')
          .select('*')
          .eq('school_id', user.school_id)
          .gte('payment_date', startDate.toISOString().split('T')[0]),
        supabase
          .from('fee_payments')
          .select('*')
          .eq('school_id', user.school_id)
          .gte('payment_date', '2020-01-01'), // Get all payments for comparisons
        supabase
          .from('students')
          .select('id, name, class_id, section_id, roll_number')
          .eq('school_id', user.school_id)
          .eq('status', 'active'),
        supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', user.school_id),
        supabase
          .from('sections')
          .select('id, name')
          .eq('school_id', user.school_id)
      ]);

      // Process analytics data
      const processedData = processAnalyticsData(
        feeInvoices || [],
        feePayments || [],
        allFeePayments || [],
        students || [],
        classes || [],
        sections || [],
        selectedYear
      );

      setAnalyticsData(processedData);
      setTopDefaulters(processedData.topDefaulters);
      setRecentPayments(processedData.recentPayments);
      setClassWiseData(processedData.classWiseData);
      setMonthlyTrends(processedData.monthlyTrends);
      setYearlyComparison(processedData.yearlyComparison);
      setMonthlyComparison(processedData.monthlyComparison);
      setPaymentMethodStats(processedData.paymentMethodStats);
      setAvailableYears(processedData.availableYears);
      
      // Year is already set to 'all' by default
      
      setLastUpdated(new Date());
      
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
      showToast('Failed to load analytics data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Process analytics data
  const processAnalyticsData = (
    invoices: any[],
    payments: any[],
    allPayments: any[],
    students: any[],
    classes: any[],
    sections: any[],
    selectedYear: string
  ) => {
    // Calculate total amounts
    const totalFeeAmount = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    const totalPaidAmount = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
    const totalRemaining = totalFeeAmount - totalPaidAmount;
    const collectionRate = totalFeeAmount > 0 ? (totalPaidAmount / totalFeeAmount) * 100 : 0;

    // Top defaulters (students with highest remaining fees)
    const studentRemainingFees = students.map(student => {
      const studentInvoices = invoices.filter(inv => inv.student_id === student.id);
      const studentPayments = payments.filter(pay => 
        studentInvoices.some(inv => inv.id === pay.invoice_id)
      );
      
      const studentTotalFee = studentInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      const studentTotalPaid = studentPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
      const remaining = studentTotalFee - studentTotalPaid;
      
      return {
        ...student,
        totalFee: studentTotalFee,
        totalPaid: studentTotalPaid,
        remaining: remaining,
        className: classes.find(c => c.id === student.class_id)?.name || 'Unknown',
        sectionName: sections.find(s => s.id === student.section_id)?.name || ''
      };
    }).filter(s => s.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 10);

    // Recent payments
    const recentPaymentsData = payments
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
      const classPayments = payments.filter(pay =>
        classInvoices.some(inv => inv.id === pay.invoice_id)
      );
      
      const classTotalFee = classInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      const classTotalPaid = classPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
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

    // Monthly trends (only months with records)
    const monthlyTrends: Array<{
      month: string;
      amount: number;
      count: number;
    }> = [];
    
    // Get all unique months from payments
    const monthMap: { [key: string]: { amount: number; count: number } } = {};
    
    allPayments.forEach(pay => {
      const payDate = new Date(pay.payment_date);
      const monthKey = `${payDate.getFullYear()}-${payDate.getMonth()}`;
      const monthLabel = payDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { amount: 0, count: 0 };
      }
      
      monthMap[monthKey].amount += Number(pay.amount || 0);
      monthMap[monthKey].count += 1;
    });
    
    // Convert to array and sort by date (most recent first)
    Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
      .slice(0, 12) // Show last 12 months with data
      .forEach(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month), 1);
        monthlyTrends.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          amount: data.amount,
          count: data.count
        });
      });

    // Yearly comparison (only years with records)
    const yearlyComparison: Array<{
      year: string;
      amount: number;
      count: number;
      avgPayment: number;
    }> = [];
    const availableYears: string[] = [];
    
    // Get all unique years from payments
    const yearMap: { [key: string]: { amount: number; count: number } } = {};
    
    allPayments.forEach(pay => {
      const payDate = new Date(pay.payment_date);
      const year = payDate.getFullYear().toString();
      
      if (!yearMap[year]) {
        yearMap[year] = { amount: 0, count: 0 };
      }
      
      yearMap[year].amount += Number(pay.amount || 0);
      yearMap[year].count += 1;
    });
    
    // Convert to array and sort by year (most recent first)
    Object.entries(yearMap)
      .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Sort by year descending
      .forEach(([year, data]) => {
        yearlyComparison.push({
          year: year,
          amount: data.amount,
          count: data.count,
          avgPayment: data.count > 0 ? data.amount / data.count : 0
        });
        
        availableYears.push(year);
      });
    
    // If "all" is selected, add a total row
    if (selectedYear === 'all') {
      const totalAmount = yearlyComparison.reduce((sum, year) => sum + year.amount, 0);
      const totalCount = yearlyComparison.reduce((sum, year) => sum + year.count, 0);
      
      yearlyComparison.unshift({
        year: 'All Years',
        amount: totalAmount,
        count: totalCount,
        avgPayment: totalCount > 0 ? totalAmount / totalCount : 0
      });
    }

    // Monthly comparison (only months with records)
    const monthlyComparison: Array<{
      month: string;
      currentYear: number;
      previousYear: number;
      growth: number;
      currentCount: number;
      previousCount: number;
    }> = [];
    
    if (selectedYear !== 'all') {
      // Get all unique month-year combinations from payments
      const monthYearMap: { [key: string]: { currentYear: number; previousYear: number; currentCount: number; previousCount: number } } = {};
      
      allPayments.forEach(pay => {
        const payDate = new Date(pay.payment_date);
        const year = payDate.getFullYear();
        const month = payDate.getMonth();
        const monthKey = `${month}`;
        
        if (!monthYearMap[monthKey]) {
          monthYearMap[monthKey] = { currentYear: 0, previousYear: 0, currentCount: 0, previousCount: 0 };
        }
        
        if (year === new Date().getFullYear()) {
          monthYearMap[monthKey].currentYear += Number(pay.amount || 0);
          monthYearMap[monthKey].currentCount += 1;
        } else if (year === new Date().getFullYear() - 1) {
          monthYearMap[monthKey].previousYear += Number(pay.amount || 0);
          monthYearMap[monthKey].previousCount += 1;
        }
      });
      
      // Convert to array and only include months with data
      Object.entries(monthYearMap)
        .filter(([_, data]) => data.currentYear > 0 || data.previousYear > 0) // Only months with data
        .sort(([a], [b]) => parseInt(a) - parseInt(b)) // Sort by month
        .forEach(([monthKey, data]) => {
          const month = parseInt(monthKey);
          const growth = data.previousYear > 0 ? ((data.currentYear - data.previousYear) / data.previousYear) * 100 : 0;
          
          const currentYearShort = new Date().getFullYear().toString().slice(-2);
          
          monthlyComparison.push({
            month: new Date(2024, month, 1).toLocaleDateString('en-US', { month: 'short' }) + ` '${currentYearShort}`,
            currentYear: data.currentYear,
            previousYear: data.previousYear,
            growth: growth,
            currentCount: data.currentCount,
            previousCount: data.previousCount
          });
        });
    } else {
      // For "all" selection, show all months with data across all years
      const allMonthMap: { [key: string]: { amount: number; count: number } } = {};
      
      allPayments.forEach(pay => {
        const payDate = new Date(pay.payment_date);
        const monthKey = `${payDate.getMonth()}`;
        
        if (!allMonthMap[monthKey]) {
          allMonthMap[monthKey] = { amount: 0, count: 0 };
        }
        
        allMonthMap[monthKey].amount += Number(pay.amount || 0);
        allMonthMap[monthKey].count += 1;
      });
      
      // Convert to array and sort by month
      Object.entries(allMonthMap)
        .sort(([a], [b]) => parseInt(a) - parseInt(b)) // Sort by month
        .forEach(([monthKey, data]) => {
          const month = parseInt(monthKey);
          
          monthlyComparison.push({
            month: new Date(2024, month, 1).toLocaleDateString('en-US', { month: 'short' }),
            currentYear: data.amount,
            previousYear: 0, // Not applicable for all-time view
            growth: 0, // Not applicable for all-time view
            currentCount: data.count,
            previousCount: 0 // Not applicable for all-time view
          });
        });
    }

    // Payment method statistics
    const paymentMethodStats: Array<{
      method: string;
      amount: number;
      count: number;
      percentage: number;
    }> = [];
    const methodCounts: { [key: string]: { amount: number; count: number } } = {};
    
    allPayments.forEach(pay => {
      const method = pay.payment_mode || 'Unknown';
      if (!methodCounts[method]) {
        methodCounts[method] = { amount: 0, count: 0 };
      }
      methodCounts[method].amount += Number(pay.amount || 0);
      methodCounts[method].count += 1;
    });
    
    Object.entries(methodCounts).forEach(([method, data]) => {
      paymentMethodStats.push({
        method: method,
        amount: data.amount,
        count: data.count,
        percentage: allPayments.length > 0 ? (data.count / allPayments.length) * 100 : 0
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
      totalPayments: payments.length,
      topDefaulters: studentRemainingFees,
      recentPayments: recentPaymentsData,
      classWiseData,
      monthlyTrends,
      yearlyComparison,
      monthlyComparison,
      paymentMethodStats,
      availableYears
    };
  };

  // Load data on component mount and year change
  useEffect(() => {
    loadAnalyticsData();
  }, [selectedYear, user?.school_id]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value % 1 === 0) {
      return String(value);
    }
    return value.toFixed(2);
  };


  // Handle refresh
  const handleRefresh = () => {
    loadAnalyticsData();
  };

  if (loading) {
    return (
      <AnalyticsContainer className={className}>
        <LoadingContainer>
          <CircularProgress style={{ marginRight: '1rem' }} />
          Loading analytics data...
        </LoadingContainer>
      </AnalyticsContainer>
    );
  }

  if (error) {
    return (
      <AnalyticsContainer className={className}>
        <ErrorContainer>
          <Warning style={{ marginRight: '0.5rem' }} />
          {error}
        </ErrorContainer>
      </AnalyticsContainer>
    );
  }

  if (!analyticsData) {
    return (
      <AnalyticsContainer className={className}>
        <EmptyState>
          <Assessment style={{ fontSize: '3rem', marginBottom: '1rem', color: (theme as any).TEXT_SECONDARY }} />
          No analytics data available
        </EmptyState>
      </AnalyticsContainer>
    );
  }

  return (
    <AnalyticsContainer className={className}>
      {/* Header */}
      <Header>
        <Title>
          <Assessment style={{ color: (theme as any).ACCENT }} />
          Fee Analytics Dashboard
        </Title>
        <Controls>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <MenuItem value="all">All Years</MenuItem>
              {availableYears.length === 0 ? (
                <MenuItem disabled>No data available</MenuItem>
              ) : (
                availableYears.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <RefreshButton
            variant="outlined"
            onClick={handleRefresh}
            startIcon={<Refresh />}
            disabled={loading}
          >
            Refresh
          </RefreshButton>
        </Controls>
      </Header>

      {/* Key Metrics */}
      <MetricsGrid>
        <MetricCard>
          <MetricIcon $color="#22c55e">
            <MonetizationOn />
          </MetricIcon>
          <MetricContent>
            <MetricValue>Rs. {formatCurrency(analyticsData.totalPaidAmount)}</MetricValue>
            <MetricLabel>Total Collected</MetricLabel>
            <MetricChange $positive={true}>
              <TrendingUp style={{ fontSize: '1rem' }} />
              {analyticsData.collectionRate.toFixed(1)}% of total fees
            </MetricChange>
          </MetricContent>
        </MetricCard>

        <MetricCard>
          <MetricIcon $color="#ef4444">
            <Warning />
          </MetricIcon>
          <MetricContent>
            <MetricValue>Rs. {formatCurrency(analyticsData.totalRemaining)}</MetricValue>
            <MetricLabel>Outstanding Amount</MetricLabel>
            <MetricChange $positive={false}>
              <TrendingDown style={{ fontSize: '1rem' }} />
              {(100 - analyticsData.collectionRate).toFixed(1)}% pending
            </MetricChange>
          </MetricContent>
        </MetricCard>

        <MetricCard>
          <MetricIcon $color="#3b82f6">
            <People />
          </MetricIcon>
          <MetricContent>
            <MetricValue>{analyticsData.totalStudents}</MetricValue>
            <MetricLabel>Total Students</MetricLabel>
            <MetricChange $positive={true}>
              <CheckCircle style={{ fontSize: '1rem' }} />
              {analyticsData.totalInvoices} invoices
            </MetricChange>
          </MetricContent>
        </MetricCard>

        <MetricCard>
          <MetricIcon $color="#8b5cf6">
            <Payment />
          </MetricIcon>
          <MetricContent>
            <MetricValue>{analyticsData.totalPayments}</MetricValue>
            <MetricLabel>Total Payments</MetricLabel>
            <MetricChange $positive={true}>
              <TrendingUp style={{ fontSize: '1rem' }} />
              Avg: Rs. {formatCurrency(analyticsData.totalPayments > 0 ? analyticsData.totalPaidAmount / analyticsData.totalPayments : 0)}
            </MetricChange>
          </MetricContent>
        </MetricCard>
      </MetricsGrid>

      {/* Charts and Tables */}
      <ChartsGrid>
        {/* Monthly Trends */}
        <ChartCard>
          <ChartHeader>
            <ChartTitle>
              <BarChart style={{ color: (theme as any).ACCENT }} />
              Monthly Collection Trends
            </ChartTitle>
          </ChartHeader>
          <div style={{ height: '200px', display: 'flex', alignItems: 'end', gap: '0.5rem', padding: '1rem 0' }}>
            {monthlyTrends.map((trend, index) => (
              <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max((trend.amount / Math.max(...monthlyTrends.map(t => t.amount))) * 150, 10)}px`,
                    background: 'linear-gradient(to top, #3b82f6, #60a5fa)',
                    borderRadius: '4px 4px 0 0',
                    marginBottom: '0.5rem',
                    minHeight: '10px'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY, textAlign: 'center' }}>
                  {trend.month}
                </div>
                <div style={{ fontSize: '0.7rem', color: (theme as any).TEXT_PRIMARY, fontWeight: '600' }}>
                  Rs. {formatCurrency(trend.amount)}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Collection Rate by Class */}
        <ChartCard>
          <ChartHeader>
            <ChartTitle>
              <PieChart style={{ color: (theme as any).ACCENT }} />
              Collection Rate by Class
            </ChartTitle>
          </ChartHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {classWiseData.slice(0, 5).map((classData, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: (theme as any).TEXT_PRIMARY }}>
                    {classData.className}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY }}>
                    {classData.collectionRate.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar>
                  <ProgressFill 
                    $percentage={classData.collectionRate} 
                    $color={classData.collectionRate >= 80 ? '#22c55e' : classData.collectionRate >= 60 ? '#f59e0b' : '#ef4444'}
                  />
                </ProgressBar>
                <div style={{ fontSize: '0.7rem', color: (theme as any).TEXT_SECONDARY, marginTop: '0.25rem' }}>
                  Rs. {formatCurrency(classData.totalPaid)} / Rs. {formatCurrency(classData.totalFee)}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </ChartsGrid>

      {/* Enhanced Analytics Grid */}
      <ChartsGrid>
        {/* Yearly Comparison */}
        <ChartCard>
          <ChartHeader>
            <ChartTitle>
              <BarChart style={{ color: (theme as any).ACCENT }} />
              Yearly Collection Comparison
            </ChartTitle>
          </ChartHeader>
          <div style={{ height: '200px', display: 'flex', alignItems: 'end', gap: '0.5rem', padding: '1rem 0' }}>
            {yearlyComparison.length === 0 ? (
              <div style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: (theme as any).TEXT_SECONDARY,
                fontSize: '0.9rem'
              }}>
                No yearly data available
              </div>
            ) : (
              yearlyComparison.map((year, index) => (
              <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max((year.amount / Math.max(...yearlyComparison.map(y => y.amount))) * 150, 10)}px`,
                    background: year.year === new Date().getFullYear().toString() 
                      ? 'linear-gradient(to top, #059669, #10b981)' 
                      : 'linear-gradient(to top, #6b7280, #9ca3af)',
                    borderRadius: '4px 4px 0 0',
                    marginBottom: '0.5rem',
                    minHeight: '10px'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY, textAlign: 'center' }}>
                  {year.year}
                </div>
                <div style={{ fontSize: '0.7rem', color: (theme as any).TEXT_PRIMARY, fontWeight: '600' }}>
                  Rs. {formatCurrency(year.amount)}
                </div>
                <div style={{ fontSize: '0.65rem', color: (theme as any).TEXT_SECONDARY }}>
                  {year.count} payments
                </div>
              </div>
              ))
            )}
          </div>
        </ChartCard>

        {/* Monthly Comparison */}
        <ChartCard>
          <ChartHeader>
            <ChartTitle>
              <TrendingUp style={{ color: (theme as any).ACCENT }} />
              Monthly Growth Comparison
            </ChartTitle>
            {selectedYear !== 'all' && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '8px', background: '#6b7280', borderRadius: '2px' }}></div>
                  <span style={{ color: (theme as any).TEXT_SECONDARY }}>{(new Date().getFullYear() - 1).toString().slice(-2)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '8px', background: '#22c55e', borderRadius: '2px' }}></div>
                  <span style={{ color: (theme as any).TEXT_SECONDARY }}>{new Date().getFullYear().toString().slice(-2)}</span>
                </div>
              </div>
            )}
          </ChartHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
            {monthlyComparison.length === 0 ? (
              <div style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: (theme as any).TEXT_SECONDARY,
                fontSize: '0.9rem',
                padding: '2rem 0'
              }}>
                No monthly comparison data available
              </div>
            ) : (
              monthlyComparison.slice(0, 6).map((month, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ minWidth: '50px', fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY }}>
                  {month.month}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {selectedYear === 'all' ? (
                    // Single bar for all-time view
                    <div style={{ 
                      width: '100px', 
                      height: '8px', 
                      background: '#e5e7eb', 
                      borderRadius: '4px',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${Math.min((month.currentYear / Math.max(...monthlyComparison.map(m => m.currentYear))) * 100, 100)}%`,
                        height: '100%',
                        background: '#3b82f6',
                        borderRadius: '4px'
                      }} />
                    </div>
                  ) : (
                    // Two bars for year comparison
                    <>
                      <div style={{ 
                        width: '50px', 
                        height: '8px', 
                        background: '#e5e7eb', 
                        borderRadius: '4px',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${Math.min((month.previousYear / Math.max(...monthlyComparison.map(m => m.previousYear))) * 100, 100)}%`,
                          height: '100%',
                          background: '#6b7280',
                          borderRadius: '4px'
                        }} />
                      </div>
                      <div style={{ 
                        width: '50px', 
                        height: '8px', 
                        background: '#e5e7eb', 
                        borderRadius: '4px',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${Math.min((month.currentYear / Math.max(...monthlyComparison.map(m => m.currentYear))) * 100, 100)}%`,
                          height: '100%',
                          background: month.growth >= 0 ? '#22c55e' : '#ef4444',
                          borderRadius: '4px'
                        }} />
                      </div>
                    </>
                  )}
                </div>
                <div style={{ minWidth: '70px', fontSize: '0.7rem', textAlign: 'right' }}>
                  <div style={{ color: (theme as any).TEXT_PRIMARY, fontWeight: '600' }}>
                    Rs. {formatCurrency(month.currentYear)}
                  </div>
                  {selectedYear !== 'all' && (
                    <div style={{ 
                      color: month.growth >= 0 ? '#22c55e' : '#ef4444',
                      fontSize: '0.65rem'
                    }}>
                      {month.growth >= 0 ? '+' : ''}{month.growth.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
              ))
            )}
          </div>
        </ChartCard>
      </ChartsGrid>

      {/* Payment Methods Analysis */}
      <ChartCard style={{ marginBottom: '2rem' }}>
        <ChartHeader>
          <ChartTitle>
            <PieChart style={{ color: (theme as any).ACCENT }} />
            Payment Methods Analysis
          </ChartTitle>
        </ChartHeader>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {paymentMethodStats.length === 0 ? (
            <div style={{ 
              gridColumn: '1 / -1',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: (theme as any).TEXT_SECONDARY,
              fontSize: '0.9rem',
              padding: '2rem 0'
            }}>
              No payment method data available
            </div>
          ) : (
            paymentMethodStats.map((method, index) => (
            <div key={index} style={{ 
              padding: '1rem', 
              border: `1px solid ${(theme as any).BORDER}`, 
              borderRadius: '8px',
              background: (theme as any).FIELD_BG
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: (theme as any).TEXT_PRIMARY }}>
                  {method.method}
                </span>
                <span style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY }}>
                  {method.percentage.toFixed(1)}%
                </span>
              </div>
              <ProgressBar>
                <ProgressFill 
                  $percentage={method.percentage} 
                  $color={['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'][index % 5]}
                />
              </ProgressBar>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: (theme as any).TEXT_SECONDARY }}>
                  {method.count} payments
                </div>
                <div style={{ fontSize: '0.7rem', color: (theme as any).TEXT_PRIMARY, fontWeight: '600' }}>
                  Rs. {formatCurrency(method.amount)}
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </ChartCard>

      {/* Tables */}
      <TablesGrid>
        {/* Top Defaulters */}
        <TableCard>
          <TableHeader>
            <TableTitle>
              <Warning style={{ color: (theme as any).ACCENT }} />
              Top Fee Defaulters
            </TableTitle>
          </TableHeader>
          {topDefaulters.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Student</TableHeaderCell>
                  <TableHeaderCell>Class</TableHeaderCell>
                  <TableHeaderCell>Outstanding</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {topDefaulters.map((defaulter, index) => (
                  <TableRow key={defaulter.id}>
                    <TableCell>
                      <div style={{ fontWeight: '600' }}>{defaulter.name}</div>
                      <div style={{ fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY }}>
                        ID: {getStudentDisplayId(defaulter)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {defaulter.className} {defaulter.sectionName}
                    </TableCell>
                    <TableCell style={{ fontWeight: '600', color: '#ef4444' }}>
                      Rs. {formatCurrency(defaulter.remaining)}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState>
              <CheckCircle style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#22c55e' }} />
              No fee defaulters found
            </EmptyState>
          )}
        </TableCard>

        {/* Recent Payments */}
        <TableCard>
          <TableHeader>
            <TableTitle>
              <Receipt style={{ color: (theme as any).ACCENT }} />
              Recent Payments
            </TableTitle>
          </TableHeader>
          {recentPayments.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Student</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {recentPayments.map((payment, index) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div style={{ fontWeight: '600' }}>{payment.studentName}</div>
                      <div style={{ fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY }}>
                        {payment.className}
                      </div>
                    </TableCell>
                    <TableCell style={{ fontWeight: '600', color: '#22c55e' }}>
                      Rs. {formatCurrency(Number(payment.amount))}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString('en-US', { 
                        day: '2-digit', 
                        month: 'short' 
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState>
              <Payment style={{ fontSize: '2rem', marginBottom: '0.5rem', color: (theme as any).TEXT_SECONDARY }} />
              No recent payments found
            </EmptyState>
          )}
        </TableCard>
      </TablesGrid>

      {/* Last Updated */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '2rem', 
        padding: '1rem', 
        color: (theme as any).TEXT_SECONDARY,
        fontSize: '0.8rem'
      }}>
        Last updated: {lastUpdated.toLocaleString()}
      </div>
    </AnalyticsContainer>
  );
};

export default FeeAnalytics;
