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
import { getStudentDisplayId } from '../../../../utils/studentUtils';

import { clayCardStyle, isDark, CARD_RADIUS_LG, getDashboardPalette } from '../../../../styles/DesignSystem';

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
  ${clayCardStyle}
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 600px) {
    padding: 0.85rem;
    border-radius: ${CARD_RADIUS_LG};
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
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 1.5rem;
  
  @media (max-width: 768px) {
    padding: 1.1rem;
    border-radius: ${CARD_RADIUS_LG};
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
  const dashboardPalette = getDashboardPalette(theme);
  const statusPalette = dashboardPalette.status;

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
          <StatValue theme={theme} style={{ color: statusPalette.success }}>
            {feeSummaryLoading ? <DottedLoader /> : formatCurrency(feeSummary?.totalCollected || 0)}
          </StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Discount</StatLabel>
          <StatValue theme={theme} style={{ color: statusPalette.info }}>
            {feeSummaryLoading ? <DottedLoader /> : formatCurrency(feeSummary?.totalDiscount || 0)}
          </StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Outstanding</StatLabel>
          <StatValue theme={theme} style={{ color: statusPalette.danger }}>
            {feeSummaryLoading ? <DottedLoader /> : formatCurrency(feeSummary?.totalOutstanding || 0)}
          </StatValue>
        </StatCard>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Collection Rate</StatLabel>
          <StatValue theme={theme} style={{ color: theme.ACCENT }}>
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
                  stroke={dashboardPalette.chartAxis}
                  opacity={0.8}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: dashboardPalette.chartTick, fontSize: 12 }}
                  tickLine={{ stroke: dashboardPalette.chartAxis }}
                />
                <YAxis
                  tick={{ fill: dashboardPalette.chartTick, fontSize: 12 }}
                  tickLine={{ stroke: dashboardPalette.chartAxis }}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value.toString();
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: dashboardPalette.tooltipBg,
                    border: `1px solid ${dashboardPalette.tooltipBorder}`,
                    borderRadius: '8px',
                    color: dashboardPalette.tooltipText
                  }}
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Bar
                  dataKey="amount"
                  fill={statusPalette.info}
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
                    <stop offset="5%" stopColor={statusPalette.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={statusPalette.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={dashboardPalette.chartAxis}
                  opacity={0.8}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: dashboardPalette.chartTick, fontSize: 12 }}
                  tickLine={{ stroke: dashboardPalette.chartAxis }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fill: dashboardPalette.chartTick, fontSize: 12 }}
                  tickLine={{ stroke: dashboardPalette.chartAxis }}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value.toString();
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: dashboardPalette.tooltipBg,
                    border: `1px solid ${dashboardPalette.tooltipBorder}`,
                    borderRadius: '8px',
                    color: dashboardPalette.tooltipText
                  }}
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={statusPalette.success}
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
                <FeeCollectionTableHeaderCell>Balance</FeeCollectionTableHeaderCell>
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
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#f59e0b"
                    bgColor={statusPalette.warningBg}
                  >
                    {formatCurrency(feeCollectionDetails?.previousArrears?.balance || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.previousArrears?.totalPayable || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#16a34a"
                    bgColor={statusPalette.successBg}
                  >
                    {formatCurrency(feeCollectionDetails?.previousArrears?.paid || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#3b82f6"
                    bgColor={statusPalette.infoBg}
                  >
                    {formatCurrency(feeCollectionDetails?.previousArrears?.discount || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#ef4444"
                    bgColor={statusPalette.dangerBg}
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
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#f59e0b"
                    bgColor={statusPalette.warningBg}
                  >
                    {formatCurrency(feeCollectionDetails?.currentMonth?.balance || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.currentMonth?.totalPayable || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#16a34a"
                    bgColor={statusPalette.successBg}
                  >
                    {formatCurrency(feeCollectionDetails?.currentMonth?.paid || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#3b82f6"
                    bgColor={statusPalette.infoBg}
                  >
                    {formatCurrency(feeCollectionDetails?.currentMonth?.discount || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#ef4444"
                    bgColor={statusPalette.dangerBg}
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
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#f59e0b"
                    bgColor={statusPalette.warningBg}
                  >
                    {formatCurrency(feeCollectionDetails?.nextMonths?.balance || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.nextMonths?.totalPayable || 0)}</FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#16a34a"
                    bgColor={statusPalette.successBg}
                  >
                    {formatCurrency(feeCollectionDetails?.nextMonths?.paid || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#3b82f6"
                    bgColor={statusPalette.infoBg}
                  >
                    {formatCurrency(feeCollectionDetails?.nextMonths?.discount || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>
                  <StatusBadge
                    color="#ef4444"
                    bgColor={statusPalette.dangerBg}
                  >
                    {formatCurrency(feeCollectionDetails?.nextMonths?.droppedOut || 0)}
                  </StatusBadge>
                </FeeCollectionTableCell>
                <FeeCollectionTableCell>{formatCurrency(feeCollectionDetails?.nextMonths?.remaining || 0)}</FeeCollectionTableCell>
              </FeeCollectionTableRow>
            </FeeCollectionTableBody>
          </FeeCollectionTable>
        )}
      </ContentCard>

      {/* Defaulters Card */}
      <ContentCard theme={theme}>
        <CardTitle theme={theme}>
          Top Defaulters (Students with Outstanding Fees)
        </CardTitle>
        {defaultersLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : defaultersData && defaultersData.length > 0 ? (
          <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
            <DefaultersTable>
              <DefaultersTableHeader>
                <tr>
                  <DefaultersTableHeaderCell style={{ minWidth: '80px' }}>#</DefaultersTableHeaderCell>
                  <DefaultersTableHeaderCell style={{ minWidth: '120px' }}>Student ID</DefaultersTableHeaderCell>
                  <DefaultersTableHeaderCell style={{ minWidth: '150px' }}>Student Name</DefaultersTableHeaderCell>
                  <DefaultersTableHeaderCell style={{ minWidth: '150px' }}>Father Name</DefaultersTableHeaderCell>
                  <DefaultersTableHeaderCell style={{ minWidth: '120px' }}>Class</DefaultersTableHeaderCell>
                  <DefaultersTableHeaderCell align="center" style={{ minWidth: '80px' }}>Challans</DefaultersTableHeaderCell>
                  <DefaultersTableHeaderCell align="center" style={{ minWidth: '80px' }}>Arrears</DefaultersTableHeaderCell>
                  <DefaultersTableHeaderCell align="right" style={{ minWidth: '120px' }}>Total Paid</DefaultersTableHeaderCell>
                  <DefaultersTableHeaderCell align="right" style={{ minWidth: '100px' }}>Discount</DefaultersTableHeaderCell>
                  <DefaultersTableHeaderCell align="right" style={{ minWidth: '120px' }}>Outstanding</DefaultersTableHeaderCell>
                </tr>
              </DefaultersTableHeader>
              <DefaultersTableBody>
                {defaultersData.map((row, index) => (
                  <DefaultersTableRow key={row.studentId}>
                    <DefaultersTableCell>{index + 1}</DefaultersTableCell>
                    <DefaultersTableCell style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {getStudentDisplayId({ id: row.studentId, roll_number: row.rollNumber })}
                    </DefaultersTableCell>
                    <DefaultersTableCell style={{ fontWeight: 600 }}>{row.studentName}</DefaultersTableCell>
                    <DefaultersTableCell>{row.fatherName || '-'}</DefaultersTableCell>
                    <DefaultersTableCell>
                      {row.sectionName ? `${row.className} (${row.sectionName})` : row.className}
                    </DefaultersTableCell>
                    <DefaultersTableCell align="center">
                      <StatusBadge
                        color="#3b82f6"
                        bgColor={statusPalette.infoBg}
                      >
                        {row.challanCount}
                      </StatusBadge>
                    </DefaultersTableCell>
                    <DefaultersTableCell align="center">
                      {row.arrearCount > 0 ? (
                        <StatusBadge
                          color="#f59e0b"
                          bgColor={statusPalette.warningBg}
                        >
                          {row.arrearCount}
                        </StatusBadge>
                      ) : (
                        '-'
                      )}
                    </DefaultersTableCell>
                    <DefaultersTableCell align="right" style={{ color: '#22c55e', fontWeight: 600 }}>
                      {formatCurrency(row.totalPaid)}
                    </DefaultersTableCell>
                    <DefaultersTableCell align="right" style={{ color: '#f59e0b', fontWeight: 500 }}>
                      {row.totalDiscount > 0 ? formatCurrency(row.totalDiscount) : '-'}
                    </DefaultersTableCell>
                    <DefaultersTableCell align="right" style={{ color: '#ef4444', fontWeight: 700 }}>
                      {formatCurrency(row.outstandingAmount)}
                    </DefaultersTableCell>
                  </DefaultersTableRow>
                ))}
              </DefaultersTableBody>
            </DefaultersTable>
          </div>
        ) : (
          <EmptyState theme={theme}>
            <div style={{ fontSize: '0.9rem' }}>No defaulters found</div>
          </EmptyState>
        )}
      </ContentCard>
    </Container>
  );
};

export default FeeTab;
