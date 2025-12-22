import { supabase } from '../../../supabaseClient';
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

export interface CashFlowTransaction {
  id: string | number;
  type: 'credit' | 'debit';
  category: 'fee_payment' | 'other_income' | 'expense' | 'asset_purchase' | 'liability_payment';
  description: string;
  amount: number;
  date: string;
  paymentMethod?: string;
}

export interface CashFlowData {
  openingBalance: number;
  inflows: {
    feePayments: number;
    otherIncomes: number;
    total: number;
  };
  outflows: {
    expenses: number;
    assetPurchases: number;
    liabilityPayments: number;
    total: number;
  };
  netCashFlow: number;
  closingBalance: number;
  monthlyCashFlow: Array<{
    month: string;
    inflows: number;
    outflows: number;
    netFlow: number;
  }>;
  transactions: CashFlowTransaction[];
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
  cashFlow: CashFlowData | null;
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
    const sessionData = await getCachedSession();
    
    // Helper function to fetch all rows with pagination
    // This handles Supabase's 1000 row limit by automatically paginating
    const fetchAllRows = async <T,>(
      queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
    ): Promise<T[]> => {
      const allResults: T[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      let consecutiveEmptyPages = 0;
      const maxEmptyPages = 2; // Safety check to prevent infinite loops

      while (hasMore && consecutiveEmptyPages < maxEmptyPages) {
        const { data, error } = await queryFn(from, from + pageSize - 1);
        if (error) {
          console.error('Error in fetchAllRows:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allResults.push(...data);
          from += pageSize;
          // Continue if we got a full page (might be more data)
          hasMore = data.length === pageSize;
          consecutiveEmptyPages = 0; // Reset counter on successful fetch
        } else {
          // No data returned - check if we should continue
          // If we've fetched some data before, this might be the end
          // If this is the first page and it's empty, there's no data
          if (allResults.length > 0 || from === 0) {
            hasMore = false;
          } else {
            consecutiveEmptyPages++;
          }
        }
      }

      return allResults;
    };
    
    // Fetch income (from fee payments in date range) - with pagination
    const feePayments = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('fee_payments')
        .select('id, amount, payment_mode, payment_date, account_id')
        .eq('school_id', schoolId)
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .range(from, to);
    });

