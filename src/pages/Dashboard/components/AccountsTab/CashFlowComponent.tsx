import React from 'react';
import { useTheme } from 'styled-components';
import styled from 'styled-components';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Line,
  LineChart
} from 'recharts';
import { formatCurrency } from '../../utils/dashboardUtils';
import { CashFlowData } from '../../services/accountsService';
import DottedLoader from '../shared/DottedLoader';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525' || themeObj.BG === '#181c2a';

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

const CashFlowGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
`;

const CashFlowCard = styled.div`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
`;

const CashFlowLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CashFlowValue = styled.div<{ $positive?: boolean }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ $positive, theme }) => {
    if ($positive === undefined) return theme.TEXT_PRIMARY;
    return $positive ? '#22c55e' : '#ef4444';
  }};
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const BreakdownSection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
`;

const BreakdownTitle = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 0.75rem 0;
`;

const BreakdownItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.85rem;
`;

const BreakdownLabel = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const BreakdownAmount = styled.span<{ $positive?: boolean }>`
  font-weight: 600;
  color: ${({ $positive, theme }) => {
    if ($positive === undefined) return theme.TEXT_PRIMARY;
    return $positive ? '#22c55e' : '#ef4444';
  }};
`;

interface CashFlowComponentProps {
  cashFlow: CashFlowData | null;
  loading: boolean;
}

const CashFlowComponent: React.FC<CashFlowComponentProps> = ({ cashFlow, loading }) => {
  const theme = useTheme() as any;
  const isDarkTheme = isDark(theme);

  if (loading) {
    return (
      <ContentCard theme={theme}>
        <CardTitle theme={theme}>
          <AccountBalanceIcon />
          Cash Flow Statement
        </CardTitle>
        <EmptyState theme={theme}>
          <DottedLoader />
        </EmptyState>
      </ContentCard>
    );
  }

  if (!cashFlow) {
    return (
      <ContentCard theme={theme}>
        <CardTitle theme={theme}>
          <AccountBalanceIcon />
          Cash Flow Statement
        </CardTitle>
        <EmptyState theme={theme}>
          No cash flow data available
        </EmptyState>
      </ContentCard>
    );
  }

  return (
    <ContentCard theme={theme}>
      <CardTitle theme={theme}>
        <AccountBalanceIcon />
        Cash Flow Statement
      </CardTitle>

      {/* Summary Cards */}
      <CashFlowGrid>
        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Opening Balance</CashFlowLabel>
          <CashFlowValue theme={theme}>
            {formatCurrency(cashFlow.openingBalance)}
          </CashFlowValue>
        </CashFlowCard>

        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Total Inflows</CashFlowLabel>
          <CashFlowValue theme={theme} $positive={true}>
            <ArrowUpIcon style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            {formatCurrency(cashFlow.inflows.total)}
          </CashFlowValue>
        </CashFlowCard>

        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Total Outflows</CashFlowLabel>
          <CashFlowValue theme={theme} $positive={false}>
            <ArrowDownIcon style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            {formatCurrency(cashFlow.outflows.total)}
          </CashFlowValue>
        </CashFlowCard>

        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Net Cash Flow</CashFlowLabel>
          <CashFlowValue theme={theme} $positive={cashFlow.netCashFlow >= 0}>
            {cashFlow.netCashFlow >= 0 ? (
              <TrendingUpIcon style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            ) : (
              <TrendingDownIcon style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            )}
            {formatCurrency(cashFlow.netCashFlow)}
          </CashFlowValue>
        </CashFlowCard>

        <CashFlowCard theme={theme}>
          <CashFlowLabel theme={theme}>Closing Balance</CashFlowLabel>
          <CashFlowValue theme={theme} $positive={cashFlow.closingBalance >= 0}>
            {formatCurrency(cashFlow.closingBalance)}
          </CashFlowValue>
        </CashFlowCard>
      </CashFlowGrid>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Inflows Breakdown */}
        <BreakdownSection>
          <BreakdownTitle>Cash Inflows</BreakdownTitle>
          <BreakdownItem>
            <BreakdownLabel>Fee Payments</BreakdownLabel>
            <BreakdownAmount $positive={true}>
              {formatCurrency(cashFlow.inflows.feePayments)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem>
            <BreakdownLabel>Other Incomes</BreakdownLabel>
            <BreakdownAmount $positive={true}>
              {formatCurrency(cashFlow.inflows.otherIncomes)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem style={{ 
            marginTop: '0.5rem', 
            paddingTop: '0.75rem', 
            borderTop: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            fontWeight: 600
          }}>
            <BreakdownLabel>Total Inflows</BreakdownLabel>
            <BreakdownAmount $positive={true}>
              {formatCurrency(cashFlow.inflows.total)}
            </BreakdownAmount>
          </BreakdownItem>
        </BreakdownSection>

        {/* Outflows Breakdown */}
        <BreakdownSection>
          <BreakdownTitle>Cash Outflows</BreakdownTitle>
          <BreakdownItem>
            <BreakdownLabel>Expenses</BreakdownLabel>
            <BreakdownAmount $positive={false}>
              {formatCurrency(cashFlow.outflows.expenses)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem>
            <BreakdownLabel>Asset Purchases</BreakdownLabel>
            <BreakdownAmount $positive={false}>
              {formatCurrency(cashFlow.outflows.assetPurchases)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem>
            <BreakdownLabel>Liability Payments</BreakdownLabel>
            <BreakdownAmount $positive={false}>
              {formatCurrency(cashFlow.outflows.liabilityPayments)}
            </BreakdownAmount>
          </BreakdownItem>
          <BreakdownItem style={{ 
            marginTop: '0.5rem', 
            paddingTop: '0.75rem', 
            borderTop: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            fontWeight: 600
          }}>
            <BreakdownLabel>Total Outflows</BreakdownLabel>
            <BreakdownAmount $positive={false}>
              {formatCurrency(cashFlow.outflows.total)}
            </BreakdownAmount>
          </BreakdownItem>
        </BreakdownSection>
      </div>

      {/* Monthly Cash Flow Chart */}
      {cashFlow.monthlyCashFlow && cashFlow.monthlyCashFlow.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <BreakdownTitle>Monthly Cash Flow Trend</BreakdownTitle>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashFlow.monthlyCashFlow} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDarkTheme ? '#555' : '#d1d5db'}
                opacity={0.8}
                horizontal={true}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: isDarkTheme ? '#888' : '#666', fontSize: 11 }}
                tickLine={{ stroke: isDarkTheme ? '#444' : '#ddd' }}
              />
              <YAxis
                tick={{ fill: isDarkTheme ? '#888' : '#666', fontSize: 12 }}
                tickLine={{ stroke: isDarkTheme ? '#444' : '#ddd' }}
                tickFormatter={(value) => {
                  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value.toString();
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
                  border: isDarkTheme ? '1px solid #334155' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDarkTheme ? '#e2e8f0' : '#1e293b'
                }}
                formatter={(value: any, name: string) => [
                  formatCurrency(value),
                  name === 'inflows' ? 'Inflows' : name === 'outflows' ? 'Outflows' : 'Net Flow'
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend
                formatter={(value: string) => {
                  if (value === 'inflows') return 'Inflows';
                  if (value === 'outflows') return 'Outflows';
                  if (value === 'netFlow') return 'Net Flow';
                  return value;
                }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="inflows"
                stroke="#22c55e"
                strokeWidth={2}
                name="inflows"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="outflows"
                stroke="#ef4444"
                strokeWidth={2}
                name="outflows"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="netFlow"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="netFlow"
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ContentCard>
  );
};

export default CashFlowComponent;





