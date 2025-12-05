import { supabase } from '../../../supabaseClient';
import { USE_DUMMY_DATA } from '../constants';
import { format, startOfMonth, endOfMonth, parseISO, startOfYear } from 'date-fns';

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

export interface AccountsData {
  summary: AccountsSummary;
  cashAccounts: CashAccount[];
  incomeVsExpenses: {
    income: number;
    expenses: number;
  };
  monthlyData: MonthlyIncomeExpense[];
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
        ]
      };
      setAccountsData(dummyData);
      setAccountsLoading(false);
      return;
    }

    const sessionData = await getCachedSession();
    
    // Fetch income (from fee payments in date range)
    const { data: feePayments } = await supabase
      .from('fee_payments')
      .select('amount, payment_mode, payment_date')
      .eq('school_id', schoolId)
      .gte('payment_date', dateFrom)
      .lte('payment_date', dateTo);

    const income = (feePayments || []).reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);

    // Fetch expenses (from expenses table in date range)
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('amount, payment_method, expense_date, status')
      .eq('school_id', schoolId)
      .gte('expense_date', dateFrom)
      .lte('expense_date', dateTo)
      .eq('status', 'approved');

    const expenses = (expensesData || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

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
    (feePayments || []).forEach(payment => {
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
    (expensesData || []).forEach(expense => {
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
    const allFeePayments = feePayments || [];

    // Get all expenses for the date range (already fetched above, reuse)
    const allExpenses = expensesData || [];

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
    (allFeePayments || []).forEach(payment => {
      const paymentDate = parseISO(payment.payment_date);
      const monthKey = `${monthNames[paymentDate.getMonth()]}-${paymentDate.getFullYear()}`;
      const current = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
      current.income += Number(payment.amount) || 0;
      monthlyMap.set(monthKey, current);
    });

    // Aggregate expenses by month
    (allExpenses || []).forEach(expense => {
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
      monthlyData
    };

    setAccountsData(accountsData);
  } catch (error) {
    console.error('Error fetching accounts data:', error);
    setAccountsData({
      summary: { income: 0, expenses: 0, profitLoss: 0, cash: 0 },
      cashAccounts: [],
      incomeVsExpenses: { income: 0, expenses: 0 },
      monthlyData: []
    });
  } finally {
    setAccountsLoading(false);
  }
};

