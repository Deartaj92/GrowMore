import { supabase } from '../supabaseClient';

// Configuration - Update these values
const SCHOOL_ID = 1; // Change to your school_id
const USER_ID = 1; // Change to your user_id

// Expense titles
const expenseTitles = [
  'Office Supplies Purchase',
  'Electricity Bill Payment',
  'Water Bill Payment',
  'Internet Connection Fee',
  'Phone Bill Payment',
  'Cleaning Services',
  'Security Services',
  'Maintenance Work',
  'Repair Services',
  'Stationery Items',
  'Textbooks Purchase',
  'Lab Equipment',
  'Sports Equipment',
  'Furniture Purchase',
  'Computer Equipment',
  'Printer Paper & Ink',
  'Transportation Fuel',
  'Vehicle Maintenance',
  'Insurance Payment',
  'Tax Payment',
  'Legal Fees',
  'Consultation Fees',
  'Training Workshop',
  'Conference Registration',
  'Marketing Materials',
  'Advertisement Costs',
  'Event Decoration',
  'Catering Services',
  'Photography Services',
  'Printing Services',
  'Library Books',
  'Medical Supplies',
  'First Aid Kit',
  'Sanitization Services',
  'Garden Maintenance',
  'Building Repair',
  'Plumbing Work',
  'Electrical Work',
  'Painting Work',
  'Renovation Work',
  'Software License',
  'Cloud Storage',
  'Website Hosting',
  'Domain Registration',
  'Bank Charges',
  'ATM Fees',
  'Postage & Courier',
  'Newspaper Subscription',
  'Magazine Subscription',
  'Uniform Purchase',
];

// Income titles
const incomeTitles = [
  'Donation from Alumni',
  'Sponsorship from Local Business',
  'Grant from Education Foundation',
  'Fundraising Event Proceeds',
  'Book Sale Revenue',
  'Uniform Sale Revenue',
  'Canteen Revenue',
  'Parking Fee Collection',
  'Event Ticket Sales',
  'Workshop Registration Fees',
  'Summer Camp Fees',
  'Extra Classes Revenue',
  'Library Membership Fees',
  'Computer Lab Usage Fees',
  'Sports Facility Rental',
  'Hall Rental Income',
  'Photocopy Service Revenue',
  'Stationery Shop Revenue',
  'Cafeteria Revenue',
  'Vending Machine Revenue',
  'Advertisement Revenue',
  'Partnership Contribution',
  'Community Support Fund',
  'Government Grant',
  'NGO Partnership',
  'Corporate Sponsorship',
  'Parent-Teacher Association Fund',
  'School Magazine Sales',
  'Art Exhibition Sales',
  'Science Fair Revenue',
  'Cultural Event Revenue',
  'Sports Tournament Entry Fees',
  'Merit Scholarship Fund',
  'Endowment Fund Contribution',
  'Infrastructure Development Fund',
  'Technology Upgrade Fund',
  'Library Development Fund',
  'Sports Equipment Fund',
  'Scholarship Donation',
  'Building Fund Contribution',
  'Equipment Donation (Monetary)',
  'Research Grant',
  'Training Program Revenue',
  'Consultation Services Income',
  'Online Course Revenue',
  'Distance Learning Fees',
  'Certificate Program Fees',
  'Professional Development Fees',
  'Skill Development Program',
  'Community Service Revenue',
];

// Vendor/Payer names
const vendorNames = [
  'ABC Supplies Ltd',
  'XYZ Services',
  'City Electric Company',
  'Water Works Department',
  'Tech Solutions Inc',
  'Office Depot',
  'Print Shop',
  'Maintenance Co',
  'Security Services',
  'Cleaning Services',
  'Transport Services',
  'Catering Company',
  'Event Management',
  'Construction Co',
  'IT Services',
  'Mr. Ahmed Khan',
  'Mrs. Fatima Ali',
  'Dr. Hassan Raza',
  'Eng. Usman Malik',
  'Local Business Owner',
  'Community Member',
  'Alumni Association',
  'Parent Committee',
  'Education Foundation',
  'Corporate Sponsor',
];

// Payment methods
const paymentMethods = ['cash', 'cheque', 'account', 'bank_transfer', 'card', 'online'];

// Status options
const expenseStatuses = ['pending', 'paid'];
const incomeStatuses = ['pending', 'received'];

// Helper function to get random element from array
const getRandomElement = <T,>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Helper function to get random number between min and max
const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper function to get random date within last 6 months
const getRandomDate = (): string => {
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (today.getTime() - sixMonthsAgo.getTime());
  const randomDate = new Date(randomTime);
  
  return randomDate.toISOString().split('T')[0];
};

