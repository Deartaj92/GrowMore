-- Generate test data: Categories, Accounts, 1500 Assets, and 1500 Liabilities for school_id = 2
-- This script creates diverse categories, bank accounts, and random test data

DO $$
DECLARE
  school_id_var BIGINT := 2;
  asset_category_ids INTEGER[];
  liability_category_ids INTEGER[];
  account_ids INTEGER[];
  user_id_var INTEGER;
  i INTEGER;
  random_category_idx INTEGER;
  random_account_idx INTEGER;
  random_date DATE;
  random_amount NUMERIC(12,2);
  random_cost NUMERIC(12,2);
  asset_names TEXT[] := ARRAY[
    'Desktop Computer', 'Laptop', 'Projector', 'Printer', 'Scanner', 'Tablet', 'Smartboard',
    'Office Chair', 'Desk', 'Filing Cabinet', 'Bookshelf', 'Conference Table', 'Whiteboard',
    'School Bus', 'Van', 'Car', 'Motorcycle', 'Bicycle',
    'Microscope', 'Telescope', 'Lab Equipment', 'Sports Equipment', 'Musical Instrument',
    'Air Conditioner', 'Generator', 'Water Cooler', 'Refrigerator', 'Microwave',
    'Security Camera', 'Alarm System', 'Fire Extinguisher', 'First Aid Kit',
    'Library Books', 'Textbooks', 'Stationery', 'Art Supplies', 'Science Kit'
  ];
  liability_names TEXT[] := ARRAY[
    'Bank Loan', 'Equipment Loan', 'Building Loan', 'Vehicle Loan', 'Working Capital Loan',
    'Office Lease', 'Equipment Lease', 'Vehicle Lease', 'Property Lease',
    'Vendor Payable', 'Utility Bill', 'Salary Payable', 'Tax Payable', 'Insurance Payable',
    'Service Contract', 'Maintenance Contract', 'Security Service', 'Cleaning Service',
    'Credit Card Debt', 'Line of Credit', 'Overdraft Facility'
  ];
  payment_methods TEXT[] := ARRAY['cash', 'bank_transfer', 'cheque', 'card', 'online', 'other'];
  asset_statuses TEXT[] := ARRAY['active', 'active', 'active', 'active', 'under_maintenance', 'disposed'];
  liability_statuses TEXT[] := ARRAY['active', 'active', 'active', 'active', 'paid_off'];
  locations TEXT[] := ARRAY[
    'Main Building - Ground Floor', 'Main Building - First Floor', 'Main Building - Second Floor',
    'Science Lab', 'Computer Lab', 'Library', 'Gymnasium', 'Auditorium', 'Cafeteria',
    'Administration Office', 'Principal Office', 'Staff Room', 'Storage Room', 'Parking Area'
  ];
  vendors TEXT[] := ARRAY[
    'Tech Solutions Inc', 'Office Supplies Co', 'Furniture World', 'Vehicle Dealers Ltd',
    'Equipment Suppliers', 'Electronics Store', 'Stationery Mart', 'Sports Equipment Co'
  ];
  lenders TEXT[] := ARRAY[
    'ABC Bank', 'XYZ Bank', 'Commercial Bank', 'National Bank', 'United Bank',
    'Allied Bank', 'MCB Bank', 'HBL Bank', 'Standard Chartered'
  ];
