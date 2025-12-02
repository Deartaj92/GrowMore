import React from 'react';
import { useTheme } from 'styled-components';
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
  FeeStatsGrid,
  FeeStatCard,
  FeeStatLabel,
  FeeStatValue,
  CollectionChartsGrid,
  CollectionChartCard,
  CollectionChartTitle,
  FeeCollectionDetailsCard,
  FeeCollectionDetailsTitle,
  FeeCollectionTable,
  FeeCollectionTableHeader,
  FeeCollectionTableHeaderCell,
  FeeCollectionTableBody,
  FeeCollectionTableRow,
  FeeCollectionTableCell,
  DefaultersCard,
  DefaultersTitle,
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
    <div style={{ width: '100%' }}>
      {/* Fee Summary Section */}
      <FeeStatsGrid>
        <FeeStatCard>
          <FeeStatLabel>Total Invoiced</FeeStatLabel>
          <FeeStatValue>
            {feeSummaryLoading ? <DottedLoader /> : formatCurrency(feeSummary?.totalInvoiced || 0)}
          </FeeStatValue>
        </FeeStatCard>
        <FeeStatCard>
          <FeeStatLabel>Total Collected</FeeStatLabel>
          <FeeStatValue style={{ color: '#22c55e' }}>
            {feeSummaryLoading ? <DottedLoader /> : formatCurrency(feeSummary?.totalCollected || 0)}
          </FeeStatValue>
        </FeeStatCard>
        <FeeStatCard>
          <FeeStatLabel>Outstanding</FeeStatLabel>
          <FeeStatValue style={{ color: '#ef4444' }}>
            {feeSummaryLoading ? <DottedLoader /> : formatCurrency(feeSummary?.totalOutstanding || 0)}
          </FeeStatValue>
        </FeeStatCard>
        <FeeStatCard>
          <FeeStatLabel>Collection Rate</FeeStatLabel>
          <FeeStatValue style={{ color: '#6366f1' }}>
            {feeSummaryLoading ? <DottedLoader /> : `${(feeSummary?.collectionRate || 0).toFixed(1)}%`}
          </FeeStatValue>
        </FeeStatCard>
      </FeeStatsGrid>

      {/* Collection Charts Section */}
      <CollectionChartsGrid>
        <CollectionChartCard>
          <CollectionChartTitle>Daily Collection (Last 7 Days)</CollectionChartTitle>
          {collectionChartsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (!dailyCollectionData || dailyCollectionData.length === 0) ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: isDark ? '#888' : '#666' }}>
              No data available
            </div>
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
        </CollectionChartCard>

        <CollectionChartCard>
          <CollectionChartTitle>Monthly Collection (Last 12 Months)</CollectionChartTitle>
          {collectionChartsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (!monthlyCollectionData || monthlyCollectionData.length === 0) ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: isDark ? '#888' : '#666' }}>
              No data available
            </div>
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
        </CollectionChartCard>
      </CollectionChartsGrid>

      {/* Fee Collection Details Table */}
      <FeeCollectionDetailsCard>
        <FeeCollectionDetailsTitle>Fee collection details</FeeCollectionDetailsTitle>
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
      </FeeCollectionDetailsCard>

      {/* Defaulters Card */}
      <DefaultersCard>
        <DefaultersTitle>
          <span className="underlined">Defaulters</span> (Last 6 Months Data)
        </DefaultersTitle>
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
      </DefaultersCard>
    </div>
  );
};

export default FeeTab;
