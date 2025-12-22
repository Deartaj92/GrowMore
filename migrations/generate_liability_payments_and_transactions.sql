-- Generate liability payments and other transactions for school_id = 2
-- This will create liability payments for existing liabilities and add fee payments, expenses, and other incomes

DO $$
DECLARE
  school_id_var BIGINT := 2;
  liability_ids INTEGER[];
  account_ids INTEGER[];
  user_id_var INTEGER;
  i INTEGER;
  random_liability_idx INTEGER;
  random_account_idx INTEGER;
  random_date DATE;
  random_amount NUMERIC(12,2);
  liability_record RECORD;
  payment_methods TEXT[] := ARRAY['cash', 'bank_transfer', 'cheque', 'card', 'online', 'other'];
BEGIN
  -- Get a user ID for school_id 2
  SELECT id INTO user_id_var FROM users WHERE school_id = school_id_var LIMIT 1;
  
  -- Get all active liability IDs
  SELECT ARRAY_AGG(id) INTO liability_ids 
  FROM liabilities 
  WHERE school_id = school_id_var 
  AND status = 'active'
  AND current_balance > 0;
  
  -- Get account IDs
  SELECT ARRAY_AGG(id) INTO account_ids 
  FROM accounts 
  WHERE school_id = school_id_var AND is_active = true;
  
  -- Create income categories if they don't exist
  INSERT INTO public.income_categories (school_id, name, description, color, is_active, created_at, updated_at)
  VALUES 
    (school_id_var, 'Donations', 'Charitable donations and contributions', '#22c55e', true, NOW(), NOW()),
    (school_id_var, 'Grants', 'Government and private grants', '#10b981', true, NOW(), NOW()),
    (school_id_var, 'Sponsorships', 'Corporate and individual sponsorships', '#3b82f6', true, NOW(), NOW()),
    (school_id_var, 'Rent Income', 'Rental income from facilities', '#8b5cf6', true, NOW(), NOW()),
    (school_id_var, 'Other Income', 'Miscellaneous income sources', '#06b6d4', true, NOW(), NOW())
  ON CONFLICT (name, school_id) DO NOTHING;
  
  -- Create expense categories if they don't exist
  INSERT INTO public.expense_categories (school_id, name, description, color, is_active, created_at, updated_at)
  VALUES 
    (school_id_var, 'Utilities', 'Electricity, water, gas bills', '#3b82f6', true, NOW(), NOW()),
    (school_id_var, 'Salaries', 'Employee salaries and wages', '#ef4444', true, NOW(), NOW()),
    (school_id_var, 'Supplies', 'Office and school supplies', '#10b981', true, NOW(), NOW()),
    (school_id_var, 'Maintenance', 'Building and equipment maintenance', '#f59e0b', true, NOW(), NOW()),
    (school_id_var, 'Services', 'Professional and consulting services', '#8b5cf6', true, NOW(), NOW()),
    (school_id_var, 'Other Expenses', 'Miscellaneous expenses', '#6366f1', true, NOW(), NOW())
  ON CONFLICT (name, school_id) DO NOTHING;
  
  RAISE NOTICE 'Found % active liabilities with balance', array_length(liability_ids, 1);
  
  -- Generate liability payments for each liability (1-3 payments per liability)
  FOR liability_record IN 
    SELECT id, principal_amount, current_balance, start_date, interest_rate
    FROM liabilities 
    WHERE school_id = school_id_var 
    AND status = 'active'
    AND current_balance > 0
    LIMIT 1000 -- Limit to avoid too many payments
  LOOP
    -- Generate 1-3 payments per liability
    FOR i IN 1..(1 + floor(random() * 2)::int) LOOP
      random_date := liability_record.start_date + (30 * i + floor(random() * 60)::int);
      random_amount := LEAST(
        liability_record.current_balance * (0.1 + random() * 0.3), -- 10-40% of current balance
        liability_record.principal_amount * 0.2 -- Max 20% of principal
      );
      
      -- Skip if payment date is in the future
      IF random_date > CURRENT_DATE THEN
        CONTINUE;
      END IF;
      
      random_account_idx := 1 + floor(random() * array_length(account_ids, 1))::int;
      
      INSERT INTO public.liability_payments (
        school_id, liability_id, payment_date, payment_amount,
        principal_paid, interest_paid, payment_method, account_id,
        reference_number, notes, created_by, created_at
      ) VALUES (
        school_id_var,
        liability_record.id,
        random_date,
        random_amount,
        CASE 
          WHEN liability_record.interest_rate IS NULL THEN random_amount
          ELSE random_amount * 0.8 -- 80% principal, 20% interest if interest exists
        END,
        CASE 
          WHEN liability_record.interest_rate IS NULL THEN NULL
          ELSE random_amount * 0.2 -- 20% interest
        END,
        CASE 
          WHEN random() < 0.3 THEN 'cash'
          WHEN random() < 0.5 THEN 'bank_transfer'
          WHEN random() < 0.7 THEN 'cheque'
          WHEN random() < 0.85 THEN 'card'
          WHEN random() < 0.95 THEN 'online'
          ELSE 'other'
        END,
        CASE 
          WHEN random() < 0.4 THEN account_ids[random_account_idx] -- 40% use account
          ELSE NULL -- 60% cash-based
        END,
        'PAY-' || LPAD(liability_record.id::text || '-' || i::text, 10, '0'),
        'Generated test payment',
        user_id_var,
        NOW()
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Generated liability payments. Now generating fee payments, expenses, and other incomes...';
  
  -- Generate fee payments (credits)
  FOR i IN 1..500 LOOP
    random_date := CURRENT_DATE - (floor(random() * 1095)::int); -- Last 3 years
    random_amount := (500 + floor(random() * 499500)::int)::numeric;
    random_account_idx := 1 + floor(random() * array_length(account_ids, 1))::int;
    
    -- Create a dummy invoice first (we need invoice_id for fee_payments)
    -- Actually, let's check if we can insert fee_payments without invoice_id
    -- For now, skip fee_payments as they require invoices which need students/sessions
    
    -- Instead, generate other incomes
    INSERT INTO public.other_incomes (
      school_id, category_id, title, description, amount, income_date,
      payment_method, account_id, status, payer_name, created_by, created_at, updated_at
    )
    SELECT 
      school_id_var,
      (SELECT id FROM income_categories WHERE school_id = school_id_var LIMIT 1),
      'Test Income #' || i,
      'Generated test income for cash flow',
      random_amount,
      random_date,
      CASE 
        WHEN random() < 0.3 THEN 'cash'
        WHEN random() < 0.5 THEN 'bank_transfer'
        WHEN random() < 0.7 THEN 'cheque'
        WHEN random() < 0.85 THEN 'card'
        WHEN random() < 0.95 THEN 'online'
        ELSE 'other'
      END,
      CASE 
        WHEN random() < 0.4 THEN account_ids[random_account_idx]
        ELSE NULL
      END,
      CASE 
        WHEN random() < 0.8 THEN 'received' -- 80% received
        ELSE 'approved' -- 20% approved but not received
      END,
      'Test Payer ' || i,
      user_id_var,
      NOW(),
      NOW()
    WHERE EXISTS (SELECT 1 FROM income_categories WHERE school_id = school_id_var)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Generate expenses (debits)
  FOR i IN 1..500 LOOP
    random_date := CURRENT_DATE - (floor(random() * 1095)::int); -- Last 3 years
    random_amount := (1000 + floor(random() * 499000)::int)::numeric;
    random_account_idx := 1 + floor(random() * array_length(account_ids, 1))::int;
    
    INSERT INTO public.expenses (
      school_id, category_id, title, description, amount, expense_date,
      payment_method, account_id, status, vendor_name, created_by, created_at, updated_at
    )
    SELECT 
      school_id_var,
      (SELECT id FROM expense_categories WHERE school_id = school_id_var LIMIT 1),
      'Test Expense #' || i,
      'Generated test expense for cash flow',
      random_amount,
      random_date,
      CASE 
        WHEN random() < 0.3 THEN 'cash'
        WHEN random() < 0.5 THEN 'bank_transfer'
        WHEN random() < 0.7 THEN 'cheque'
        WHEN random() < 0.85 THEN 'card'
        WHEN random() < 0.95 THEN 'online'
        ELSE 'other'
      END,
      CASE 
        WHEN random() < 0.4 THEN account_ids[random_account_idx]
        ELSE NULL
      END,
      CASE 
        WHEN random() < 0.7 THEN 'paid' -- 70% paid
        ELSE 'approved' -- 30% approved but not paid
      END,
      'Test Vendor ' || i,
      user_id_var,
      NOW(),
      NOW()
    WHERE EXISTS (SELECT 1 FROM expense_categories WHERE school_id = school_id_var)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Successfully generated liability payments, other incomes, and expenses for school_id = %', school_id_var;
END $$;
