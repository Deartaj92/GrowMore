import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollSummary, PayrollAnalytics } from '../../../../types/payroll';
import {
  Box,
  Select,
  MenuItem,
  FormControl as MuiFormControl,
  InputLabel,
  Button,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  Pending as PendingIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Loader from '../../../../components/Loader';
import {
  StatsGrid,
  StatCard,
  StatCardHeader,
  StatCardIcon,
  StatCardTitle,
  StatCardValue,
  StatCardSubtext,
  ContentCard,
  TwoColumnGrid,
  TableWrapper,
  TableHeader,
  TableTitle,
  StyledTable,
} from '../../styles';

const ChartCard = styled(ContentCard)`
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 0.375rem;
  }
`;

const ChartTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  @media (max-width: 768px) {
    font-size: 0.8125rem;
    margin-bottom: 10px;
  }
  
  svg {
    font-size: 1.125rem;
    
    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }
`;


const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

const PayrollAnalyticsDashboard: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [analytics, setAnalytics] = useState<PayrollAnalytics | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (user?.school_id) {
      loadData();
    }
  }, [user?.school_id, selectedYear]);

  const loadData = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const [summaryData, analyticsData] = await Promise.all([
        payrollService.getPayrollSummary(user.school_id),
        payrollService.getPayrollAnalytics(user.school_id, selectedYear - 1, selectedYear),
      ]);
      setSummary(summaryData);
      setAnalytics(analyticsData);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      showToast('Failed to load payroll analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <>
      {/* Header matching Generate Payroll tab style */}
      <ContentCard style={{ padding: '0.75rem 1rem', marginBottom: '0.375rem' }}>
        <Box display="flex" gap={1} alignItems="flex-end" flexWrap="wrap" justifyContent="space-between" sx={{ 
          '@media (max-width: 768px)': { 
            gap: 0.75,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'stretch',
          } 
        }}>
          <Box display="flex" gap={1} alignItems="flex-end" flexWrap="wrap" sx={{ 
            '@media (max-width: 768px)': { 
              width: '100%',
              flexDirection: 'column',
              alignItems: 'stretch',
            } 
          }}>
            <MuiFormControl size="small" sx={{ minWidth: { xs: '100%', sm: 90 } }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as number)}
                label="Year"
                sx={{ fontSize: '0.75rem', height: '30px' }}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year} sx={{ fontSize: '0.75rem' }}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </MuiFormControl>
          </Box>

          <Box display="flex" gap={0.75} alignItems="flex-end" sx={{ 
            '@media (max-width: 768px)': { 
              width: '100%',
              flexDirection: 'column',
              alignItems: 'stretch',
            } 
          }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              onClick={() => loadData()}
              disabled={loading}
              sx={{ 
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </ContentCard>

      {/* Summary Cards */}
      <StatsGrid>
        <StatCard accentColor="#3b82f6">
          <StatCardHeader>
            <StatCardTitle>Total Payroll</StatCardTitle>
            <StatCardIcon color="#3b82f6">
              <AccountBalanceIcon />
            </StatCardIcon>
          </StatCardHeader>
          <StatCardValue>{formatCurrency(summary?.totalPayroll || 0)}</StatCardValue>
          <StatCardSubtext>All time payroll cost</StatCardSubtext>
        </StatCard>

        <StatCard accentColor="#10b981">
          <StatCardHeader>
            <StatCardTitle>Total Paid</StatCardTitle>
            <StatCardIcon color="#10b981">
              <PaymentIcon />
            </StatCardIcon>
          </StatCardHeader>
          <StatCardValue>{formatCurrency(summary?.totalPaid || 0)}</StatCardValue>
          <StatCardSubtext>{summary?.paidCount || 0} payments completed</StatCardSubtext>
        </StatCard>

        <StatCard accentColor="#f59e0b">
          <StatCardHeader>
            <StatCardTitle>Pending Payments</StatCardTitle>
            <StatCardIcon color="#f59e0b">
              <PendingIcon />
            </StatCardIcon>
          </StatCardHeader>
          <StatCardValue>{formatCurrency(summary?.totalPending || 0)}</StatCardValue>
          <StatCardSubtext>{summary?.pendingCount || 0} payments pending</StatCardSubtext>
        </StatCard>

        <StatCard accentColor="#8b5cf6">
          <StatCardHeader>
            <StatCardTitle>Employees</StatCardTitle>
            <StatCardIcon color="#8b5cf6">
              <PeopleIcon />
            </StatCardIcon>
          </StatCardHeader>
          <StatCardValue>{summary?.employeeCount || 0}</StatCardValue>
          <StatCardSubtext>Total employees in payroll</StatCardSubtext>
        </StatCard>
      </StatsGrid>

      {/* Monthly Trends Chart */}
      {analytics && analytics.monthlyTotal.length > 0 && (
        <ChartCard>
          <ChartTitle>
            <TrendingUpIcon />
            Monthly Payroll Trends
          </ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthlyTotal}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.BORDER} />
                <XAxis 
                  dataKey="month" 
                  stroke={theme.TEXT_SECONDARY}
                  style={{ fontSize: '0.75rem' }}
                />
                <YAxis 
                  stroke={theme.TEXT_SECONDARY}
                  style={{ fontSize: '0.75rem' }}
                  tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.CARD,
                    border: `1px solid ${theme.BORDER}`,
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Total"
                />
                <Line 
                  type="monotone" 
                  dataKey="paid" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Paid"
                />
                <Line 
                  type="monotone" 
                  dataKey="pending" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Pending"
                />
              </LineChart>
            </ResponsiveContainer>
        </ChartCard>
      )}

      <TwoColumnGrid $columns={2}>
        {/* Role-wise Distribution */}
        {analytics && analytics.roleWiseDistribution.length > 0 && (
          <ChartCard>
            <ChartTitle>
              <BarChartIcon />
              Role-wise Distribution
            </ChartTitle>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.roleWiseDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.BORDER} />
                    <XAxis 
                      dataKey="role" 
                      stroke={theme.TEXT_SECONDARY}
                      style={{ fontSize: '0.75rem' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke={theme.TEXT_SECONDARY}
                      style={{ fontSize: '0.75rem' }}
                      tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.CARD,
                        border: `1px solid ${theme.BORDER}`,
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                      }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Payment Status Summary */}
        {analytics && analytics.paymentStatusSummary.length > 0 && (
          <ChartCard>
            <ChartTitle>
              <PieChartIcon />
              Payment Status Summary
            </ChartTitle>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.paymentStatusSummary}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {analytics.paymentStatusSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.CARD,
                        border: `1px solid ${theme.BORDER}`,
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                      }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
          </ChartCard>
        )}
      </TwoColumnGrid>

      <TwoColumnGrid $columns={2}>
        {/* Top Earners */}
        {analytics && analytics.topEarners.length > 0 && (
          <ChartCard>
            <ChartTitle>
              <TrendingUpIcon />
              Top 10 Earners (Last 12 Months)
            </ChartTitle>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <StyledTable>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Employee</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topEarners.map((earner, index) => (
                    <tr key={earner.staffId}>
                      <td>{index + 1}</td>
                      <td>{earner.staffName}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(earner.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>
            </div>
          </ChartCard>
        )}

        {/* Deduction Analysis */}
        {analytics && analytics.deductionAnalysis.length > 0 && (
          <ChartCard>
            <ChartTitle>
              <BarChartIcon />
              Top Deductions
            </ChartTitle>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <StyledTable>
                <thead>
                  <tr>
                    <th>Deduction Type</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.deductionAnalysis.map((deduction) => (
                    <tr key={deduction.itemName}>
                      <td>{deduction.itemName}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(deduction.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>
            </div>
          </ChartCard>
        )}
      </TwoColumnGrid>
    </>
  );
};

export default PayrollAnalyticsDashboard;
