import React from 'react';
import { useTheme } from 'styled-components';
import styled from 'styled-components';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import DottedLoader from '../shared/DottedLoader';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';
import {
  FeeCollectionTable,
  FeeCollectionTableHeader,
  FeeCollectionTableHeaderCell,
  FeeCollectionTableBody,
  FeeCollectionTableRow,
  FeeCollectionTableCell,
  DefaultersTable,
  DefaultersTableHeader,
  DefaultersTableHeaderCell,
  DefaultersTableBody,
  DefaultersTableRow,
  DefaultersTableCell,
  StatusBadge
} from '../../styles';
import { formatCurrency } from '../../utils/dashboardUtils';
import { FeeSummary, FeeCollectionDetails } from '../../types';

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

interface FeeTabProps {
  feeSummary: FeeSummary;
  feeSummaryLoading: boolean;
  collectionChartsLoading: boolean;
  dailyCollectionData: any[];
  monthlyCollectionData: any[];
  feeCollectionDetails: FeeCollectionDetails;
  feeCollectionDetailsLoading: boolean;
  defaultersData: any[];
  defaultersLoading: boolean;
}

const FeeTab: React.FC<FeeTabProps> = ({
  feeSummary,
  feeSummaryLoading,
  collectionChartsLoading,
  dailyCollectionData,
  monthlyCollectionData,
  feeCollectionDetails,
  feeCollectionDetailsLoading,
  defaultersData,
  defaultersLoading
}) => {
  const theme = useTheme() as any;
  const isDark = theme.BG === '#252525' || theme.BG === '#181c2a';

  return (
    <Container>
      {/* Fee Summary Section */}
      <StatsGrid theme={theme}>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Invoiced</StatLabel>
          <StatValue theme={theme}>
            {feeSummaryLoading ? <DottedLoader /> : formatCurrency(feeSummary?.totalInvoiced || 0)}
          </StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Collected</StatLabel>
          <StatValue theme={theme} style={{ color: '#22c55e' }}>
            {feeSummaryLoading ? <DottedLoader /> : formatCurrency(feeSummary?.totalCollected || 0)}
          </StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Outstanding</StatLabel>
          <StatValue theme={theme} style={{ color: '#ef4444' }}>
            {feeSummaryLoading ? <DottedLoader /> : formatCurrency(feeSummary?.totalOutstanding || 0)}
          </StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Collection Rate</StatLabel>
          <StatValue theme={theme} style={{ color: '#6366f1' }}>
            {feeSummaryLoading ? <DottedLoader /> : `${(feeSummary?.collectionRate || 0).toFixed(1)}%`}
          </StatValue>
        </StatCard>
      </StatsGrid>

      {/* Collection Charts Section */}
      <ContentGrid theme={theme}>
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>Daily Collection (Last 7 Days)</CardTitle>
          {collectionChartsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (!dailyCollectionData || dailyCollectionData.length === 0) ? (
            <EmptyState theme={theme}>
              <div style={{ fontSize: '0.9rem' }}>No data available</div>
            </EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyCollectionData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#555' : '#d1d5db'}
                  opacity={0.8}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                  tickLine={{ stroke: isDark ? '#444' : '#ddd' }}
                />
                <YAxis
                  tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                  tickLine={{ stroke: isDark ? '#444' : '#ddd' }}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
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
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Bar
                  dataKey="amount"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ContentCard>

        <ContentCard theme={theme}>
          <CardTitle theme={theme}>Monthly Collection (Last 12 Months)</CardTitle>
          {collectionChartsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (!monthlyCollectionData || monthlyCollectionData.length === 0) ? (
            <EmptyState theme={theme}>
              <div style={{ fontSize: '0.9rem' }}>No data available</div>
            </EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyCollectionData}>
                <defs>
                  <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                  tickLine={{ stroke: isDark ? '#444' : '#ddd' }}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
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
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorCollection)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ContentCard>
      </ContentGrid>

      {/* Fee Collection Details Table */}
      <ContentCard theme={theme}>
        <CardTitle theme={theme}>Fee collection details</CardTitle>
        {feeCollectionDetailsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <FeeCollectionTable>
            <FeeCollectionTableHeader>
              <tr>
                <FeeCollectionTableHeaderCell>Category</FeeCollectionTableHeaderCell>
                <FeeCollectionTableHeaderCell>Old students</FeeCollectionTableHeaderCell>
                <FeeCollectionTableHeaderCell>New admissions</FeeCollectionTableHeaderCell>
                <FeeCollectionTableHeaderCell>Total payable</FeeCollectionTableHeaderCell>
                <FeeCollectionTableHeaderCell>Paid</FeeCollectionTableHeaderCell>
                <FeeCollectionTableHeaderCell>Discount</FeeCollectionTableHeaderCell>
                <FeeCollectionTableHeaderCell>Dropped out</FeeCollectionTableHeaderCell>
                <FeeCollectionTableHeaderCell>Remaining</FeeCollectionTableHeaderCell>
              </tr>
            </FeeCollectionTableHeader>
            <FeeCollectionTableBody>
              <FeeCollectionTableRow>
                <FeeCollectionTableCell>Previous arrears</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.previousArrears?.oldStudents || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.previousArrears?.newAdmissions || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.previousArrears?.totalPayable || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#16a34a"
                    bgColor={isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.previousArrears?.paid || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#3b82f6"
                    bgColor={isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.previousArrears?.discount || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#ef4444"
                    bgColor={isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.previousArrears?.droppedOut || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.previousArrears?.remaining || 0)}</FeeCollectionTableCell>
              </FeeCollectionTableRow>

              <FeeCollectionTableRow>
                <FeeCollectionTableCell>Current month</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.currentMonth?.oldStudents || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.currentMonth?.newAdmissions || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.currentMonth?.totalPayable || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#16a34a"
                    bgColor={isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.currentMonth?.paid || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#3b82f6"
                    bgColor={isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.currentMonth?.discount || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#ef4444"
                    bgColor={isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.currentMonth?.droppedOut || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.currentMonth?.remaining || 0)}</FeeCollectionTableCell>
              </FeeCollectionTableRow>

              <FeeCollectionTableRow>
                <FeeCollectionTableCell>Next months</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.nextMonths?.oldStudents || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.nextMonths?.newAdmissions || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.nextMonths?.totalPayable || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#16a34a"
                    bgColor={isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.nextMonths?.paid || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#3b82f6"
                    bgColor={isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.nextMonths?.discount || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#ef4444"
                    bgColor={isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.nextMonths?.droppedOut || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.nextMonths?.remaining || 0)}</FeeCollectionTableCell>
              </FeeCollectionTableRow>

              <FeeCollectionTableRow isTotal>
                <FeeCollectionTableCell>Total</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.total?.oldStudents || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.total?.newAdmissions || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.total?.totalPayable || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#16a34a"
                    bgColor={isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.total?.paid || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#3b82f6"
                    bgColor={isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.total?.discount || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#ef4444"
                    bgColor={isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}
                  >
                    {formatCurrency(feeCollectionDetails?.total?.droppedOut || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.total?.remaining || 0)}</FeeCollectionTableCell>
              </FeeCollectionTableRow>
            </FeeCollectionTableBody>
          </FeeCollectionTable>
        )}
      </ContentCard>

      {/* Defaulters Card */}
      <ContentCard theme={theme}>
        <CardTitle theme={theme}>
          Defaulters (Last 6 Months Data)
        </CardTitle>
        {defaultersLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <DefaultersTable>
            <DefaultersTableHeader>
              <tr>
                <DefaultersTableHeaderCell>Month</DefaultersTableHeaderCell>
                <DefaultersTableHeaderCell align="center">Challan</DefaultersTableHeaderCell>
                <DefaultersTableHeaderCell align="right">Amount</DefaultersTableHeaderCell>
              </tr>
            </DefaultersTableHeader>
            <DefaultersTableBody>
              {(defaultersData || []).map((row, index) => (
                <DefaultersTableRow key={index}>
                  <DefaultersTableCell isMonth>{row.month}</DefaultersTableCell>
                  <DefaultersTableCell align="center">{row.challan || 0}</DefaultersTableCell>
                  <DefaultersTableCell align="right">{formatCurrency(row.amount || 0)}</DefaultersTableCell>
                </DefaultersTableRow>
              ))}
              <DefaultersTableRow isTotal>
                <DefaultersTableCell>Total</DefaultersTableCell>
                <DefaultersTableCell align="center">
                  {(defaultersData || []).reduce((sum, row) => sum + (row.challan || 0), 0)}
                </DefaultersTableCell>
                <DefaultersTableCell align="right">
                  {formatCurrency((defaultersData || []).reduce((sum, row) => sum + (row.amount || 0), 0))}
                </DefaultersTableCell>
              </DefaultersTableRow>
            </DefaultersTableBody>
          </DefaultersTable>
        )}
      </ContentCard>
    </Container>
  );
};

export default FeeTab;
