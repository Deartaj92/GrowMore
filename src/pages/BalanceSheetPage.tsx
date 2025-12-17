import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { useLoading } from '../contexts/LoadingContext';
import Loader from '../components/Loader';
import { incomeService } from '../services/incomeService';
import {
  AccountBalance as AccountBalanceIcon,
  AttachMoney as CashIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalanceWallet as WalletIcon,
  CalendarToday as CalendarIcon,
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
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => isDark(theme)
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.05)'};
  }
  
  &::-webkit-calendar-picker-indicator {
    cursor: pointer;
    filter: ${({ theme }) => isDark(theme) ? 'invert(1)' : 'none'};
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
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
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
  
  svg {
    font-size: 1rem;
  }
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.ACCENT};
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
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
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: ${({ theme }) => isDark(theme)
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
`;

const TableRow = styled.tr<{ $isTotal?: boolean }>`
  border-bottom: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  
  ${({ $isTotal, theme }) => $isTotal && `
    background: ${isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'};
    font-weight: 700;
    border-top: 2px solid ${theme.ACCENT};
    border-bottom: 2px solid ${theme.ACCENT};
  `}
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  &:last-child {
    text-align: right;
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  &:last-child {
    text-align: right;
  }
`;

const AccountNameCell = styled(TableCell)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    font-size: 1.25rem;
    color: ${({ theme }) => theme.ACCENT};
    flex-shrink: 0;
  }
`;

const AccountInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const AccountTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
`;

const AccountType = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const BalanceChip = styled.span<{ $positive: boolean }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${({ $positive }) => $positive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
  border: 1px solid ${({ $positive }) => $positive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

interface AccountBalance {
  id: number;
  name: string;
  type: string;
  displayName: string;
  income: number;
  expenses: number;
  balance: number;
}

const BalanceSheetPage: React.FC = () => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  
  const [loading, setLocalLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountTypes, setAccountTypes] = useState<any[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [cashInHand, setCashInHand] = useState({ income: 0, expenses: 0, balance: 0 });
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (user?.school_id) {
      loadBalanceSheet();
    }
  }, [user?.school_id, selectedDate]);

  // Helper function to fetch all rows with pagination
  const fetchAllRows = async <T,>(
    queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
  ): Promise<T[]> => {
    const allResults: T[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await queryFn(from, from + pageSize - 1);
      if (error) throw error;

      if (data && data.length > 0) {
        allResults.push(...data);
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return allResults;
  };

  const loadBalanceSheet = async () => {
    if (!user?.school_id) return;
    
    try {
      setLocalLoading(true);
      
      // Fetch accounts and account types
      const [accountsData, accountTypesData] = await Promise.all([
        supabase.from('accounts').select('*').eq('school_id', user.school_id).eq('is_active', true).order('name'),
        supabase.from('account_types').select('*').or(`school_id.eq.1,school_id.eq.${user.school_id}`).eq('is_active', true).order('display_name'),
      ]);

      if (accountsData.data) setAccounts(accountsData.data);
      if (accountTypesData.data) {
        // Deduplicate account types
        const uniqueTypes = new Map();
        accountTypesData.data.forEach((type: any) => {
          if (!uniqueTypes.has(type.name) || type.school_id === 1) {
            uniqueTypes.set(type.name, type);
          }
        });
        const sortedTypes = Array.from(uniqueTypes.values()).sort((a, b) => {
          if (a.name === 'other' && b.name !== 'other') return 1;
          if (a.name !== 'other' && b.name === 'other') return -1;
          if (a.is_system_type && !b.is_system_type) return -1;
          if (!a.is_system_type && b.is_system_type) return 1;
          return a.display_name.localeCompare(b.display_name);
        });
        setAccountTypes(sortedTypes);
      }

      // Prepare date filter
      const endDate = selectedDate ? new Date(selectedDate) : new Date();
      endDate.setHours(23, 59, 59, 999);
      const dateFilter = endDate.toISOString().split('T')[0];

      // Fetch fee payments (income) with account_id, filtered by date - using pagination
      const feePayments = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('fee_payments')
          .select('account_id, amount, payment_mode, payment_date')
          .eq('school_id', user.school_id)
          .lte('payment_date', dateFilter)
          .range(from, to);
      });

      // Fetch expenses (outgoing) with account_id, filtered by date and status - using pagination
      // Only count paid expenses
      const expenses = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('expenses')
          .select('account_id, amount, payment_method, expense_date, status')
          .eq('school_id', user.school_id)
          .eq('status', 'paid')
          .lte('expense_date', dateFilter)
          .range(from, to);
      });

      // Fetch other incomes (non-fee income) with account_id, filtered by date and status - using pagination
      // Only count received incomes (pending incomes are not yet received)
      const otherIncomes = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('other_incomes')
          .select('account_id, amount, payment_method, income_date, status')
          .eq('school_id', user.school_id)
          .lte('income_date', dateFilter)
          .eq('status', 'received')
          .range(from, to);
      });

      // Calculate balances for each account
      const balances: AccountBalance[] = accountsData.data?.map((account: any) => {
        const accountType = accountTypesData.data?.find((t: any) => t.name === account.type);
        const displayName = accountType?.display_name || account.type;
        
        // Calculate income from fee payments
        const feeIncome = feePayments
          .filter(p => p.account_id === account.id)
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        
        // Calculate income from other incomes (where payment_method is 'account' and account_id matches)
        const otherIncome = otherIncomes
          .filter(oi => oi.payment_method === 'account' && oi.account_id === account.id)
          .reduce((sum, oi) => sum + parseFloat(oi.amount || 0), 0);
        
        const income = feeIncome + otherIncome;
        
        // Calculate expenses
        const expensesAmount = expenses
          .filter(e => e.account_id === account.id)
          .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        
        const balance = income - expensesAmount;
        
        return {
          id: account.id,
          name: account.name,
          type: account.type,
          displayName,
          income,
          expenses: expensesAmount,
          balance
        };
      }) || [];

      // Calculate Cash in Hand
      // Cash income: fee payments where payment_mode is 'Cash' and no account_id
      const cashFeeIncome = feePayments
        .filter(p => p.payment_mode === 'Cash' && !p.account_id)
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      
      // Cash income from other incomes: where payment_method is 'cash' or 'cheque' and no account_id
      const cashOtherIncome = otherIncomes
        .filter(oi => (oi.payment_method === 'cash' || oi.payment_method === 'cheque') && !oi.account_id)
        .reduce((sum, oi) => sum + parseFloat(oi.amount || 0), 0);
      
      const cashIncome = cashFeeIncome + cashOtherIncome;
      
      // Cash expenses: expenses where payment_method is 'cash' and no account_id
      const cashExpenses = expenses
        .filter(e => e.payment_method === 'cash' && !e.account_id)
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      
      const cashBalance = cashIncome - cashExpenses;
      
      setCashInHand({
        income: cashIncome,
        expenses: cashExpenses,
        balance: cashBalance
      });

      // Calculate totals
      const totalInc = balances.reduce((sum, b) => sum + b.income, 0) + cashIncome;
      const totalExp = balances.reduce((sum, b) => sum + b.expenses, 0) + cashExpenses;
      const totalBal = totalInc - totalExp;

      setAccountBalances(balances);
      setTotalIncome(totalInc);
      setTotalExpenses(totalExp);
      setTotalBalance(totalBal);
    } catch (error: any) {
      showToast('Error loading balance sheet: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLocalLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs.');
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        <Header>
          <HeaderTitle>
            <AccountBalanceIcon />
            Balance Sheet
          </HeaderTitle>
          <HeaderActions>
            <DateInput
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </HeaderActions>
        </Header>

        <StatsGrid>
          <StatCard>
            <StatLabel>
              <IncomeIcon />
              Total Income
            </StatLabel>
            <StatValue $color="#22c55e">
              {formatCurrency(totalIncome)}
            </StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>
              <ExpenseIcon />
              Total Expenses
            </StatLabel>
            <StatValue $color="#ef4444">
              {formatCurrency(totalExpenses)}
            </StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>
              <AccountBalanceIcon />
              Net Balance
            </StatLabel>
            <StatValue $color={totalBalance >= 0 ? '#22c55e' : '#ef4444'}>
              {formatCurrency(totalBalance)}
            </StatValue>
          </StatCard>
        </StatsGrid>

        <ContentCard>
          <CardTitle>
            <AccountBalanceIcon />
            Account Balances
          </CardTitle>
          {accountBalances.length > 0 || cashInHand.balance !== 0 || cashInHand.income > 0 || cashInHand.expenses > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Account</TableHeaderCell>
                  <TableHeaderCell>Income</TableHeaderCell>
                  <TableHeaderCell>Expenses</TableHeaderCell>
                  <TableHeaderCell>Balance</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {/* Cash in Hand Row */}
                <TableRow>
                  <AccountNameCell>
                    <CashIcon />
                    <AccountInfo>
                      <AccountTitle>Cash in Hand</AccountTitle>
                    </AccountInfo>
                  </AccountNameCell>
                  <TableCell style={{ color: '#22c55e', fontWeight: 500 }}>
                    {formatCurrency(cashInHand.income)}
                  </TableCell>
                  <TableCell style={{ color: '#ef4444', fontWeight: 500 }}>
                    {formatCurrency(cashInHand.expenses)}
                  </TableCell>
                  <TableCell>
                    <BalanceChip $positive={cashInHand.balance >= 0}>
                      {formatCurrency(cashInHand.balance)}
                    </BalanceChip>
                  </TableCell>
                </TableRow>

                {/* Account Rows */}
                {accountBalances.map((account) => (
                  <TableRow key={account.id}>
                    <AccountNameCell>
                      <WalletIcon />
                      <AccountInfo>
                        <AccountTitle>{account.name}</AccountTitle>
                        <AccountType>{account.displayName}</AccountType>
                      </AccountInfo>
                    </AccountNameCell>
                    <TableCell style={{ color: '#22c55e', fontWeight: 500 }}>
                      {formatCurrency(account.income)}
                    </TableCell>
                    <TableCell style={{ color: '#ef4444', fontWeight: 500 }}>
                      {formatCurrency(account.expenses)}
                    </TableCell>
                    <TableCell>
                      <BalanceChip $positive={account.balance >= 0}>
                        {formatCurrency(account.balance)}
                      </BalanceChip>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Grand Total Row (including cash) */}
                {(accountBalances.length > 0 || cashInHand.income > 0 || cashInHand.expenses > 0) && (
                  <TableRow $isTotal>
                    <TableCell style={{ fontWeight: 700, fontSize: '1rem' }}>
                      Grand Total
                    </TableCell>
                    <TableCell style={{ color: '#22c55e', fontWeight: 700, fontSize: '1rem' }}>
                      {formatCurrency(totalIncome)}
                    </TableCell>
                    <TableCell style={{ color: '#ef4444', fontWeight: 700, fontSize: '1rem' }}>
                      {formatCurrency(totalExpenses)}
                    </TableCell>
                    <TableCell>
                      <BalanceChip $positive={totalBalance >= 0} style={{ fontSize: '0.95rem', padding: '0.35rem 0.85rem' }}>
                        {formatCurrency(totalBalance)}
                      </BalanceChip>
                    </TableCell>
                  </TableRow>
                )}
              </tbody>
            </Table>
          ) : (
            <EmptyState>
              <p>No accounts found</p>
            </EmptyState>
          )}
        </ContentCard>
      </PageContainer>
    </ThemeProvider>
  );
};

export default BalanceSheetPage;



