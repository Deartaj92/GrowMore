import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { expenseService } from '../services/expenseService';
import { ExpenseSummary } from '../types/expense';
import { 
  Assessment,
  TrendingUp, 
  TrendingDown, 
  AccountBalance, 
  Category as CategoryIcon,
  Payment,
  Warning,
  CheckCircle,
  Refresh as RefreshIcon,
  BarChart,
  PieChart as PieChartIcon,
  Receipt,
  CalendarToday,
  AttachMoney,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import { useLoading } from '../contexts/LoadingContext';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, Legend } from 'recharts';
import Loader from './Loader';

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
    flex-wrap: wrap;
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

const DateFilterContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
`;

const DateInput = styled.input`
  padding: 0.5rem;
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
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
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatIcon = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $color }) => $color ? `${$color}20` : 'rgba(59, 130, 246, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color || '#3b82f6'};
`;

const ContentCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ChartSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const ChartCard = styled.div`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.5)'};
  border-radius: 12px;
  padding: 1rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  min-height: 250px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ChartTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChartContainer = styled.div`
  flex: 1;
  min-height: 250px;
  height: 250px;
  position: relative;
`;

const CategoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CategoryItem = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.5)'};
  border-radius: 8px;
  border-left: 4px solid ${({ $color }) => $color || '#3b82f6'};
`;

const CategoryName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CategoryAmount = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 1.1rem;
`;

const StatusList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
`;

const StatusItem = styled.div<{ $color?: string }>`
  padding: 1rem;
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.5)'};
  border-radius: 8px;
  text-align: center;
  border: 2px solid ${({ $color }) => $color ? `${$color}40` : 'transparent'};
`;

const StatusLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  font-weight: 600;
`;

const StatusValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const StatusCount = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.25rem;
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

// ===== MAIN COMPONENT =====

interface ExpenseAnalyticsProps {
  className?: string;
}

