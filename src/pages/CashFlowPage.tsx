import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { useLoading } from '../contexts/LoadingContext';
import Loader from '../components/Loader';
import { fetchAccountsData, CashFlowData, AccountsData } from './Dashboard/services/accountsService';
import CashFlowComponent from './Dashboard/components/AccountsTab/CashFlowComponent';
import {
  AccountBalance as AccountBalanceIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525' || themeObj.BG === '#181c2a';

// Styled Components
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
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const DateInput = styled.input`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.ACCENT}20`};
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
  }
`;

const DateRangeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    gap: 0.375rem;
  }
`;

const DateLabel = styled.label`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const RefreshButton = styled.button`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)'};
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  outline: none;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const CashFlowPage: React.FC = () => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  
  const [loading, setLocalLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (user?.school_id) {
      loadCashFlowData();
    }
  }, [user?.school_id, dateFrom, dateTo]);

  const loadCashFlowData = async () => {
    if (!user?.school_id) return;
    
    setLocalLoading(true);
    setLoading(true);
    
    try {
      // Create a temporary state to hold accounts data
      let accountsDataResult: AccountsData | null = null;
      
      // fetchAccountsData uses callbacks, so we need to provide them
      await fetchAccountsData(
        String(user.school_id),
        dateFrom,
        dateTo,
        (data: AccountsData) => {
          accountsDataResult = data;
        },
        (loading: boolean) => {
          // Sync loading state with the function's loading state
          setLocalLoading(loading);
          setLoading(loading);
        },
        async () => {
          // getCachedSession - return null for standalone page
          return null;
        }
      );
      
      // Type guard to ensure accountsDataResult is not null and has cashFlow
      // Use type assertion to help TypeScript understand the type
      const result = accountsDataResult as AccountsData | null;
      if (result && result.cashFlow) {
        setCashFlowData(result.cashFlow);
      }
    } catch (error) {
      console.error('Error loading cash flow data:', error);
      showToast('Failed to load cash flow data', 'error');
      setLocalLoading(false);
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCashFlowData();
    showToast('Cash flow data refreshed', 'success');
  };

  return (
    <ThemeProvider theme={theme}>
      <PageContainer theme={theme}>
        <Header theme={theme}>
          <HeaderTitle theme={theme}>
            <AccountBalanceIcon />
            Cash Flow Statement
          </HeaderTitle>
          <HeaderActions theme={theme}>
            <DateRangeContainer>
              <DateLabel theme={theme}>
                <CalendarIcon style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                From:
              </DateLabel>
              <DateInput
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                theme={theme}
              />
              <DateLabel theme={theme}>To:</DateLabel>
              <DateInput
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                theme={theme}
              />
            </DateRangeContainer>
            <RefreshButton
              onClick={handleRefresh}
              disabled={loading}
              theme={theme}
            >
              <RefreshIcon style={{ fontSize: '1rem' }} />
              Refresh
            </RefreshButton>
          </HeaderActions>
        </Header>

        <ContentContainer>
          {loading ? (
            <Loader />
          ) : (
            <CashFlowComponent cashFlow={cashFlowData} loading={false} />
          )}
        </ContentContainer>
      </PageContainer>
    </ThemeProvider>
  );
};

export default CashFlowPage;
