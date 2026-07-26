import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { useTheme } from '../../components/Layout/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../contexts/ThemeContext';
import { isDark } from '../../styles/DesignSystem';
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
  Assessment as AnalyticsIcon,
} from '@mui/icons-material';
import PayrollAnalyticsTab from './components/PayrollAnalyticsTab';

const PayrollContainer = styled.div<{ theme: any }>`
  min-height: calc(100vh - 80px);
  padding: 1rem;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};

  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
  }
`;

const HeaderSection = styled.div<{ theme: any }>`
  margin-bottom: 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title-group {
    h1 {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0 0 0.15rem 0;

      @media (max-width: 768px) {
        font-size: 1.15rem;
      }
    }

    p {
      font-size: 0.8rem;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
      margin: 0;

      @media (max-width: 768px) {
        font-size: 0.73rem;
      }
    }
  }
`;

const TabContainer = styled.div<{ theme: any }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1rem;
  padding: 0.35rem;
  border-radius: 14px;
  background: ${({ theme }) =>
    isDark(theme)
      ? 'rgba(0, 0, 0, 0.25)'
      : 'rgba(255, 255, 255, 0.6)'};
  border: 1.5px solid ${({ theme }) =>
    isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.8)'};
  box-shadow: ${({ theme }) =>
    isDark(theme)
      ? 'inset 0 2px 4px rgba(0, 0, 0, 0.4)'
      : 'inset 0 2px 4px rgba(15, 23, 42, 0.03)'};
  backdrop-filter: blur(12px);
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 0.3rem;
    -webkit-overflow-scrolling: touch;
    
    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const TabButton = styled.button<{ active: boolean; theme: any; $iconOnly?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: ${({ $iconOnly }) => ($iconOnly ? '0.5rem' : '0.5rem 0.9rem')};
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  ${({ active, theme }) => {
    const dark = isDark(theme);
    const accent = theme.ACCENT || '#3b82f6';
    if (active) {
      return css`
        background: linear-gradient(135deg, ${accent} 0%, #2563eb 100%);
        color: #ffffff;
        border: 1px solid transparent;
        box-shadow: ${dark
          ? '0 4px 14px rgba(37, 99, 235, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.25)'
          : '0 4px 14px rgba(37, 99, 235, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.45)'};
      `;
    }
    return css`
      background: ${dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)'};
      color: ${theme.TEXT_SECONDARY};
      border: 1px solid ${dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.6)'};
      box-shadow: ${dark
        ? 'inset 0 1px 0 rgba(255, 255, 255, 0.04)'
        : '0 1px 3px rgba(0, 0, 0, 0.02), inset 0 1px 1px rgba(255, 255, 255, 0.8)'};

      &:hover {
        background: ${dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)'};
        color: ${theme.ACCENT};
        border-color: ${accent}44;
        transform: translateY(-1px);
      }
    `;
  }}

  @media (max-width: 768px) {
    padding: ${({ $iconOnly }) => ($iconOnly ? '0.45rem' : '0.45rem 0.75rem')};
    font-size: 0.76rem;
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
  const { theme: themeMode } = useTheme();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 0, label: 'Payroll Analytics', icon: AnalyticsIcon },
    { id: 1, label: 'Monthly Payroll Generation', icon: GenerateIcon },
    { id: 2, label: 'Disburse Salary', icon: LedgerIcon },
    { id: 3, label: 'Payment History', icon: HistoryIcon },
    { id: 4, label: 'Monthly Adjustments', icon: AdjustIcon },
    { id: 5, label: 'Base Salary Directory', icon: DirectoryIcon },
    { id: 6, label: 'Advances & Loans', icon: LoanIcon },
    { id: 7, label: 'Settings', icon: SettingsIcon, iconOnly: true },
  ];

  return (
    <PayrollDisplaySettingsProvider>
      <PayrollContainer theme={theme}>
        <HeaderSection theme={theme}>
          <div className="title-group">
            <h1>Professional Salary & Payroll System</h1>
            <p>Attendance-driven monthly salary calculation, payment history tracking, one-time adjustments, and official printable payslips</p>
          </div>
        </HeaderSection>

        <TabContainer theme={theme}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                $iconOnly={tab.iconOnly}
                title={tab.iconOnly ? tab.label : undefined}
                theme={theme}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon style={{ fontSize: 18 }} />
                {!tab.iconOnly && tab.label}
              </TabButton>
            );
          })}
        </TabContainer>

        <TabPanel value={activeTab} index={0}>
          <PayrollAnalyticsTab />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <PayrollGenerator />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <PayrollPaymentLedger />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <PaymentHistoryList />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <MonthlyAdjustmentsList />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <SalaryProfilesList />
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <AdvanceLoansList />
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          <PayrollSettings />
        </TabPanel>
      </PayrollContainer>
    </PayrollDisplaySettingsProvider>
  );
};

export default PayrollDashboard;
