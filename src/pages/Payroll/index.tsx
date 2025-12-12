import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  AccountBalance as PlansIcon,
  Calculate as GenerateIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  Analytics as AnalyticsIcon,
  AccountBalanceWallet as AdvanceIcon,
  AttachMoney as AdjustmentIcon,
} from '@mui/icons-material';
import PayrollSettingsForm from './components/PayrollSettings/PayrollSettingsForm';
import PayrollPlansList from './components/PayrollPlans/PayrollPlansList';
import PayrollGenerationManager from './components/PayrollGeneration/PayrollGenerationManager';
import PayrollPaymentsList from './components/PayrollPayments/PayrollPaymentsList';
import PayrollHistoryList from './components/PayrollHistory/PayrollHistoryList';
import PayrollAnalyticsDashboard from './components/PayrollAnalytics/PayrollAnalyticsDashboard';
import PayrollAdvancesList from './components/PayrollAdvances/PayrollAdvancesList';
import PayrollAdjustmentsList from './components/PayrollAdjustments/PayrollAdjustmentsList';
import { payrollService } from '../../services/payrollService';
import { PayrollSummary } from '../../types/payroll';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  min-height: 100vh;
`;

const Header = styled.div`
  padding: 20px 20px 0 20px;
  background: ${({ theme }) => theme.BG};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 16px 0;
`;

const Content = styled.div`
  padding: 20px;
`;

const SummaryCard = styled(Card)`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  height: 100%;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const SummaryCardContent = styled(CardContent)`
  padding: 16px !important;
`;

const SummaryTitle = styled(Typography)`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryValue = styled(Typography)`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SummarySubtext = styled(Typography)`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 4px;
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const PayrollDashboard: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const [activeTab, setActiveTab] = useState(0);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    if (user?.school_id && activeTab === 0) {
      loadSummary();
    }
  }, [user?.school_id, activeTab]);

  const loadSummary = async () => {
    if (!user?.school_id) return;
    try {
      setLoadingSummary(true);
      const data = await payrollService.getPayrollSummary(user.school_id);
      setSummary(data);
    } catch (error: any) {
      console.error('Error loading summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <PageContainer>
      <Header>
        <Title>
          <DashboardIcon style={{ fontSize: 28 }} />
          Payroll Management
        </Title>
        <Subtitle>Manage employee salaries, payments, and payroll operations</Subtitle>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '0.875rem',
              textTransform: 'none',
              fontWeight: 500,
            },
          }}
        >
          <Tab icon={<DashboardIcon />} iconPosition="start" label="Dashboard" />
          <Tab icon={<PlansIcon />} iconPosition="start" label="Payroll Plans" />
          <Tab icon={<GenerateIcon />} iconPosition="start" label="Generate Payroll" />
          <Tab icon={<PaymentIcon />} iconPosition="start" label="Payments" />
          <Tab icon={<HistoryIcon />} iconPosition="start" label="History" />
          <Tab icon={<AnalyticsIcon />} iconPosition="start" label="Analytics" />
          <Tab icon={<AdvanceIcon />} iconPosition="start" label="Advances" />
          <Tab icon={<AdjustmentIcon />} iconPosition="start" label="Adjustments" />
          <Tab icon={<SettingsIcon />} iconPosition="start" label="Settings" />
        </Tabs>
      </Header>

      <Content>
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard>
                <SummaryCardContent>
                  <SummaryTitle>Total Payroll</SummaryTitle>
                  <SummaryValue>
                    {loadingSummary ? '...' : formatCurrency(summary?.totalPayroll || 0)}
                  </SummaryValue>
                </SummaryCardContent>
              </SummaryCard>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard>
                <SummaryCardContent>
                  <SummaryTitle>Pending Payments</SummaryTitle>
                  <SummaryValue>
                    {loadingSummary ? '...' : formatCurrency(summary?.totalPending || 0)}
                  </SummaryValue>
                  <SummarySubtext>{summary?.pendingCount || 0} pending</SummarySubtext>
                </SummaryCardContent>
              </SummaryCard>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard>
                <SummaryCardContent>
                  <SummaryTitle>Active Advances</SummaryTitle>
                  <SummaryValue>
                    {loadingSummary ? '...' : formatCurrency(summary?.totalAdvances || 0)}
                  </SummaryValue>
                </SummaryCardContent>
              </SummaryCard>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard>
                <SummaryCardContent>
                  <SummaryTitle>Employees</SummaryTitle>
                  <SummaryValue>{loadingSummary ? '...' : summary?.employeeCount || 0}</SummaryValue>
                </SummaryCardContent>
              </SummaryCard>
            </Grid>
          </Grid>
          <Box marginTop={3}>
            <Typography variant="h6" style={{ marginBottom: 16, color: theme.TEXT_PRIMARY }}>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => setActiveTab(1)}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <PlansIcon style={{ fontSize: 32, color: theme.ACCENT }} />
                    <Box>
                      <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                        Create Payroll Plan
                      </Typography>
                      <Typography variant="caption" style={{ color: theme.TEXT_SECONDARY }}>
                        Set up salary structure
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => setActiveTab(2)}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <GenerateIcon style={{ fontSize: 32, color: theme.ACCENT }} />
                    <Box>
                      <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                        Generate Payroll
                      </Typography>
                      <Typography variant="caption" style={{ color: theme.TEXT_SECONDARY }}>
                        Calculate monthly salaries
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => setActiveTab(3)}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <PaymentIcon style={{ fontSize: 32, color: theme.ACCENT }} />
                    <Box>
                      <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                        Process Payments
                      </Typography>
                      <Typography variant="caption" style={{ color: theme.TEXT_SECONDARY }}>
                        Pay employee salaries
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <PayrollPlansList />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <PayrollGenerationManager />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <PayrollPaymentsList />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <PayrollHistoryList />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <PayrollAnalyticsDashboard />
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <PayrollAdvancesList />
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          <PayrollAdjustmentsList />
        </TabPanel>

        <TabPanel value={activeTab} index={8}>
          <PayrollSettingsForm />
        </TabPanel>
      </Content>
    </PageContainer>
  );
};

export default PayrollDashboard;

