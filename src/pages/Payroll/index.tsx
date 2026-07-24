import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, lightTheme, darkTheme } from '../../contexts/ThemeContext';
import { PayrollDisplaySettingsProvider } from './PayrollDisplaySettingsContext';
import PayrollGenerator from './components/PayrollGenerator';
import PayrollPaymentLedger from './components/PayrollPaymentLedger';
import PaymentHistoryList from './components/PaymentHistoryList';
import MonthlyAdjustmentsList from './components/MonthlyAdjustmentsList';
import SalaryProfilesList from './components/SalaryProfilesList';
import AdvanceLoansList from './components/AdvanceLoansList';
import PayrollSettings from './components/PayrollSettings';
import {
  Calculate as GenerateIcon,
  Payment as LedgerIcon,
  History as HistoryIcon,
  Tune as AdjustIcon,
  AttachMoney as DirectoryIcon,
  AccountBalanceWallet as LoanIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const PayrollContainer = styled.div<{ theme: any }>`
  min-height: calc(100vh - 80px);
  padding: 1.5rem;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const HeaderSection = styled.div`
  margin-bottom: 1.5rem;

  h1 {
    font-size: 1.6rem;
    font-weight: 800;
    margin: 0 0 0.25rem 0;
  }

  p {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    margin: 0;
  }
`;

const TabContainer = styled.div<{ theme: any }>`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  padding-bottom: 0.5rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ active: boolean; theme: any }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.15rem;
  border-radius: 10px;
  border: none;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ active, theme }) =>
    active ? theme.ACCENT : 'transparent'};
  color: ${({ active, theme }) => (active ? 'white' : theme.TEXT_SECONDARY)};

  &:hover {
    background: ${({ active, theme }) =>
      active ? theme.ACCENT : `${theme.ACCENT}15`};
    color: ${({ active, theme }) => (active ? 'white' : theme.ACCENT)};
  }
`;

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
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 0, label: 'Monthly Payroll Generation', icon: GenerateIcon },
    { id: 1, label: 'Disburse Salary', icon: LedgerIcon },
    { id: 2, label: 'Payment History', icon: HistoryIcon },
    { id: 3, label: 'Monthly Adjustments', icon: AdjustIcon },
    { id: 4, label: 'Base Salary Directory', icon: DirectoryIcon },
    { id: 5, label: 'Advances & Loans', icon: LoanIcon },
    { id: 6, label: 'Payroll Settings', icon: SettingsIcon },
  ];

  return (
    <PayrollDisplaySettingsProvider>
      <PayrollContainer theme={theme}>
        <HeaderSection theme={theme}>
          <h1>Professional Salary & Payroll System</h1>
          <p>Attendance-driven monthly salary calculation, payment history tracking, one-time adjustments, and official printable payslips</p>
        </HeaderSection>

        <TabContainer theme={theme}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                theme={theme}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon style={{ fontSize: 18 }} />
                {tab.label}
              </TabButton>
            );
          })}
        </TabContainer>

        <TabPanel value={activeTab} index={0}>
          <PayrollGenerator />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <PayrollPaymentLedger />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <PaymentHistoryList />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <MonthlyAdjustmentsList />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <SalaryProfilesList />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <AdvanceLoansList />
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <PayrollSettings />
        </TabPanel>
      </PayrollContainer>
    </PayrollDisplaySettingsProvider>
  );
};

export default PayrollDashboard;
