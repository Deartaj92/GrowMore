import React from 'react';
import { useTheme } from 'styled-components';
import styled from 'styled-components';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import DottedLoader from '../shared/DottedLoader';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  AttachMoney as AttachMoneyIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  DashboardDateInput
} from '../../styles';
import { formatCurrency } from '../../utils/dashboardUtils';
import { AccountsData } from '../../services/accountsService';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525' || themeObj.BG === '#181c2a';

// ===== STYLED COMPONENTS (Matching FeeAnalytics structure) =====

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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

const Container = styled.div`
  display: contents;
`;

interface AccountsTabProps {
  accountsData: AccountsData;
  accountsLoading: boolean;
  accountsDateFrom: string;
  setAccountsDateFrom: (date: string) => void;
  accountsDateTo: string;
  setAccountsDateTo: (date: string) => void;
}

const AccountsTab: React.FC<AccountsTabProps> = ({
  accountsData,
  accountsLoading,
  accountsDateFrom,
  setAccountsDateFrom,
  accountsDateTo,
  setAccountsDateTo
}) => {
  const theme = useTheme() as any;
  const isDark = theme.BG === '#252525' || theme.BG === '#181c2a';

  const { summary, cashAccounts, incomeVsExpenses, monthlyData } = accountsData;

  // Prepare data for donut chart
  const donutChartData = [
    { name: 'Income', value: incomeVsExpenses.income, color: '#3b82f6' },
    { name: 'Expenses', value: incomeVsExpenses.expenses, color: '#22c55e' }
  ];

  const totalForDonut = incomeVsExpenses.income + incomeVsExpenses.expenses;
  const incomePercent = totalForDonut > 0 ? ((incomeVsExpenses.income / totalForDonut) * 100).toFixed(1) : '0';
  const expensesPercent = totalForDonut > 0 ? ((incomeVsExpenses.expenses / totalForDonut) * 100).toFixed(1) : '0';

  return (
    <Container>
      {/* Date Range Selector */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '0.25rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end'
      }}>
        <DashboardDateInput
          type="date"
          value={accountsDateFrom}
          onChange={(e) => {
            const newDate = e.target.value;
            setAccountsDateFrom(newDate);
          }}
          title="From Date"
        />
        <span style={{ color: isDark ? '#888' : '#666', fontWeight: 500 }}>to</span>
        <DashboardDateInput
          type="date"
          value={accountsDateTo}
          onChange={(e) => {
            const newDate = e.target.value;
            setAccountsDateTo(newDate);
          }}
          title="To Date"
        />
      </div>

      {/* Summary Cards */}
      <StatsGrid theme={theme}>
        <StatCard theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <StatLabel theme={theme}>Income</StatLabel>
            <TrendingUpIcon style={{ fontSize: '1.25rem', color: '#22c55e' }} />
          </div>
          <StatValue theme={theme} style={{ color: '#22c55e' }}>
            {accountsLoading ? <DottedLoader /> : formatCurrency(summary?.income || 0)}
          </StatValue>
        </StatCard>

        <StatCard theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <StatLabel theme={theme}>Expenses</StatLabel>
            <TrendingDownIcon style={{ fontSize: '1.25rem', color: '#eab308' }} />
          </div>
          <StatValue theme={theme} style={{ color: '#eab308' }}>
            {accountsLoading ? <DottedLoader /> : formatCurrency(summary?.expenses || 0)}
          </StatValue>
        </StatCard>

        <StatCard theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <StatLabel theme={theme}>Profit/Loss</StatLabel>
            <ShowChartIcon style={{ fontSize: '1.25rem', color: '#ec4899' }} />
          </div>
          <StatValue theme={theme} style={{ color: summary?.profitLoss >= 0 ? '#22c55e' : '#ef4444' }}>
            {accountsLoading ? <DottedLoader /> : formatCurrency(summary?.profitLoss || 0)}
          </StatValue>
        </StatCard>

        <StatCard theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <StatLabel theme={theme}>Cash</StatLabel>
            <TrendingUpIcon style={{ fontSize: '1.25rem', color: summary?.cash >= 0 ? '#22c55e' : '#ef4444' }} />
          </div>
          <StatValue theme={theme} style={{ color: summary?.cash >= 0 ? '#22c55e' : '#ef4444' }}>
            {accountsLoading ? <DottedLoader /> : formatCurrency(summary?.cash || 0)}
          </StatValue>
        </StatCard>
      </StatsGrid>

      {/* Charts Section */}
      <ContentGrid theme={theme}>
        {/* Cash Accounts Bar Chart */}
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>Cash Accounts Ending Balance</CardTitle>
          {accountsLoading ? (
            <EmptyState theme={theme}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </EmptyState>
          ) : (!cashAccounts || cashAccounts.length === 0) ? (
            <EmptyState theme={theme}>
              No cash account data available
            </EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashAccounts} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#555' : '#d1d5db'}
                  opacity={0.8}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: isDark ? '#888' : '#666', fontSize: 11 }}
                  tickLine={{ stroke: isDark ? '#444' : '#ddd' }}
                />
                <YAxis
                  tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                  tickLine={{ stroke: isDark ? '#444' : '#ddd' }}
                  tickFormatter={(value) => {
                    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
                    return value.toString();
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: isDark ? '#e2e8f0' : '#1e293b'
                  }}
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(label) => label}
                />
                <Bar
                  dataKey="balance"
                  radius={[4, 4, 0, 0]}
                >
                  {cashAccounts.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.balance > 0
                          ? '#22c55e'
                          : entry.balance < 0
                          ? '#ef4444'
                          : '#94a3b8'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ContentCard>

        {/* Income vs Expenses Donut Chart */}
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>Income vs Expenses</CardTitle>
          {accountsLoading ? (
            <EmptyState theme={theme}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </EmptyState>
          ) : totalForDonut === 0 ? (
            <EmptyState theme={theme}>
              No financial data available
            </EmptyState>
          ) : (
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={donutChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={false}
                  >
                    {donutChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: isDark ? '#e2e8f0' : '#1e293b'
                    }}
                    formatter={(value: any, name: string) => [
                      `${formatCurrency(value)} (${name === 'Income' ? incomePercent : expensesPercent}%)`,
                      name
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value: string, entry: any) => (
                      <span style={{ color: isDark ? '#e2e8f0' : '#1e293b', fontSize: '0.875rem' }}>
                        {value}: {formatCurrency(entry.payload.value)}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                  {formatCurrency(totalForDonut)}
                </div>
                <div style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: '0.25rem' }}>
                  Total
                </div>
              </div>
            </div>
          )}
        </ContentCard>
      </ContentGrid>

      {/* Monthly Income & Expenses Chart */}
      <ContentCard theme={theme}>
        <CardTitle theme={theme}>Income & Expenses</CardTitle>
        {accountsLoading ? (
          <EmptyState theme={theme}>
            <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
          </EmptyState>
        ) : (!monthlyData || monthlyData.length === 0) ? (
          <EmptyState theme={theme}>
            No monthly data available
          </EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#555' : '#d1d5db'}
                opacity={0.8}
                horizontal={true}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                tickLine={{ stroke: isDark ? '#444' : '#ddd' }}
              />
              <YAxis
                tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                tickLine={{ stroke: isDark ? '#444' : '#ddd' }}
                tickFormatter={(value) => {
                  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value.toString();
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDark ? '#e2e8f0' : '#1e293b'
                }}
                formatter={(value: any, name: string) => [
                  formatCurrency(value),
                  name === 'income' ? 'Income' : 'Expenses'
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend
                formatter={(value: string) => (value === 'income' ? 'Income' : 'Expenses')}
                iconType="square"
              />
              <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ContentCard>
    </Container>
  );
};

export default AccountsTab;

