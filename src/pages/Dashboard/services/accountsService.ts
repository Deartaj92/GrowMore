import { supabase } from '../../../supabaseClient';
import { USE_DUMMY_DATA } from '../constants';
import { format, startOfMonth, endOfMonth, parseISO, startOfYear } from 'date-fns';
import { balanceSheetService } from '../../AssetsLiabilities/services/balanceSheetService';
import { BalanceSheet } from '../../../types/liability';

export interface AccountsSummary {
  income: number;
  expenses: number;
  profitLoss: number;
  cash: number;
}

export interface CashAccount {
  name: string;
  balance: number;
}

export interface MonthlyIncomeExpense {
  month: string;
  income: number;
  expenses: number;
}

export interface AccountBalance {
  id: number;
  name: string;
  type: string;
  displayName: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface BalanceSheetData {
  accounts: AccountBalance[];
  cashInHand: {
    income: number;
    expenses: number;
    balance: number;
  };
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
}

export interface AssetsLiabilitiesData {
  assets: {
    total: number;
    byCategory: Array<{
      categoryId: number;
      categoryName: string;
      total: number;
      color: string;
    }>;
  };
  liabilities: {
    total: number;
    byCategory: Array<{
      categoryId: number;
      categoryName: string;
      total: number;
      color: string;
    }>;
  };
  netWorth: number;
}

export interface AccountsData {
  summary: AccountsSummary;
  cashAccounts: CashAccount[];
  incomeVsExpenses: {
    income: number;
    expenses: number;
  };
  monthlyData: MonthlyIncomeExpense[];
  balanceSheet: BalanceSheetData | null;
  assetsLiabilities: AssetsLiabilitiesData | null;
}

export const fetchAccountsData = async (
  schoolId: string,
  dateFrom: string,
  dateTo: string,
  setAccountsData: (data: AccountsData) => void,
  setAccountsLoading: (loading: boolean) => void,
  getCachedSession: () => Promise<any>
): Promise<void> => {
  if (!schoolId || !dateFrom || !dateTo) return;

  setAccountsLoading(true);
  try {
    if (USE_DUMMY_DATA) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const dummyData: AccountsData = {
        summary: {
          income: 15000.00,
          expenses: 0.00,
          profitLoss: 15000.00,
          cash: -1725867
        },
        cashAccounts: [
          { name: 'Cash in hand', balance: 0 },
          { name: 'Cash at Bank', balance: 0 },
          { name: 'Petty Cash', balance: 3100 },
          { name: 'Jazz Cash', balance: 0 },
          { name: 'Easy paisa', balance: 2000 }
        ],
        incomeVsExpenses: {
          income: 15000,
          expenses: 0
        },
        monthlyData: [
          { month: 'Jan', income: 50000, expenses: 45000 },
          { month: 'Feb', income: 60000, expenses: 55000 },
          { month: 'Mar', income: 55000, expenses: 50000 },
          { month: 'Apr', income: 70000, expenses: 65000 },
          { month: 'May', income: 250000, expenses: 80000 },
          { month: 'Jun', income: 65000, expenses: 60000 },
          { month: 'Jul', income: 32200, expenses: 210300 },
          { month: 'Aug', income: 50000, expenses: 1050000 },
          { month: 'Sep', income: 60000, expenses: 55000 },
          { month: 'Oct', income: 55000, expenses: 50000 },
          { month: 'Nov', income: 45000, expenses: 48000 },
          { month: 'Dec', income: 15000, expenses: 0 }
        ],
        balanceSheet: {
          accounts: [
            { id: 1, name: 'Bank Account', type: 'bank', displayName: 'Bank Account', income: 500000, expenses: 200000, balance: 300000 },
            { id: 2, name: 'Savings Account', type: 'savings', displayName: 'Savings Account', income: 200000, expenses: 50000, balance: 150000 }
          ],
          cashInHand: { income: 100000, expenses: 50000, balance: 50000 },
          totalIncome: 800000,
          totalExpenses: 300000,
          totalBalance: 500000
        },
        assetsLiabilities: {
          assets: {
            total: 2000000,
            byCategory: [
              { categoryId: 1, categoryName: 'Technology', total: 500000, color: '#3b82f6' },
              { categoryId: 2, categoryName: 'Furniture', total: 300000, color: '#10b981' },
              { categoryId: 3, categoryName: 'Vehicles', total: 800000, color: '#f59e0b' },
              { categoryId: 4, categoryName: 'Infrastructure', total: 400000, color: '#ef4444' }
            ]
          },
          liabilities: {
            total: 500000,
            byCategory: [
              { categoryId: 1, categoryName: 'Loans', total: 300000, color: '#ef4444' },
              { categoryId: 2, categoryName: 'Leases', total: 200000, color: '#f59e0b' }
            ]
          },
          netWorth: 1500000
        }
      };
      setAccountsData(dummyData);
      setAccountsLoading(false);
      return;
    }

    const sessionData = await getCachedSession();
    
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
    
    // Fetch income (from fee payments in date range) - with pagination
    const feePayments = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('fee_payments')
        .select('amount, payment_mode, payment_date')
        .eq('school_id', schoolId)
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .range(from, to);
    });

    const income = feePayments.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);

    // Fetch expenses (from expenses table in date range) - with pagination
    const expensesData = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('expenses')
        .select('amount, payment_method, expense_date, status')
        .eq('school_id', schoolId)
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .eq('status', 'approved')
        .range(from, to);
    });

    const expenses = expensesData.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    // Calculate profit/loss
    const profitLoss = income - expenses;

    // Calculate cash accounts based on payment methods
    // Group by payment_mode from fee_payments and payment_method from expenses
    const cashAccountsMap = new Map<string, number>();

    // Initialize default cash accounts
    const defaultAccounts = [
      'Cash in hand',
      'Cash at Bank',
      'Petty Cash',
      'Jazz Cash',
      'Easy paisa'
    ];
    
    defaultAccounts.forEach(account => {
      cashAccountsMap.set(account, 0);
    });

    // Calculate cash from fee payments (income adds to cash)
    feePayments.forEach(payment => {
      const mode = payment.payment_mode?.toLowerCase() || '';
      let accountName = 'Cash in hand';
      
      if (mode.includes('bank') || mode.includes('transfer')) {
        accountName = 'Cash at Bank';
      } else if (mode.includes('jazz')) {
        accountName = 'Jazz Cash';
      } else if (mode.includes('easy') || mode.includes('paisa')) {
        accountName = 'Easy paisa';
      } else if (mode.includes('cash')) {
        accountName = 'Cash in hand';
      }

      const currentBalance = cashAccountsMap.get(accountName) || 0;
      cashAccountsMap.set(accountName, currentBalance + (Number(payment.amount) || 0));
    });

    // Calculate cash from expenses (expenses reduce cash)
    expensesData.forEach(expense => {
      const method = expense.payment_method?.toLowerCase() || '';
      let accountName = 'Cash in hand';
      
      if (method.includes('bank') || method === 'bank_transfer') {
        accountName = 'Cash at Bank';
      } else if (method.includes('jazz')) {
        accountName = 'Jazz Cash';
      } else if (method.includes('easy') || method.includes('paisa')) {
        accountName = 'Easy paisa';
      } else if (method === 'cash') {
        accountName = 'Cash in hand';
      }

      const currentBalance = cashAccountsMap.get(accountName) || 0;
      cashAccountsMap.set(accountName, currentBalance - (Number(expense.amount) || 0));
    });

    // Convert map to array
    const cashAccounts: CashAccount[] = defaultAccounts.map(name => ({
      name,
      balance: cashAccountsMap.get(name) || 0
    }));

    // Calculate total cash
    const cash = cashAccounts.reduce((sum, account) => sum + account.balance, 0);

    // Get all fee payments for the date range (already fetched above, reuse)
    const allFeePayments = feePayments;

    // Get all expenses for the date range (already fetched above, reuse)
    const allExpenses = expensesData;

    // Group by month for the date range
    const monthlyMap = new Map<string, { income: number; expenses: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get date range start and end
    const startDate = parseISO(dateFrom);
    const endDate = parseISO(dateTo);
    
    // Initialize months in the date range
    const currentMonth = new Date(startDate);
    while (currentMonth <= endDate) {
      const monthKey = `${monthNames[currentMonth.getMonth()]}-${currentMonth.getFullYear()}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: 0, expenses: 0 });
      }
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Aggregate fee payments by month
    allFeePayments.forEach(payment => {
      const paymentDate = parseISO(payment.payment_date);
      const monthKey = `${monthNames[paymentDate.getMonth()]}-${paymentDate.getFullYear()}`;
      const current = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
      current.income += Number(payment.amount) || 0;
      monthlyMap.set(monthKey, current);
    });

    // Aggregate expenses by month
    allExpenses.forEach(expense => {
      const expenseDate = parseISO(expense.expense_date);
      const monthKey = `${monthNames[expenseDate.getMonth()]}-${expenseDate.getFullYear()}`;
      const current = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
      current.expenses += Number(expense.amount) || 0;
      monthlyMap.set(monthKey, current);
    });

    // Convert to array format and sort by date
    const monthlyData: MonthlyIncomeExpense[] = Array.from(monthlyMap.entries())
      .map(([monthYear, data]) => {
        const [month, year] = monthYear.split('-');
        return {
          monthYear,
          month: `${month} ${year.slice(-2)}`,
          sortDate: new Date(parseInt(year), monthNames.indexOf(month), 1),
          income: data.income,
          expenses: data.expenses
        };
      })
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map((item) => ({ month: item.month, income: item.income, expenses: item.expenses }));

    // Fetch balance sheet data (as of dateTo)
    let balanceSheetData: BalanceSheetData | null = null;
    try {
      const schoolIdNum = Number(schoolId);
      
      // Fetch accounts and account types (unlikely to exceed 1000, but using pagination to be safe)
      const accountsDataResult = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('accounts')
          .select('*')
          .eq('school_id', schoolIdNum)
          .eq('is_active', true)
          .order('name')
          .range(from, to);
      });

      const accountTypesDataResult = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('account_types')
          .select('*')
          .or(`school_id.eq.1,school_id.eq.${schoolIdNum}`)
          .eq('is_active', true)
          .order('display_name')
          .range(from, to);
      });

      if (accountsDataResult.length > 0 || accountTypesDataResult.length > 0) {
        // Prepare date filter (as of dateTo)
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        const dateFilter = endDate.toISOString().split('T')[0];

        // Fetch fee payments (income) with account_id, filtered by date
        const feePayments = await fetchAllRows(async (from, to) => {
          return await supabase
            .from('fee_payments')
            .select('account_id, amount, payment_mode, payment_date')
            .eq('school_id', schoolIdNum)
            .lte('payment_date', dateFilter)
            .range(from, to);
        });

        // Fetch expenses (outgoing) with account_id, filtered by date and status
        const expenses = await fetchAllRows(async (from, to) => {
          return await supabase
            .from('expenses')
            .select('account_id, amount, payment_method, expense_date, status')
            .eq('school_id', schoolIdNum)
            .eq('status', 'paid')
            .lte('expense_date', dateFilter)
            .range(from, to);
        });

        // Fetch other incomes (non-fee income) with account_id, filtered by date and status
        const otherIncomes = await fetchAllRows(async (from, to) => {
          return await supabase
            .from('other_incomes')
            .select('account_id, amount, payment_method, income_date, status')
            .eq('school_id', schoolIdNum)
            .lte('income_date', dateFilter)
            .eq('status', 'received')
            .range(from, to);
        });

        // Deduplicate account types
        const uniqueTypes = new Map();
        accountTypesDataResult.forEach((type: any) => {
          if (!uniqueTypes.has(type.name) || type.school_id === 1) {
            uniqueTypes.set(type.name, type);
          }
        });

        // Calculate balances for each account
        const balances: AccountBalance[] = accountsDataResult.map((account: any) => {
          const accountType = Array.from(uniqueTypes.values()).find((t: any) => t.name === account.type);
          const displayName = accountType?.display_name || account.type;
          
          // Calculate income from fee payments
          const feeIncome = feePayments
            .filter(p => p.account_id === account.id)
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
          
          // Calculate income from other incomes
          const otherIncome = otherIncomes
            .filter(oi => oi.payment_method === 'account' && oi.account_id === account.id)
            .reduce((sum, oi) => sum + parseFloat(oi.amount || 0), 0);
          
          const accountIncome = feeIncome + otherIncome;
          
          // Calculate expenses
          const expensesAmount = expenses
            .filter(e => e.account_id === account.id)
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
          
          const accountBalance = accountIncome - expensesAmount;
          
          return {
            id: account.id,
            name: account.name,
            type: account.type,
            displayName,
            income: accountIncome,
            expenses: expensesAmount,
            balance: accountBalance
          };
        });

        // Calculate Cash in Hand
        const cashFeeIncome = feePayments
          .filter(p => p.payment_mode === 'Cash' && !p.account_id)
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        
        const cashOtherIncome = otherIncomes
          .filter(oi => (oi.payment_method === 'cash' || oi.payment_method === 'cheque') && !oi.account_id)
          .reduce((sum, oi) => sum + parseFloat(oi.amount || 0), 0);
        
        const cashIncome = cashFeeIncome + cashOtherIncome;
        
        const cashExpenses = expenses
          .filter(e => e.payment_method === 'cash' && !e.account_id)
          .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        
        const cashBalance = cashIncome - cashExpenses;
        
        // Calculate totals
        const totalInc = balances.reduce((sum, b) => sum + b.income, 0) + cashIncome;
        const totalExp = balances.reduce((sum, b) => sum + b.expenses, 0) + cashExpenses;
        const totalBal = totalInc - totalExp;

        balanceSheetData = {
          accounts: balances,
          cashInHand: {
            income: cashIncome,
            expenses: cashExpenses,
            balance: cashBalance
          },
          totalIncome: totalInc,
          totalExpenses: totalExp,
          totalBalance: totalBal
        };
      }
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
    }

    // Fetch assets and liabilities data (as of dateTo)
    let assetsLiabilitiesData: AssetsLiabilitiesData | null = null;
    try {
      const schoolIdNum = Number(schoolId);
      const balanceSheet = await balanceSheetService.getBalanceSheet(schoolIdNum, dateTo);
      
      assetsLiabilitiesData = {
        assets: balanceSheet.assets,
        liabilities: balanceSheet.liabilities,
        netWorth: balanceSheet.netWorth
      };
    } catch (error) {
      console.error('Error fetching assets/liabilities data:', error);
    }

    const accountsData: AccountsData = {
      summary: {
        income,
        expenses,
        profitLoss,
        cash
      },
      cashAccounts,
      incomeVsExpenses: {
        income,
        expenses
      },
      monthlyData,
      balanceSheet: balanceSheetData,
      assetsLiabilities: assetsLiabilitiesData
    };

    setAccountsData(accountsData);
  } catch (error) {
    console.error('Error fetching accounts data:', error);
    setAccountsData({
      summary: { income: 0, expenses: 0, profitLoss: 0, cash: 0 },
      cashAccounts: [],
      incomeVsExpenses: { income: 0, expenses: 0 },
      monthlyData: [],
      balanceSheet: null,
      assetsLiabilities: null
    });
  } finally {
    setAccountsLoading(false);
  }
};

