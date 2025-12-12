import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollSummary } from '../../../../types/payroll';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  Pending as PendingIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 16px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  min-height: 100%;
`;

const Header = styled.div`
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 8px 0;
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
  padding: 20px !important;
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
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 4px;
`;

const SummarySubtext = styled(Typography)`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const IconContainer = styled.div<{ color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ color }) => `${color}15`};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  
  svg {
    color: ${({ color }) => color};
    font-size: 24px;
  }
`;

const PayrollAnalyticsDashboard: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadSummary();
    }
  }, [user?.school_id]);

  const loadSummary = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const data = await payrollService.getPayrollSummary(user.school_id);
      setSummary(data);
    } catch (error: any) {
      console.error('Error loading summary:', error);
      showToast('Failed to load payroll analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Loader />
      </PageContainer>
    );
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <PageContainer>
      <Header>
        <Title>Payroll Analytics</Title>
      </Header>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <SummaryCardContent>
              <IconContainer color="#3b82f6">
                <AccountBalanceIcon />
              </IconContainer>
              <SummaryTitle>Total Payroll</SummaryTitle>
              <SummaryValue>{formatCurrency(summary?.totalPayroll || 0)}</SummaryValue>
              <SummarySubtext>All time payroll cost</SummarySubtext>
            </SummaryCardContent>
          </SummaryCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <SummaryCardContent>
              <IconContainer color="#10b981">
                <PaymentIcon />
              </IconContainer>
              <SummaryTitle>Total Paid</SummaryTitle>
              <SummaryValue>{formatCurrency(summary?.totalPaid || 0)}</SummaryValue>
              <SummarySubtext>{summary?.paidCount || 0} payments completed</SummarySubtext>
            </SummaryCardContent>
          </SummaryCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <SummaryCardContent>
              <IconContainer color="#f59e0b">
                <PendingIcon />
              </IconContainer>
              <SummaryTitle>Pending Payments</SummaryTitle>
              <SummaryValue>{formatCurrency(summary?.totalPending || 0)}</SummaryValue>
              <SummarySubtext>{summary?.pendingCount || 0} payments pending</SummarySubtext>
            </SummaryCardContent>
          </SummaryCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <SummaryCardContent>
              <IconContainer color="#8b5cf6">
                <PeopleIcon />
              </IconContainer>
              <SummaryTitle>Employees</SummaryTitle>
              <SummaryValue>{summary?.employeeCount || 0}</SummaryValue>
              <SummarySubtext>Total employees in payroll</SummarySubtext>
            </SummaryCardContent>
          </SummaryCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <SummaryCardContent>
              <IconContainer color="#ef4444">
                <AccountBalanceIcon />
              </IconContainer>
              <SummaryTitle>Active Advances</SummaryTitle>
              <SummaryValue>{formatCurrency(summary?.totalAdvances || 0)}</SummaryValue>
              <SummarySubtext>Outstanding advance balance</SummarySubtext>
            </SummaryCardContent>
          </SummaryCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <SummaryCardContent>
              <IconContainer color="#06b6d4">
                <PaymentIcon />
              </IconContainer>
              <SummaryTitle>Adjustments</SummaryTitle>
              <SummaryValue>{formatCurrency(summary?.totalAdjustments || 0)}</SummaryValue>
              <SummarySubtext>Bonuses and fines pending</SummarySubtext>
            </SummaryCardContent>
          </SummaryCard>
        </Grid>
      </Grid>

      <Box marginTop={3} padding={3} textAlign="center" color={theme.TEXT_SECONDARY}>
        <Typography variant="body2">
          Detailed charts and reports will be available here
        </Typography>
      </Box>
    </PageContainer>
  );
};

export default PayrollAnalyticsDashboard;