const ExpenseAnalytics: React.FC<ExpenseAnalyticsProps> = ({ className }) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { setLoading } = useLoading();
  const { showToast } = useToast();
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const categoryLegendScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position
  const checkScrollPosition = useCallback(() => {
    if (categoryLegendScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryLegendScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  // Scroll handlers
  const scrollLeft = () => {
    if (categoryLegendScrollRef.current) {
      categoryLegendScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (categoryLegendScrollRef.current) {
      categoryLegendScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Helper functions
  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!user?.school_id) return;
    
    try {
      setIsLoadingData(true);
      setLoading(true);
      const data = await expenseService.getExpenseSummary(user.school_id, startDate, endDate);
      setSummary(data);
    } catch (error: any) {
      showToast('Error loading expense analytics: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsLoadingData(false);
      setLoading(false);
    }
  }, [user?.school_id, startDate, endDate, setLoading, showToast]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const analyticsData = useMemo(() => {
    if (!summary) return null;

    // Calculate additional metrics
    const totalExpenses = summary.totalExpenses;
    const totalCount = summary.totalByStatus.reduce((sum, s) => sum + s.count, 0);
    const averageExpense = totalCount > 0 ? totalExpenses / totalCount : 0;
    const approvedTotal = summary.totalByStatus.find(s => s.status === 'approved')?.total || 0;
    const pendingTotal = summary.totalByStatus.find(s => s.status === 'pending')?.total || 0;
    const paidTotal = summary.totalByStatus.find(s => s.status === 'paid')?.total || 0;

    // Get all categories with expenses > 0
    const topCategories = [...summary.totalByCategory]
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    // Format monthly data for chart
    // Generate all months in the date range for better visualization
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthlyMap = new Map<string, number>();
    
    // Initialize all months in range with 0
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    
    while (current <= endMonth) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthKey, 0);
      current.setMonth(current.getMonth() + 1);
    }
    
    // Fill in actual data
    summary.monthlyTotal.forEach(item => {
      monthlyMap.set(item.month, item.total);
    });
    
    // Convert to array and format
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrends = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, total]) => {
        const [year, month] = monthKey.split('-');
        return {
          month: `${monthNames[parseInt(month) - 1]} ${year.slice(-2)}`,
          amount: total,
          fullMonth: monthKey
        };
      });

    return {
      totalExpenses,
      totalCount,
      averageExpense,
      approvedTotal,
      pendingTotal,
      paidTotal,
      topCategories,
      monthlyTrends,
      byStatus: summary.totalByStatus,
      byPaymentMethod: summary.totalByPaymentMethod,
      byCategory: summary.totalByCategory
    };
  }, [summary, startDate, endDate]);

  // Check scroll position on mount and when data changes
  useEffect(() => {
    checkScrollPosition();
    const timer = setTimeout(checkScrollPosition, 100);
    return () => clearTimeout(timer);
  }, [analyticsData?.topCategories, checkScrollPosition]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      case 'paid': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getPaymentMethodLabel = (method: string): string => {
    return method.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <PageContainer  className={className}>
      <Header >
        <HeaderTitle >
          <Assessment style={{ fontSize: 28 }} />
          Expense Analytics
        </HeaderTitle>
        <DateFilterContainer>
          <DateInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            theme={theme}
          />
          <span style={{ color: theme.TEXT_SECONDARY }}>to</span>
          <DateInput
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            theme={theme}
          />
          <RefreshButton
            
            onClick={fetchAnalyticsData}
            disabled={isLoadingData}
          >
            <RefreshIcon style={{ fontSize: 18 }} />
            Refresh
          </RefreshButton>
        </DateFilterContainer>
      </Header>

      {isLoadingData ? (
        <Loader />
      ) : !analyticsData ? (
        <ContentCard >
          <EmptyState >No expense data available for the selected period</EmptyState>
        </ContentCard>
      ) : (
        <>
          <StatsGrid>
            <StatCard >
              <StatLabel >Total Expenses</StatLabel>
              <StatValue >
                <StatIcon $color="#3b82f6">
                  <AttachMoney style={{ fontSize: 20 }} />
                </StatIcon>
                {formatCurrency(analyticsData.totalExpenses)}
              </StatValue>
            </StatCard>

            <StatCard >
              <StatLabel >Total Transactions</StatLabel>
              <StatValue >
                <StatIcon $color="#10b981">
                  <Receipt style={{ fontSize: 20 }} />
                </StatIcon>
                {analyticsData.totalCount}
              </StatValue>
            </StatCard>

            <StatCard >
              <StatLabel >Average Expense</StatLabel>
              <StatValue >
                <StatIcon $color="#f59e0b">
                  <BarChart style={{ fontSize: 20 }} />
                </StatIcon>
                {formatCurrency(analyticsData.averageExpense)}
              </StatValue>
            </StatCard>

            <StatCard >
              <StatLabel >Approved Expenses</StatLabel>
              <StatValue >
                <StatIcon $color="#10b981">
                  <CheckCircle style={{ fontSize: 20 }} />
                </StatIcon>
                {formatCurrency(analyticsData.approvedTotal)}
              </StatValue>
            </StatCard>

            <StatCard >
              <StatLabel >Pending Expenses</StatLabel>
              <StatValue >
                <StatIcon $color="#f59e0b">
                  <Warning style={{ fontSize: 20 }} />
                </StatIcon>
                {formatCurrency(analyticsData.pendingTotal)}
              </StatValue>
            </StatCard>

            <StatCard >
              <StatLabel >Paid Expenses</StatLabel>
              <StatValue >
                <StatIcon $color="#3b82f6">
                  <Payment style={{ fontSize: 20 }} />
                </StatIcon>
                {formatCurrency(analyticsData.paidTotal)}
              </StatValue>
            </StatCard>
          </StatsGrid>

          <ContentCard >
            <ChartSection>
              {/* Monthly Trends Chart */}
              <ChartCard >
                <ChartTitle >
                  <TrendingUp style={{ fontSize: 20 }} />
                  Monthly Expense Trends
                </ChartTitle>
                <ChartContainer>
                  {analyticsData.monthlyTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analyticsData.monthlyTrends}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
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
                          tickFormatter={(value) => {
                            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                            return value.toFixed(0);
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme.CARD,
                            border: `1px solid ${theme.BORDER}`,
                            borderRadius: '8px',
                            color: theme.TEXT_PRIMARY
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ color: theme.TEXT_SECONDARY }}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fill="url(#colorExpense)"
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState >No monthly data available</EmptyState>
                  )}
                </ChartContainer>
              </ChartCard>

              {/* Top Categories */}
              <ChartCard >
                <ChartTitle >
                  <CategoryIcon style={{ fontSize: 20 }} />
                  Top Expense Categories
                </ChartTitle>
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  minHeight: '250px',
                  height: '250px'
                }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {analyticsData.topCategories.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.topCategories.map((category) => ({
                              name: category.categoryName,
                              value: category.total,
                              color: category.color
                            }))}
                            cx="50%"
                            cy="50%"
                            label={false}
                            outerRadius={80}
                            innerRadius={0}
                            dataKey="value"
                          >
                            {analyticsData.topCategories.map((category, index) => {
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
                                  fill={category.color || colors[index % colors.length]}
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
                              
                              const category = analyticsData.topCategories.find(c => c.categoryName === data.name);
                              const percentage = analyticsData.totalExpenses > 0 
                                ? ((data.value / analyticsData.totalExpenses) * 100).toFixed(1)
                                : '0.0';
                              
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
                                      <span style={{ color: isDark(theme) ? '#94a3b8' : '#64748b' }}>Amount: </span>
                                      <span style={{ fontWeight: 600 }}>
                                        {formatCurrency(data.value)} ({percentage}%)
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
                    ) : (
                      <EmptyState >No category data available</EmptyState>
                    )}
                  </div>
                  {analyticsData.topCategories.length > 0 && (
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
                        ref={categoryLegendScrollRef}
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
                        {analyticsData.topCategories.map((category, index) => {
                          const totalExpenses = analyticsData.totalExpenses;
                          const percentage = totalExpenses > 0 
                            ? ((category.total / totalExpenses) * 100).toFixed(1)
                            : '0.0';
                          return (
                            <div key={category.categoryId} style={{
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
                                backgroundColor: category.color
                              }} />
                              <span>{category.categoryName} ({percentage}%)</span>
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
                  )}
                </div>
              </ChartCard>
            </ChartSection>

            {/* Status Breakdown */}
            <div>
              <ChartTitle  style={{ marginBottom: '1rem' }}>
                <PieChart style={{ fontSize: 20 }} />
                Expense Status Breakdown
              </ChartTitle>
              <StatusList>
                {analyticsData.byStatus.map((status) => (
                  <StatusItem
                    key={status.status}
                    $color={getStatusColor(status.status)}
                    
                  >
                    <StatusLabel >
                      {getStatusLabel(status.status)}
                    </StatusLabel>
                    <StatusValue >
                      {formatCurrency(status.total)}
                    </StatusValue>
                    <StatusCount >
                      {status.count} {status.count === 1 ? 'expense' : 'expenses'}
                    </StatusCount>
                  </StatusItem>
                ))}
              </StatusList>
            </div>

            {/* Payment Method Breakdown */}
            <div>
              <ChartTitle  style={{ marginBottom: '1rem' }}>
                <Payment style={{ fontSize: 20 }} />
                Payment Method Breakdown
              </ChartTitle>
              <StatusList>
                {analyticsData.byPaymentMethod.map((method) => (
                  <StatusItem
                    key={method.method}
                    $color="#8b5cf6"
                    
                  >
                    <StatusLabel >
                      {getPaymentMethodLabel(method.method)}
                    </StatusLabel>
                    <StatusValue >
                      {formatCurrency(method.total)}
                    </StatusValue>
                    <StatusCount >
                      {method.count} {method.count === 1 ? 'transaction' : 'transactions'}
                    </StatusCount>
                  </StatusItem>
                ))}
              </StatusList>
            </div>
          </ContentCard>
        </>
      )}
    </PageContainer>
  );
};

export default ExpenseAnalytics;

