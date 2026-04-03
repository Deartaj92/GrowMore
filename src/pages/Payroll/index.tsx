import React, { useState } from 'react';
import {
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
import { PayrollDisplaySettingsProvider } from './PayrollDisplaySettingsContext';
import {
  PayrollContainer,
  TabContainer,
  TabsWrapper,
  TabButton,
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
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 0, label: 'Analytics', icon: AnalyticsIcon },
    { id: 1, label: 'Payroll Plans', icon: PlansIcon },
    { id: 2, label: 'Generate Payroll', icon: GenerateIcon },
    { id: 3, label: 'Payments', icon: PaymentIcon },
    { id: 4, label: 'History', icon: HistoryIcon },
    { id: 5, label: 'Advances', icon: AdvanceIcon },
    { id: 6, label: 'Adjustments', icon: AdjustmentIcon },
    { id: 7, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <PayrollDisplaySettingsProvider>
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
          <PayrollAnalyticsDashboard />
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
          <PayrollAdvancesList />
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <PayrollAdjustmentsList />
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          <PayrollSettingsForm />
        </TabPanel>
      </PayrollContainer>
    </PayrollDisplaySettingsProvider>
  );
};

export default PayrollDashboard;