    // Fetch other incomes (non-fee income) in date range - with pagination
    const otherIncomes = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('other_incomes')
        .select('id, amount, payment_method, income_date, status, title, description, account_id')
        .eq('school_id', schoolId)
        .gte('income_date', dateFrom)
        .lte('income_date', dateTo)
        .in('status', ['approved', 'received'])
        .range(from, to);
    });

    const feeIncome = feePayments.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
    const otherIncome = otherIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
    const income = feeIncome + otherIncome;

    // Fetch expenses (from expenses table in date range) - with pagination
    // Include both 'approved' and 'paid' expenses since paid expenses are the ones actually paid
    const expensesData = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('expenses')
        .select('id, amount, payment_method, expense_date, status, account_id, title, description')
        .eq('school_id', schoolId)
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .in('status', ['approved', 'paid'])
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

    // Calculate cash from other incomes (income adds to cash)
    otherIncomes.forEach(income => {
      const method = income.payment_method?.toLowerCase() || '';
      let accountName = 'Cash in hand';
      
      if (method.includes('bank') || method === 'bank_transfer') {
        accountName = 'Cash at Bank';
      } else if (method.includes('jazz')) {
        accountName = 'Jazz Cash';
      } else if (method.includes('easy') || method.includes('paisa')) {
        accountName = 'Easy paisa';
      } else if (method === 'cash') {
        accountName = 'Cash in hand';
      } else if (method === 'account') {
        // Account-based payments don't affect cash accounts
        return;
      }

      const currentBalance = cashAccountsMap.get(accountName) || 0;
      cashAccountsMap.set(accountName, currentBalance + (Number(income.amount) || 0));
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

    // Get all other incomes for the date range (already fetched above, reuse)
    const allOtherIncomes = otherIncomes;

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

    // Aggregate other incomes by month
    allOtherIncomes.forEach(income => {
      const incomeDate = parseISO(income.income_date);
      const monthKey = `${monthNames[incomeDate.getMonth()]}-${incomeDate.getFullYear()}`;
      const current = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
      current.income += Number(income.amount) || 0;
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

    // Fetch cash flow data
    let cashFlowData: CashFlowData | null = null;
    try {
      const schoolIdNum = Number(schoolId);
      
      // Helper function to check if payment method is cash-based (not account-based)
      const isCashBased = (paymentMethod: string | null | undefined): boolean => {
        if (!paymentMethod) return true; // Default to cash if not specified
        const method = paymentMethod.toLowerCase();
        // Exclude account-based payments
        return method !== 'account';
      };
      
      // Calculate opening balance (cash balance before dateFrom)
      // This represents the actual cash position at the start of the selected period
      // Calculated using the same logic as cash accounts but for all transactions before dateFrom
      
      // Fetch all fee payments before dateFrom - using pagination
      const openingFeePayments = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('fee_payments')
          .select('amount, payment_mode, account_id')
          .eq('school_id', schoolId) // Use string schoolId for consistency
          .lt('payment_date', dateFrom)
          .range(from, to);
      });
      
      // Fetch all other incomes before dateFrom (only received status) - using pagination
      const openingOtherIncomes = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('other_incomes')
          .select('amount, payment_method, status, account_id')
          .eq('school_id', schoolId) // Use string schoolId for consistency
          .eq('status', 'received') // Only received (actual cash received)
          .lt('income_date', dateFrom)
          .range(from, to);
      });
      
      // Fetch all expenses before dateFrom (only paid status) - using pagination
      const openingExpenses = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('expenses')
          .select('amount, payment_method, status, account_id')
          .eq('school_id', schoolId) // Use string schoolId for consistency
          .eq('status', 'paid') // Only paid expenses (actual cash paid out)
          .lt('expense_date', dateFrom)
          .range(from, to);
      });
      
      // Fetch all asset purchases before dateFrom - using pagination
      // Fetch asset purchases before dateFrom (now with payment_method and account_id)
      const openingAssetPurchases = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('assets')
          .select('purchase_cost, purchase_date, payment_method, account_id')
          .eq('school_id', schoolIdNum)
          .lt('purchase_date', dateFrom)
          .range(from, to);
      });
      
      // Fetch all liability payments before dateFrom - using pagination
      // Filter same as expenses: only cash-based, exclude account-based
      const openingLiabilityPayments = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('liability_payments')
          .select('payment_amount, payment_date, payment_method, account_id')
          .eq('school_id', schoolIdNum)
          .lt('payment_date', dateFrom)
          .range(from, to);
      });
      
      // Calculate opening balance using same logic as cash accounts
      // Only count cash-based transactions (exclude account-based)
      let openingBalance = 0;
      
      // Add cash inflows from fee payments (exclude account-based)
      openingFeePayments.forEach(payment => {
        // Exclude if it has an account_id (paid to account, not cash)
        if (payment.account_id) return;
        
        const mode = payment.payment_mode?.toLowerCase() || '';
        // Exclude account-based payments
        if (mode === 'account' || mode.includes('account')) return;
        
        openingBalance += Number(payment.amount) || 0;
      });
      
      // Add inflows from other incomes (include all received, any payment method)
      openingOtherIncomes.forEach(income => {
        // Only count received status
        if (income.status !== 'received') return;
        
        openingBalance += Number(income.amount) || 0;
      });
      
      // Subtract cash outflows from expenses (exclude account-based)
      // Filtering logic: exclude if account_id exists OR payment_method is 'account'
      openingExpenses.forEach(expense => {
        // Exclude if it has an account_id (paid from account, not cash)
        if (expense.account_id) return;
        
        // Only count cash-based payment methods (exclude 'account' method)
        if (!isCashBased(expense.payment_method)) return;
        
        openingBalance -= Number(expense.amount) || 0;
      });
      
      // Subtract asset purchases (EXACT same filtering logic as expenses)
      // Filtering logic: exclude if account_id exists OR payment_method is 'account'
      openingAssetPurchases.forEach(asset => {
        // Exclude if it has an account_id (paid from account, not cash) - EXACT same as expenses
        if (asset.account_id) return;
        
        // Only count cash-based payment methods (exclude 'account' method) - EXACT same as expenses
        // Uses the same isCashBased() function that expenses use
        if (!isCashBased(asset.payment_method)) return;
        
        openingBalance -= Number(asset.purchase_cost) || 0;
      });
      
      // Subtract liability payments (EXACT same filtering logic as expenses)
      // Filtering logic: exclude if account_id exists OR payment_method is 'account'
      openingLiabilityPayments.forEach(payment => {
        // Exclude if it has an account_id (paid from account, not cash) - EXACT same as expenses
        if (payment.account_id) return;
        
        // Only count cash-based payment methods (exclude 'account' method) - EXACT same as expenses
        // Uses the same isCashBased() function that expenses use
        if (!isCashBased(payment.payment_method)) return;
        
        openingBalance -= Number(payment.payment_amount) || 0;
      });
      
      // Filter period data to only cash-based transactions
      // Fee payments: filter out account-based payments
      const cashFeePayments = feePayments.filter(p => {
        // Exclude if it has an account_id (paid to account, not cash)
        if ((p as any).account_id) return false;
        const mode = p.payment_mode?.toLowerCase() || '';
        return mode !== 'account' && !p.payment_mode?.toLowerCase().includes('account');
      });
      const cashFeeIncome = cashFeePayments.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
      
      // Other incomes: include all received status (any payment method)
      const cashOtherIncomes = otherIncomes.filter(i => {
        return i.status === 'received';
      });
      const cashOtherIncome = cashOtherIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
      const cashIncome = cashFeeIncome + cashOtherIncome;
      
      // Expenses: only paid status and cash-based (exclude account-based)
      // Filtering logic: exclude if account_id exists OR payment_method is 'account'
      // Expenses use accounts from SetupAccounts - when account is selected, payment_method = 'account' and account_id is set
      const cashExpensesData = expensesData.filter(e => {
        // Exclude if it has an account_id (paid from account, not cash)
        if ((e as any).account_id) return false;
        // Only count 'paid' status and cash-based payment methods (exclude 'account' method)
        return e.status === 'paid' && isCashBased(e.payment_method);
      });
      const cashExpenses = cashExpensesData.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      
      // Fetch asset purchases in date range - using pagination
      // Fetch asset purchases in date range (now with payment_method and account_id)
      const assetPurchases = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('assets')
          .select('id, purchase_cost, purchase_date, payment_method, account_id, name')
          .eq('school_id', schoolIdNum)
          .gte('purchase_date', dateFrom)
          .lte('purchase_date', dateTo)
          .range(from, to);
      });
      
      // Fetch liability payments in date range - using pagination
      // Filter same as expenses: only cash-based, exclude account-based
      // Liability payments use same approach as expenses - accounts from SetupAccounts can be selected
      const liabilityPayments = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('liability_payments')
          .select('id, payment_amount, payment_date, payment_method, account_id, liability_id, notes, liabilities(name)')
          .eq('school_id', schoolIdNum)
          .gte('payment_date', dateFrom)
          .lte('payment_date', dateTo)
          .range(from, to);
      });
      
      // Liability payments: EXACT same filtering logic as expenses
      // (No status field for liability payments - they're always "paid" when they exist)
      // Filtering logic: exclude if account_id exists OR payment_method is 'account'
      // Uses same approach as expenses - accounts from SetupAccounts are used as payment methods
      const cashLiabilityPaymentsData = liabilityPayments.filter(lp => {
        // Exclude if it has an account_id (paid from account, not cash) - EXACT same as expenses
        if (lp.account_id) return false;
        // Only count cash-based payment methods (exclude 'account' method) - EXACT same as expenses
        // This uses the same isCashBased() function that expenses use
        return isCashBased(lp.payment_method);
      });
      
      // Asset purchases: use exact same filtering as expenses (already filtered above)
      const cashAssetPurchases = assetPurchases.filter(asset => {
        // Exclude if it has an account_id (paid from account, not cash) - EXACT same as expenses
        if (asset.account_id) return false;
        
        // Only count cash-based payment methods (exclude 'account' method) - EXACT same as expenses
        return isCashBased(asset.payment_method);
      });
      
      const totalAssetPurchases = cashAssetPurchases.reduce((sum, a) => sum + (Number(a.purchase_cost) || 0), 0);
      
      // Liability payments: use exact same filtering as expenses (already filtered above)
      const totalLiabilityPayments = cashLiabilityPaymentsData.reduce((sum, lp) => sum + (Number(lp.payment_amount) || 0), 0);
      
      // Calculate monthly cash flow
      const monthlyCashFlowMap = new Map<string, { inflows: number; outflows: number }>();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize months in date range
      const startDate = parseISO(dateFrom);
      const endDate = parseISO(dateTo);
      const currentMonth = new Date(startDate);
      while (currentMonth <= endDate) {
        const monthKey = `${monthNames[currentMonth.getMonth()]}-${currentMonth.getFullYear()}`;
        if (!monthlyCashFlowMap.has(monthKey)) {
          monthlyCashFlowMap.set(monthKey, { inflows: 0, outflows: 0 });
        }
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      
      // Aggregate inflows by month (only cash-based)
      cashFeePayments.forEach(payment => {
        const paymentDate = parseISO(payment.payment_date);
        const monthKey = `${monthNames[paymentDate.getMonth()]}-${paymentDate.getFullYear()}`;
        const current = monthlyCashFlowMap.get(monthKey) || { inflows: 0, outflows: 0 };
        current.inflows += Number(payment.amount) || 0;
        monthlyCashFlowMap.set(monthKey, current);
      });
      
      cashOtherIncomes.forEach(income => {
        const incomeDate = parseISO(income.income_date);
        const monthKey = `${monthNames[incomeDate.getMonth()]}-${incomeDate.getFullYear()}`;
        const current = monthlyCashFlowMap.get(monthKey) || { inflows: 0, outflows: 0 };
        current.inflows += Number(income.amount) || 0;
        monthlyCashFlowMap.set(monthKey, current);
      });
      
      // Aggregate outflows by month (only cash-based)
      cashExpensesData.forEach(expense => {
        const expenseDate = parseISO(expense.expense_date);
        const monthKey = `${monthNames[expenseDate.getMonth()]}-${expenseDate.getFullYear()}`;
        const current = monthlyCashFlowMap.get(monthKey) || { inflows: 0, outflows: 0 };
        current.outflows += Number(expense.amount) || 0;
        monthlyCashFlowMap.set(monthKey, current);
      });
      
      // Use filtered cash asset purchases for monthly trend
      cashAssetPurchases.forEach(asset => {
        const purchaseDate = parseISO(asset.purchase_date);
        const monthKey = `${monthNames[purchaseDate.getMonth()]}-${purchaseDate.getFullYear()}`;
        const current = monthlyCashFlowMap.get(monthKey) || { inflows: 0, outflows: 0 };
        current.outflows += Number(asset.purchase_cost) || 0;
        monthlyCashFlowMap.set(monthKey, current);
      });
      
      // Liability payments: use exact same filtering as expenses (already filtered above)
      cashLiabilityPaymentsData.forEach(payment => {
        const paymentDate = parseISO(payment.payment_date);
        const monthKey = `${monthNames[paymentDate.getMonth()]}-${paymentDate.getFullYear()}`;
        const current = monthlyCashFlowMap.get(monthKey) || { inflows: 0, outflows: 0 };
        current.outflows += Number(payment.payment_amount) || 0;
        monthlyCashFlowMap.set(monthKey, current);
      });
      
      const monthlyCashFlow = Array.from(monthlyCashFlowMap.entries())
        .map(([monthYear, data]) => {
          const [month, year] = monthYear.split('-');
          return {
            monthYear,
            month: `${month} ${year.slice(-2)}`,
            sortDate: new Date(parseInt(year), monthNames.indexOf(month), 1),
            inflows: data.inflows,
            outflows: data.outflows,
            netFlow: data.inflows - data.outflows
          };
        })
        .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
        .map((item) => ({
          month: item.month,
          inflows: item.inflows,
          outflows: item.outflows,
          netFlow: item.netFlow
        }));
      
      // Build transactions array from all cash-based transactions
      const transactions: CashFlowTransaction[] = [];
      
      try {
        // Debug: Log counts before filtering
        console.log('[Cash Flow] Transaction counts before filtering:', {
          feePayments: feePayments?.length || 0,
          otherIncomes: otherIncomes?.length || 0,
          expensesData: expensesData?.length || 0,
          assetPurchases: assetPurchases?.length || 0,
          liabilityPayments: liabilityPayments?.length || 0
        });
        
        // Add fee payments (credits)
        if (cashFeePayments && Array.isArray(cashFeePayments)) {
          console.log('[Cash Flow] Adding fee payments:', cashFeePayments.length);
          cashFeePayments.forEach((payment: any) => {
            if (!payment || !payment.payment_date) return;
            transactions.push({
              id: payment.id || `fee_${payment.payment_date}_${payment.amount}`,
              type: 'credit',
              category: 'fee_payment',
              description: 'Fee Payment',
              amount: Number(payment.amount) || 0,
              date: payment.payment_date,
              paymentMethod: payment.payment_mode || null
            });
          });
        }
        
        // Add other incomes (credits)
        if (cashOtherIncomes && Array.isArray(cashOtherIncomes)) {
          console.log('[Cash Flow] Adding other incomes:', cashOtherIncomes.length);
          cashOtherIncomes.forEach((income: any) => {
            if (!income || !income.income_date) return;
            transactions.push({
              id: income.id || `income_${income.income_date}_${income.amount}`,
              type: 'credit',
              category: 'other_income',
              description: income.title || income.description || 'Other Income',
              amount: Number(income.amount) || 0,
              date: income.income_date,
              paymentMethod: income.payment_method || null
            });
          });
        }
        
        // Add expenses (debits)
        if (cashExpensesData && Array.isArray(cashExpensesData)) {
          console.log('[Cash Flow] Adding expenses:', cashExpensesData.length);
          cashExpensesData.forEach((expense: any) => {
            if (!expense || !expense.expense_date) return;
            transactions.push({
              id: expense.id || `expense_${expense.expense_date}_${expense.amount}`,
              type: 'debit',
              category: 'expense',
              description: expense.title || expense.description || 'Expense',
              amount: Number(expense.amount) || 0,
              date: expense.expense_date,
              paymentMethod: expense.payment_method || null
            });
          });
        }
        
        // Add asset purchases (debits)
        if (cashAssetPurchases && Array.isArray(cashAssetPurchases)) {
          console.log('[Cash Flow] Adding asset purchases:', cashAssetPurchases.length);
          cashAssetPurchases.forEach((asset: any) => {
            if (!asset || !asset.purchase_date) return;
            transactions.push({
              id: asset.id || `asset_${asset.purchase_date}_${asset.purchase_cost}`,
              type: 'debit',
              category: 'asset_purchase',
              description: asset.name || 'Asset Purchase',
              amount: Number(asset.purchase_cost) || 0,
              date: asset.purchase_date,
              paymentMethod: asset.payment_method || null
            });
          });
        }
        
        // Add liability payments (debits)
        if (cashLiabilityPaymentsData && Array.isArray(cashLiabilityPaymentsData)) {
          console.log('[Cash Flow] Adding liability payments:', cashLiabilityPaymentsData.length);
          cashLiabilityPaymentsData.forEach((payment: any) => {
            if (!payment || !payment.payment_date) return;
            // Handle joined liability data - could be object or array
            let liabilityName = 'Liability Payment';
            if (payment.liabilities) {
              if (Array.isArray(payment.liabilities) && payment.liabilities.length > 0) {
                liabilityName = payment.liabilities[0].name || liabilityName;
              } else if (payment.liabilities.name) {
                liabilityName = payment.liabilities.name;
              }
            }
            transactions.push({
              id: payment.id || `liability_${payment.payment_date}_${payment.payment_amount}`,
              type: 'debit',
              category: 'liability_payment',
              description: liabilityName,
              amount: Number(payment.payment_amount) || 0,
              date: payment.payment_date,
              paymentMethod: payment.payment_method || null
            });
          });
        }
        
        console.log('[Cash Flow] Total transactions after building:', transactions.length);
        
        // Sort transactions by date (newest first)
        transactions.sort((a, b) => {
          try {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (isNaN(dateA) || isNaN(dateB)) return 0;
            return dateB - dateA;
          } catch {
            return 0;
          }
        });
      } catch (transactionError) {
        console.error('Error building transactions array:', transactionError);
        // Continue with empty transactions array if there's an error
      }
      
      cashFlowData = {
        openingBalance,
        inflows: {
          feePayments: cashFeeIncome,
          otherIncomes: cashOtherIncome,
          total: cashIncome
        },
        outflows: {
          expenses: cashExpenses,
          assetPurchases: totalAssetPurchases,
          liabilityPayments: totalLiabilityPayments,
          total: cashExpenses + totalAssetPurchases + totalLiabilityPayments
        },
        netCashFlow: cashIncome - (cashExpenses + totalAssetPurchases + totalLiabilityPayments),
        closingBalance: openingBalance + cashIncome - (cashExpenses + totalAssetPurchases + totalLiabilityPayments),
        monthlyCashFlow,
        transactions
      };
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
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
      assetsLiabilities: assetsLiabilitiesData,
      cashFlow: cashFlowData
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
      assetsLiabilities: null,
      cashFlow: null
    });
  } finally {
    setAccountsLoading(false);
  }
};

