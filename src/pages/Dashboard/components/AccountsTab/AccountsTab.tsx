import React from 'react';
import { useTheme } from 'styled-components';
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
  FeeStatsGrid,
  FeeStatCard,
  FeeStatLabel,
  FeeStatValue,
  CollectionChartsGrid,
  CollectionChartCard,
  CollectionChartTitle,
  DashboardDateInput
} from '../../styles';
import { formatCurrency } from '../../utils/dashboardUtils';
import { AccountsData } from '../../services/accountsService';

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
    <div style={{ width: '100%' }}>
      {/* Date Range Selector */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
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
      <FeeStatsGrid>
        <FeeStatCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingUpIcon style={{ color: '#22c55e', fontSize: '1.5rem' }} />
            <FeeStatLabel>Income</FeeStatLabel>
          </div>
          <FeeStatValue style={{ color: '#22c55e' }}>
            {accountsLoading ? <DottedLoader /> : formatCurrency(summary?.income || 0)}
          </FeeStatValue>
        </FeeStatCard>

        <FeeStatCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingDownIcon style={{ color: '#eab308', fontSize: '1.5rem' }} />
            <FeeStatLabel>Expenses</FeeStatLabel>
          </div>
          <FeeStatValue style={{ color: '#eab308' }}>
            {accountsLoading ? <DottedLoader /> : formatCurrency(summary?.expenses || 0)}
          </FeeStatValue>
        </FeeStatCard>

        <FeeStatCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <ShowChartIcon style={{ color: '#ec4899', fontSize: '1.5rem' }} />
            <FeeStatLabel>Profit/Loss</FeeStatLabel>
          </div>
          <FeeStatValue style={{ color: summary?.profitLoss >= 0 ? '#22c55e' : '#ef4444' }}>
            {accountsLoading ? <DottedLoader /> : formatCurrency(summary?.profitLoss || 0)}
          </FeeStatValue>
        </FeeStatCard>

        <FeeStatCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingUpIcon style={{ color: '#22c55e', fontSize: '1.5rem' }} />
            <FeeStatLabel>Cash</FeeStatLabel>
          </div>
          <FeeStatValue style={{ color: summary?.cash >= 0 ? '#22c55e' : '#ef4444' }}>
            {accountsLoading ? <DottedLoader /> : formatCurrency(summary?.cash || 0)}
          </FeeStatValue>
        </FeeStatCard>
      </FeeStatsGrid>

      {/* Charts Section */}
      <CollectionChartsGrid>
        {/* Cash Accounts Bar Chart */}
        <CollectionChartCard>
          <CollectionChartTitle>Cash Accounts Ending Balance</CollectionChartTitle>
          {accountsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (!cashAccounts || cashAccounts.length === 0) ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: isDark ? '#888' : '#666' }}>
              No cash account data available
            </div>
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
        </CollectionChartCard>

        {/* Income vs Expenses Donut Chart */}
        <CollectionChartCard>
          <CollectionChartTitle>Income vs Expenses</CollectionChartTitle>
          {accountsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : totalForDonut === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: isDark ? '#888' : '#666' }}>
              No financial data available
            </div>
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
        </CollectionChartCard>
      </CollectionChartsGrid>

      {/* Monthly Income & Expenses Chart */}
      <CollectionChartCard style={{ marginTop: '1.5rem' }}>
        <CollectionChartTitle>Income & Expenses</CollectionChartTitle>
        {accountsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (!monthlyData || monthlyData.length === 0) ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: isDark ? '#888' : '#666' }}>
            No monthly data available
          </div>
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
      </CollectionChartCard>
    </div>
  );
};

export default AccountsTab;

