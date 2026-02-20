import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../components/Layout';
import { AccountBalance, Assessment, TrendingUp, BarChart } from '@mui/icons-material';
import Loader from '../../components/Loader';
import AssetsTab from './components/AssetsTab/AssetsTab';
import LiabilitiesTab from './components/LiabilitiesTab/LiabilitiesTab';
import BalanceSheetView from './components/BalanceSheetTab/BalanceSheetView';
import AssetsLiabilitiesAnalytics from './components/AnalyticsTab/AssetsLiabilitiesAnalytics';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    padding-bottom: 2rem;
    gap: 0.2rem;
  }
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
  margin-bottom: 0.25rem;
  gap: 1rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    margin-bottom: 0.2rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  overflow-x: auto;
  flex: 1;
  justify-content: flex-end;
  
  @media (max-width: 768px) {
    gap: 0.375rem;
    width: 100%;
    order: 2;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: ${({ $active, theme }) => $active
    ? theme.ACCENT
    : isDark(theme)
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ $active, theme }) => $active
    ? '#ffffff'
    : theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    background: ${({ $active, theme }) => $active
      ? theme.ACCENT
      : isDark(theme)
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.08)'};
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;

// ===== MAIN COMPONENT =====

type TabType = 'assets' | 'liabilities' | 'balanceSheet' | 'analytics';

const AssetsLiabilitiesManager: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const [activeTab, setActiveTab] = useState<TabType>('assets');
  const [isLoading, setIsLoading] = useState(false);

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'assets', label: 'Assets', icon: <AccountBalance /> },
    { id: 'liabilities', label: 'Liabilities', icon: <TrendingUp /> },
    { id: 'balanceSheet', label: 'Balance Sheet', icon: <BarChart /> },
    { id: 'analytics', label: 'Analytics', icon: <Assessment /> },
  ];

  return (
    <PageContainer theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          <AccountBalance />
          Assets & Liabilities Management
        </HeaderTitle>
        <TabsContainer>
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              theme={theme}
              $active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </TabButton>
          ))}
        </TabsContainer>
      </Header>

      <ContentContainer>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            {activeTab === 'assets' && <AssetsTab />}
            {activeTab === 'liabilities' && <LiabilitiesTab />}
            {activeTab === 'balanceSheet' && <BalanceSheetView />}
            {activeTab === 'analytics' && <AssetsLiabilitiesAnalytics />}
          </>
        )}
      </ContentContainer>
    </PageContainer>
  );
};

export default AssetsLiabilitiesManager;