BEGIN
  -- Get a user ID for school_id 2 (or use NULL if none exists)
  SELECT id INTO user_id_var FROM users WHERE school_id = school_id_var LIMIT 1;
  
  -- ==========================================
  -- CREATE ASSET CATEGORIES
  -- ==========================================
  INSERT INTO public.asset_categories (school_id, name, description, depreciation_method, default_depreciation_rate, color, is_active, created_at, updated_at)
  VALUES 
    (school_id_var, 'Technology', 'Computers, electronics, and IT equipment', 'straight_line', 20.00, '#3b82f6', true, NOW(), NOW()),
    (school_id_var, 'Furniture', 'Desks, chairs, and office furniture', 'straight_line', 10.00, '#10b981', true, NOW(), NOW()),
    (school_id_var, 'Vehicles', 'School buses, vans, and transportation', 'straight_line', 15.00, '#f59e0b', true, NOW(), NOW()),
    (school_id_var, 'Equipment', 'Lab equipment, sports equipment, etc.', 'straight_line', 12.00, '#8b5cf6', true, NOW(), NOW()),
    (school_id_var, 'Infrastructure', 'Buildings, facilities, and infrastructure', 'straight_line', 5.00, '#ef4444', true, NOW(), NOW()),
    (school_id_var, 'Appliances', 'Air conditioners, generators, etc.', 'straight_line', 15.00, '#06b6d4', true, NOW(), NOW()),
    (school_id_var, 'Security', 'Cameras, alarms, security systems', 'straight_line', 20.00, '#6366f1', true, NOW(), NOW()),
    (school_id_var, 'Educational Materials', 'Books, supplies, teaching aids', 'straight_line', 25.00, '#ec4899', true, NOW(), NOW())
  ON CONFLICT (name, school_id) DO NOTHING;
  
  -- Get asset category IDs
  SELECT ARRAY_AGG(id) INTO asset_category_ids 
  FROM asset_categories 
  WHERE school_id = school_id_var;
  
  -- ==========================================
  -- CREATE LIABILITY CATEGORIES
  -- ==========================================
  INSERT INTO public.liability_categories (school_id, name, description, color, is_active, created_at, updated_at)
  VALUES 
    (school_id_var, 'Loans', 'Bank loans and financing', '#ef4444', true, NOW(), NOW()),
    (school_id_var, 'Leases', 'Equipment and property leases', '#f59e0b', true, NOW(), NOW()),
    (school_id_var, 'Payables', 'Accounts payable and vendor credits', '#8b5cf6', true, NOW(), NOW()),
    (school_id_var, 'Taxes', 'Tax liabilities and obligations', '#6366f1', true, NOW(), NOW()),
    (school_id_var, 'Services', 'Service agreements and contracts', '#10b981', true, NOW(), NOW()),
    (school_id_var, 'Credit Facilities', 'Credit cards, lines of credit', '#ec4899', true, NOW(), NOW())
  ON CONFLICT (name, school_id) DO NOTHING;
  
  -- Get liability category IDs
  SELECT ARRAY_AGG(id) INTO liability_category_ids 
  FROM liability_categories 
  WHERE school_id = school_id_var;
  
  -- ==========================================
  -- CREATE BANK ACCOUNTS
  -- ==========================================
  INSERT INTO public.accounts (school_id, name, type, account_number, bank_name, branch_name, iban, swift_code, description, is_active, has_chequebook, created_at, updated_at)
  VALUES 
    (school_id_var, 'Main Operating Account', 'bank', '1234567890', 'ABC Bank', 'Main Branch', 'PK12ABCD1234567890123456', 'ABCPKKA', 'Primary operating account', true, true, NOW(), NOW()),
    (school_id_var, 'Savings Account', 'bank', '0987654321', 'XYZ Bank', 'City Branch', 'PK34WXYZ9876543210987654', 'XYZPKKA', 'Savings and reserve account', true, false, NOW(), NOW()),
    (school_id_var, 'Payroll Account', 'bank', '1122334455', 'Commercial Bank', 'Downtown Branch', 'PK56COMM1122334455667788', 'COMMPKKA', 'Dedicated payroll account', true, true, NOW(), NOW()),
    (school_id_var, 'EasyPaisa Wallet', 'easypaisa', NULL, NULL, NULL, NULL, NULL, 'Mobile wallet for quick transactions', true, false, NOW(), NOW()),
    (school_id_var, 'JazzCash Account', 'jazzcash', NULL, NULL, NULL, NULL, NULL, 'Mobile wallet account', true, false, NOW(), NOW()),
    (school_id_var, 'Investment Account', 'bank', '5566778899', 'National Bank', 'Investment Branch', 'PK78NATL5566778899001122', 'NATLPKKA', 'Long-term investment account', true, false, NOW(), NOW())
  ON CONFLICT (name, school_id) DO NOTHING;
  
  -- Get account IDs
  SELECT ARRAY_AGG(id) INTO account_ids 
  FROM accounts 
  WHERE school_id = school_id_var AND is_active = true;
  
  -- ==========================================
  -- GENERATE 1500 RANDOM ASSETS
  -- ==========================================
  FOR i IN 1..1500 LOOP
    random_category_idx := 1 + floor(random() * array_length(asset_category_ids, 1))::int;
    random_date := CURRENT_DATE - (floor(random() * 1825)::int); -- Random date within last 5 years
    random_cost := (1000 + floor(random() * 499000)::int)::numeric; -- Random cost between 1000 and 500000
    random_account_idx := 1 + floor(random() * array_length(account_ids, 1))::int;
    
    INSERT INTO public.assets (
      school_id, category_id, name, description, purchase_date, purchase_cost,
      current_value, depreciation_method, depreciation_rate, useful_life_years,
      location, vendor_name, invoice_number, serial_number, status, notes, 
      payment_method, account_id, created_by, created_at, updated_at
    ) VALUES (
      school_id_var,
      asset_category_ids[random_category_idx],
      asset_names[1 + floor(random() * array_length(asset_names, 1))::int] || ' #' || i,
      'Test asset for cash flow testing - Generated automatically',
      random_date,
      random_cost,
      random_cost * (0.5 + random() * 0.5), -- Current value between 50% and 100% of purchase cost
      'straight_line',
      10.00 + (random() * 20)::numeric, -- Depreciation rate between 10% and 30%
      3 + floor(random() * 12)::int, -- Useful life between 3 and 15 years
      locations[1 + floor(random() * array_length(locations, 1))::int],
      vendors[1 + floor(random() * array_length(vendors, 1))::int],
      'INV-' || LPAD(i::text, 6, '0'),
      'SN-' || LPAD(i::text, 8, '0'),
      asset_statuses[1 + floor(random() * array_length(asset_statuses, 1))::int],
      'Generated test data',
      CASE 
        WHEN random() < 0.3 THEN 'cash'
        WHEN random() < 0.5 THEN 'bank_transfer'
        WHEN random() < 0.7 THEN 'cheque'
        WHEN random() < 0.85 THEN 'card'
        WHEN random() < 0.95 THEN 'online'
        ELSE 'other'
      END, -- Random payment method
      CASE 
        WHEN random() < 0.4 THEN account_ids[random_account_idx] -- 40% chance of using an account
        ELSE NULL -- 60% chance of cash-based payment
      END, -- Random account or NULL
      user_id_var,
      NOW(),
      NOW()
    );
  END LOOP;
  
  -- ==========================================
  -- GENERATE 1500 RANDOM LIABILITIES
  -- ==========================================
  FOR i IN 1..1500 LOOP
    random_category_idx := 1 + floor(random() * array_length(liability_category_ids, 1))::int;
    random_date := CURRENT_DATE - (floor(random() * 1095)::int); -- Random date within last 3 years
    random_amount := (5000 + floor(random() * 495000)::int)::numeric; -- Random amount between 5000 and 500000
    random_account_idx := 1 + floor(random() * array_length(account_ids, 1))::int;
    
    INSERT INTO public.liabilities (
      school_id, category_id, name, description, principal_amount, current_balance,
      interest_rate, start_date, due_date, payment_frequency, payment_amount,
      lender_name, account_number, reference_number, status, notes, created_by, created_at, updated_at
    ) VALUES (
      school_id_var,
      liability_category_ids[random_category_idx],
      liability_names[1 + floor(random() * array_length(liability_names, 1))::int] || ' #' || i,
      'Test liability for cash flow testing - Generated automatically',
      random_amount,
      CASE 
        WHEN random() < 0.3 THEN random_amount -- 30% chance fully outstanding
        ELSE random_amount * (0.1 + random() * 0.9) -- 70% chance partially paid
      END,
      CASE 
        WHEN random() < 0.7 THEN 5.00 + (random() * 15)::numeric -- 70% have interest rate between 5% and 20%
        ELSE NULL -- 30% have no interest
      END,
      random_date,
      random_date + (30 + floor(random() * 1095)::int), -- Due date 1 month to 3 years from start
      CASE floor(random() * 4)::int
        WHEN 0 THEN 'monthly'
        WHEN 1 THEN 'quarterly'
        WHEN 2 THEN 'annually'
        ELSE 'one-time'
      END,
      CASE 
        WHEN random() < 0.8 THEN random_amount / (12 + floor(random() * 36)::int) -- 80% have payment amount
        ELSE NULL -- 20% have no payment amount
      END,
      lenders[1 + floor(random() * array_length(lenders, 1))::int],
      'ACC-' || LPAD(i::text, 8, '0'),
      'REF-' || LPAD(i::text, 10, '0'),
      liability_statuses[1 + floor(random() * array_length(liability_statuses, 1))::int],
      'Generated test data',
      user_id_var,
      NOW(),
      NOW()
    );
  END LOOP;
  
  RAISE NOTICE 'Successfully created categories, accounts, 1500 assets, and 1500 liabilities for school_id = %', school_id_var;
END $$;