// Generate random expenses
const generateExpenses = async (expenseCategories: any[], accounts: any[]) => {
  const expenses = [];
  
  for (let i = 0; i < 50; i++) {
    const category = getRandomElement(expenseCategories);
    const paymentMethod = getRandomElement(paymentMethods);
    const status = getRandomElement(expenseStatuses);
    const amount = parseFloat((Math.random() * 50000 + 500).toFixed(2)); // Between 500 and 50500
    
    const expense: any = {
      school_id: SCHOOL_ID,
      category_id: category.id,
      title: getRandomElement(expenseTitles),
      description: Math.random() > 0.5 ? `Description for ${getRandomElement(expenseTitles).toLowerCase()}` : null,
      amount: amount,
      expense_date: getRandomDate(),
      payment_method: paymentMethod,
      vendor_name: Math.random() > 0.3 ? getRandomElement(vendorNames) : null,
      vendor_contact: Math.random() > 0.5 ? `+92${getRandomNumber(3000000000, 3999999999)}` : null,
      status: status,
      created_by: USER_ID,
      reference_number: Math.random() > 0.6 ? `REF-${getRandomNumber(1000, 9999)}` : null,
    };
    
    // Add account_id if payment method is account
    if (paymentMethod === 'account' && accounts.length > 0) {
      const account = getRandomElement(accounts);
      expense.account_id = account.id;
      expense.transaction_id = Math.random() > 0.4 ? `TXN-${getRandomNumber(100000, 999999)}` : null;
    }
    
    // Add cheque_number if payment method is cheque
    if (paymentMethod === 'cheque') {
      expense.cheque_number = `CHQ-${getRandomNumber(100000, 999999)}`;
    }
    
    expenses.push(expense);
  }
  
  return expenses;
};

// Generate random incomes
const generateIncomes = async (incomeCategories: any[], accounts: any[]) => {
  const incomes = [];
  
  for (let i = 0; i < 50; i++) {
    const category = getRandomElement(incomeCategories);
    const paymentMethod = getRandomElement(paymentMethods);
    const status = getRandomElement(incomeStatuses);
    const amount = parseFloat((Math.random() * 100000 + 1000).toFixed(2)); // Between 1000 and 101000
    
    const income: any = {
      school_id: SCHOOL_ID,
      category_id: category.id,
      title: getRandomElement(incomeTitles),
      description: Math.random() > 0.5 ? `Description for ${getRandomElement(incomeTitles).toLowerCase()}` : null,
      amount: amount,
      income_date: getRandomDate(),
      payment_method: paymentMethod,
      payer_name: Math.random() > 0.3 ? getRandomElement(vendorNames) : null,
      payer_contact: Math.random() > 0.5 ? `+92${getRandomNumber(3000000000, 3999999999)}` : null,
      status: status,
      created_by: USER_ID,
    };
    
    // Add account_id if payment method is account
    if (paymentMethod === 'account' && accounts.length > 0) {
      const account = getRandomElement(accounts);
      income.account_id = account.id;
      income.transaction_id = Math.random() > 0.4 ? `TXN-${getRandomNumber(100000, 999999)}` : null;
    }
    
    // Add cheque_number if payment method is cheque
    if (paymentMethod === 'cheque') {
      income.cheque_number = `CHQ-${getRandomNumber(100000, 999999)}`;
    }
    
    incomes.push(income);
  }
  
  return incomes;
};

// Main function
const generateRandomData = async () => {
  try {
    console.log('Starting to generate random expenses and incomes...');
    
    // Fetch expense categories
    const { data: expenseCategories, error: expenseCatError } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('school_id', SCHOOL_ID)
      .eq('is_active', true);
    
    if (expenseCatError) throw expenseCatError;
    if (!expenseCategories || expenseCategories.length === 0) {
      throw new Error('No expense categories found. Please create at least one expense category first.');
    }
    
    // Fetch income categories
    const { data: incomeCategories, error: incomeCatError } = await supabase
      .from('income_categories')
      .select('id')
      .eq('school_id', SCHOOL_ID)
      .eq('is_active', true);
    
    if (incomeCatError) throw incomeCatError;
    if (!incomeCategories || incomeCategories.length === 0) {
      throw new Error('No income categories found. Please create at least one income category first.');
    }
    
    // Fetch accounts (optional)
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id')
      .eq('school_id', SCHOOL_ID)
      .eq('is_active', true);
    
    if (accountsError) {
      console.warn('Warning: Could not fetch accounts:', accountsError.message);
    }
    
    const accountsList = accounts || [];
    
    console.log(`Found ${expenseCategories.length} expense categories`);
    console.log(`Found ${incomeCategories.length} income categories`);
    console.log(`Found ${accountsList.length} accounts`);
    
    // Generate expenses
    console.log('Generating 50 random expenses...');
    const expenses = await generateExpenses(expenseCategories, accountsList);
    
    // Insert expenses
    const { error: expensesError } = await supabase
      .from('expenses')
      .insert(expenses);
    
    if (expensesError) throw expensesError;
    console.log('✓ Successfully inserted 50 expenses');
    
    // Generate incomes
    console.log('Generating 50 random incomes...');
    const incomes = await generateIncomes(incomeCategories, accountsList);
    
    // Insert incomes
    const { error: incomesError } = await supabase
      .from('other_incomes')
      .insert(incomes);
    
    if (incomesError) throw incomesError;
    console.log('✓ Successfully inserted 50 incomes');
    
    console.log('\n✅ Successfully generated and inserted:');
    console.log('  - 50 random expenses');
    console.log('  - 50 random incomes');
    console.log('\nDone!');
    
  } catch (error: any) {
    console.error('Error generating random data:', error.message);
    throw error;
  }
};

// Run the script
if (require.main === module) {
  generateRandomData()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export default generateRandomData;

