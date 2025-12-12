import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext, darkTheme, lightTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
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
import {
  PayrollContainer,
  TabContainer,
  TabsWrapper,
  TabButton,
  StatsGrid,
  StatCard,
  StatCardHeader,
  StatCardIcon,
  StatCardTitle,
  StatCardValue,
  StatCardSubtext,
  ContentCard,
  ContentCardHeader,
  ContentCardTitle,
} from './styles';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <div>{children}</div>}
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

  const tabs = [
    { id: 0, label: 'Dashboard', icon: DashboardIcon },
    { id: 1, label: 'Payroll Plans', icon: PlansIcon },
    { id: 2, label: 'Generate Payroll', icon: GenerateIcon },
    { id: 3, label: 'Payments', icon: PaymentIcon },
    { id: 4, label: 'History', icon: HistoryIcon },
    { id: 5, label: 'Analytics', icon: AnalyticsIcon },
    { id: 6, label: 'Advances', icon: AdvanceIcon },
    { id: 7, label: 'Adjustments', icon: AdjustmentIcon },
    { id: 8, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <PayrollContainer>
      <TabContainer>
        <TabsWrapper>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon />
                {tab.label}
              </TabButton>
            );
          })}
        </TabsWrapper>
      </TabContainer>

      <TabPanel value={activeTab} index={0}>
        <StatsGrid>
          <StatCard accentColor="#3b82f6">
            <StatCardHeader>
              <StatCardTitle>Total Payroll</StatCardTitle>
              <StatCardIcon color="#3b82f6">
                <DashboardIcon />
              </StatCardIcon>
            </StatCardHeader>
            <StatCardValue>
              {loadingSummary ? '...' : formatCurrency(summary?.totalPayroll || 0)}
            </StatCardValue>
          </StatCard>

          <StatCard accentColor="#f59e0b">
            <StatCardHeader>
              <StatCardTitle>Pending Payments</StatCardTitle>
              <StatCardIcon color="#f59e0b">
                <PaymentIcon />
              </StatCardIcon>
            </StatCardHeader>
            <StatCardValue>
              {loadingSummary ? '...' : formatCurrency(summary?.totalPending || 0)}
            </StatCardValue>
            <StatCardSubtext>{summary?.pendingCount || 0} pending</StatCardSubtext>
          </StatCard>

          <StatCard accentColor="#8b5cf6">
            <StatCardHeader>
              <StatCardTitle>Active Advances</StatCardTitle>
              <StatCardIcon color="#8b5cf6">
                <AdvanceIcon />
              </StatCardIcon>
            </StatCardHeader>
            <StatCardValue>
              {loadingSummary ? '...' : formatCurrency(summary?.totalAdvances || 0)}
            </StatCardValue>
          </StatCard>

          <StatCard accentColor="#10b981">
            <StatCardHeader>
              <StatCardTitle>Employees</StatCardTitle>
              <StatCardIcon color="#10b981">
                <DashboardIcon />
              </StatCardIcon>
            </StatCardHeader>
            <StatCardValue>{loadingSummary ? '...' : summary?.employeeCount || 0}</StatCardValue>
          </StatCard>
        </StatsGrid>

        <ContentCard>
          <ContentCardHeader>
            <ContentCardTitle>Quick Actions</ContentCardTitle>
          </ContentCardHeader>
          <StatsGrid>
            <StatCard 
              accentColor="#6366f1"
              onClick={() => setActiveTab(1)}
              style={{ cursor: 'pointer' }}
            >
              <StatCardHeader>
                <StatCardTitle>Create Payroll Plan</StatCardTitle>
                <StatCardIcon color="#6366f1">
                  <PlansIcon />
                </StatCardIcon>
              </StatCardHeader>
              <StatCardSubtext>Set up salary structure</StatCardSubtext>
            </StatCard>

            <StatCard 
              accentColor="#6366f1"
              onClick={() => setActiveTab(2)}
              style={{ cursor: 'pointer' }}
            >
              <StatCardHeader>
                <StatCardTitle>Generate Payroll</StatCardTitle>
                <StatCardIcon color="#6366f1">
                  <GenerateIcon />
                </StatCardIcon>
              </StatCardHeader>
              <StatCardSubtext>Calculate monthly salaries</StatCardSubtext>
            </StatCard>

            <StatCard 
              accentColor="#6366f1"
              onClick={() => setActiveTab(3)}
              style={{ cursor: 'pointer' }}
            >
              <StatCardHeader>
                <StatCardTitle>Process Payments</StatCardTitle>
                <StatCardIcon color="#6366f1">
                  <PaymentIcon />
                </StatCardIcon>
              </StatCardHeader>
              <StatCardSubtext>Pay employee salaries</StatCardSubtext>
            </StatCard>
          </StatsGrid>
        </ContentCard>
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
    </PayrollContainer>
  );
};

export default PayrollDashboard;
