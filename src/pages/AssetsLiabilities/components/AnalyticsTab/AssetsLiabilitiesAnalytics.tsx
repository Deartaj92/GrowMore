import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../components/Layout';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { useLoading } from '../../../../contexts/LoadingContext';
import {
  Assessment,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Refresh as RefreshIcon,
  PieChart as PieChartIcon,
  BarChart,
} from '@mui/icons-material';
import { format } from 'date-fns';
import Loader from '../../../../components/Loader';
import { assetsService } from '../../services/assetsService';
import { liabilitiesService } from '../../services/liabilitiesService';
import { balanceSheetService } from '../../services/balanceSheetService';
import { AssetSummary } from '../../../../types/asset';
import { LiabilitySummary, BalanceSheet } from '../../../../types/liability';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
} from 'recharts';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const TabContainer = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
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
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;

const HeaderTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
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
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
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
  margin-bottom: 0.5rem;
  
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

// ===== MAIN COMPONENT =====

const AssetsLiabilitiesAnalytics: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  
  const [isLoading, setIsLoading] = useState(true);
  const [assetSummary, setAssetSummary] = useState<AssetSummary | null>(null);
  const [liabilitySummary, setLiabilitySummary] = useState<LiabilitySummary | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{ date: string; assets: number; liabilities: number; netWorth: number }>>([]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchAnalytics = useCallback(async () => {
    if (!user?.school_id) return;
    
    setLoading(true);
    setIsLoading(true);
    try {
      // Fetch summaries
      const [assetsData, liabilitiesData, balanceData] = await Promise.all([
        assetsService.getAssetSummary(user.school_id),
        liabilitiesService.getLiabilitySummary(user.school_id),
        balanceSheetService.getBalanceSheet(user.school_id),
      ]);
      
      setAssetSummary(assetsData);
      setLiabilitySummary(liabilitiesData);
      setBalanceSheet(balanceData);
      
      // Generate historical data (last 12 months) - use current balance sheet for all points
      // In a real implementation, you'd store historical snapshots, but for now we use current data
      const historical: Array<{ date: string; assets: number; liabilities: number; netWorth: number }> = [];
      const today = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        // Use current balance sheet data for all historical points
        // In production, you'd query historical snapshots from a separate table
        historical.push({
          date: format(date, 'MMM yy'),
          assets: balanceData.assets.total,
          liabilities: balanceData.liabilities.total,
          netWorth: balanceData.netWorth,
        });
      }
      setHistoricalData(historical);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      showToast('Failed to fetch analytics data', 'error');
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  }, [user?.school_id, setLoading, showToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const chartColors = [
    '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#f43f5e', '#fb923c', '#38bdf8',
  ];

  if (isLoading) {
    return <Loader />;
  }

  if (!assetSummary || !liabilitySummary || !balanceSheet) {
    return (
      <TabContainer theme={theme}>
        <Header theme={theme}>
          <HeaderTitle theme={theme}>
            <Assessment />
            Assets & Liabilities Analytics
          </HeaderTitle>
          <HeaderActions theme={theme}>
            <ActionButton theme={theme} onClick={fetchAnalytics}>
              <RefreshIcon style={{ fontSize: '1rem' }} />
              Refresh
            </ActionButton>
          </HeaderActions>
        </Header>
        <EmptyState theme={theme}>
          <Assessment style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
          No analytics data available
        </EmptyState>
      </TabContainer>
    );
  }

  return (
    <TabContainer theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <Assessment />
          Assets & Liabilities Analytics
        </HeaderTitle>
        <HeaderActions theme={theme}>
          <ActionButton theme={theme} onClick={fetchAnalytics}>
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </ActionButton>
        </HeaderActions>
      </Header>

      <StatsGrid theme={theme}>
        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Assets Value</StatLabel>
          <StatValue theme={theme}>{formatCurrency(assetSummary.totalValue)}</StatValue>
          <StatChange $positive={true} theme={theme}>
            <TrendingUp style={{ fontSize: '0.75rem' }} />
            {assetSummary.totalAssets} assets
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Liabilities</StatLabel>
          <StatValue theme={theme}>{formatCurrency(liabilitySummary.totalPrincipal)}</StatValue>
          <StatChange $positive={false} theme={theme}>
            <TrendingDown style={{ fontSize: '0.75rem' }} />
            {liabilitySummary.totalLiabilities} liabilities
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <StatLabel theme={theme}>Current Assets Value</StatLabel>
          <StatValue theme={theme}>{formatCurrency(assetSummary.totalCurrentValue)}</StatValue>
          <StatChange $positive={true} theme={theme}>
            <AccountBalance style={{ fontSize: '0.75rem' }} />
            After depreciation
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <StatLabel theme={theme}>Outstanding Liabilities</StatLabel>
          <StatValue theme={theme}>{formatCurrency(liabilitySummary.totalCurrentBalance)}</StatValue>
          <StatChange $positive={false} theme={theme}>
            <TrendingDown style={{ fontSize: '0.75rem' }} />
            {((liabilitySummary.totalCurrentBalance / liabilitySummary.totalPrincipal) * 100).toFixed(1)}% remaining
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <StatLabel theme={theme}>Total Depreciation</StatLabel>
          <StatValue theme={theme}>{formatCurrency(assetSummary.totalDepreciation)}</StatValue>
          <StatChange $positive={false} theme={theme}>
            <TrendingDown style={{ fontSize: '0.75rem' }} />
            {assetSummary.totalValue > 0 ? ((assetSummary.totalDepreciation / assetSummary.totalValue) * 100).toFixed(1) : 0}% of purchase value
          </StatChange>
        </StatCard>

        <StatCard theme={theme}>
          <StatLabel theme={theme}>Net Worth</StatLabel>
          <StatValue theme={theme} style={{ color: balanceSheet.netWorth >= 0 ? '#10b981' : '#ef4444' }}>
            {formatCurrency(balanceSheet.netWorth)}
          </StatValue>
          <StatChange $positive={balanceSheet.netWorth >= 0} theme={theme}>
            {balanceSheet.netWorth >= 0 ? (
              <TrendingUp style={{ fontSize: '0.75rem' }} />
            ) : (
              <TrendingDown style={{ fontSize: '0.75rem' }} />
            )}
            Assets - Liabilities
          </StatChange>
        </StatCard>
      </StatsGrid>

      <ContentGrid theme={theme}>
        {/* Historical Trends */}
        <ContentCard theme={theme} style={{ padding: '1rem' }}>
          <CardTitle theme={theme} style={{ marginBottom: '0.75rem' }}>
            <TrendingUp />
            Financial Position Trends
          </CardTitle>
          <div style={{ height: '400px', position: 'relative' }}>
            {historicalData.length === 0 ? (
              <EmptyState theme={theme}>
                <div style={{ fontSize: '0.9rem' }}>No historical data available</div>
              </EmptyState>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={historicalData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                  />
                  <XAxis 
                    dataKey="date" 
                    stroke={theme.TEXT_SECONDARY}
                    tick={{ fill: theme.TEXT_SECONDARY, fontSize: 12 }}
                    tickLine={{ stroke: theme.TEXT_SECONDARY }}
                  />
                  <YAxis 
                    stroke={theme.TEXT_SECONDARY}
                    tick={{ fill: theme.TEXT_SECONDARY, fontSize: 12 }}
                    tickLine={{ stroke: theme.TEXT_SECONDARY }}
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
                    dataKey="assets"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorAssets)"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="liabilities"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#colorLiabilities)"
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorNetWorth)"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                  <Legend
                    wrapperStyle={{ 
                      fontSize: '0.85rem', 
                      color: isDark(theme) ? '#f1f5f9' : '#1e293b',
                      fontWeight: 500
                    }}
                    iconType="square"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ContentCard>

        {/* Assets by Category */}
        <ContentCard theme={theme} style={{ padding: '1rem' }}>
          <CardTitle theme={theme} style={{ marginBottom: '0.75rem' }}>
            <PieChartIcon />
            Assets by Category
          </CardTitle>
          {assetSummary.byCategory.length > 0 ? (
            <div style={{ height: '400px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetSummary.byCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="totalValue"
                  >
                    {assetSummary.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
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
                  />
                  <Legend
                    wrapperStyle={{ 
                      fontSize: '0.85rem', 
                      color: isDark(theme) ? '#f1f5f9' : '#1e293b',
                      fontWeight: 500
                    }}
                    iconType="square"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState theme={theme}>
              <div style={{ fontSize: '0.9rem' }}>No asset category data available</div>
            </EmptyState>
          )}
        </ContentCard>
      </ContentGrid>

      <ContentGrid theme={theme}>
        {/* Liabilities by Category */}
        <ContentCard theme={theme} style={{ padding: '1rem' }}>
          <CardTitle theme={theme} style={{ marginBottom: '0.75rem' }}>
            <PieChartIcon />
            Liabilities by Category
          </CardTitle>
          {liabilitySummary.byCategory.length > 0 ? (
            <div style={{ height: '400px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liabilitySummary.byCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="totalCurrentBalance"
                  >
                    {liabilitySummary.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
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
                  />
                  <Legend
                    wrapperStyle={{ 
                      fontSize: '0.85rem', 
                      color: isDark(theme) ? '#f1f5f9' : '#1e293b',
                      fontWeight: 500
                    }}
                    iconType="square"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState theme={theme}>
              <div style={{ fontSize: '0.9rem' }}>No liability category data available</div>
            </EmptyState>
          )}
        </ContentCard>

        {/* Assets vs Liabilities Comparison */}
        <ContentCard theme={theme} style={{ padding: '1rem' }}>
          <CardTitle theme={theme} style={{ marginBottom: '0.75rem' }}>
            <BarChart />
            Assets vs Liabilities
          </CardTitle>
          <div style={{ height: '400px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={[
                  {
                    name: 'Assets',
                    value: balanceSheet.assets.total,
                  },
                  {
                    name: 'Liabilities',
                    value: balanceSheet.liabilities.total,
                  },
                  {
                    name: 'Net Worth',
                    value: balanceSheet.netWorth,
                  },
                ]}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDark(theme) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                />
                <XAxis 
                  dataKey="name" 
                  stroke={theme.TEXT_SECONDARY}
                  tick={{ fill: theme.TEXT_SECONDARY, fontSize: 12 }}
                  tickLine={{ stroke: theme.TEXT_SECONDARY }}
                />
                <YAxis 
                  stroke={theme.TEXT_SECONDARY}
                  tick={{ fill: theme.TEXT_SECONDARY, fontSize: 12 }}
                  tickLine={{ stroke: theme.TEXT_SECONDARY }}
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
                />
                <Bar 
                  dataKey="value" 
                  radius={[8, 8, 0, 0]}
                >
                  {[
                    { name: 'Assets', value: balanceSheet.assets.total },
                    { name: 'Liabilities', value: balanceSheet.liabilities.total },
                    { name: 'Net Worth', value: balanceSheet.netWorth },
                  ].map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === 'Assets' ? '#10b981' :
                        entry.name === 'Liabilities' ? '#ef4444' :
                        balanceSheet.netWorth >= 0 ? '#3b82f6' : '#f59e0b'
                      } 
                    />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>
      </ContentGrid>

      {/* Category Breakdown Tables */}
      <ContentGrid theme={theme}>
        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <AccountBalance />
            Assets Breakdown
          </CardTitle>
          {assetSummary.byCategory.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: theme.TEXT_SECONDARY }}>Category</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: theme.TEXT_SECONDARY }}>Count</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: theme.TEXT_SECONDARY }}>Total Value</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: theme.TEXT_SECONDARY }}>Current Value</th>
                  </tr>
                </thead>
                <tbody>
                  {assetSummary.byCategory.map(cat => (
                    <tr key={cat.categoryId} style={{ borderBottom: `1px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}` }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: theme.TEXT_PRIMARY }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: cat.color,
                            }}
                          />
                          {cat.categoryName}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: theme.TEXT_PRIMARY, textAlign: 'right' }}>
                        {cat.count}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: theme.TEXT_PRIMARY, textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(cat.totalValue)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: theme.TEXT_PRIMARY, textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(cat.totalCurrentValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState theme={theme}>
              <div style={{ fontSize: '0.9rem' }}>No asset categories found</div>
            </EmptyState>
          )}
        </ContentCard>

        <ContentCard theme={theme}>
          <CardTitle theme={theme}>
            <TrendingDown />
            Liabilities Breakdown
          </CardTitle>
          {liabilitySummary.byCategory.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: theme.TEXT_SECONDARY }}>Category</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: theme.TEXT_SECONDARY }}>Count</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: theme.TEXT_SECONDARY }}>Principal</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: theme.TEXT_SECONDARY }}>Current Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {liabilitySummary.byCategory.map(cat => (
                    <tr key={cat.categoryId} style={{ borderBottom: `1px solid ${isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}` }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: theme.TEXT_PRIMARY }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: cat.color,
                            }}
                          />
                          {cat.categoryName}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: theme.TEXT_PRIMARY, textAlign: 'right' }}>
                        {cat.count}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: theme.TEXT_PRIMARY, textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(cat.totalPrincipal)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: theme.TEXT_PRIMARY, textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(cat.totalCurrentBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState theme={theme}>
              <div style={{ fontSize: '0.9rem' }}>No liability categories found</div>
            </EmptyState>
          )}
        </ContentCard>
      </ContentGrid>
    </TabContainer>
  );
};

export default AssetsLiabilitiesAnalytics;





