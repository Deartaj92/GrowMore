-- Seed script to add 50 random assets and liabilities
-- This script generates test data for development/testing purposes

DO $$
DECLARE
  school_id_var INTEGER;
  user_id_var INTEGER;
  asset_category_id INTEGER;
  liability_category_id INTEGER;
  i INTEGER;
  asset_names TEXT[] := ARRAY[
    'Desktop Computer', 'Laptop', 'Projector', 'Printer', 'Scanner', 'Tablet', 'Smartboard',
    'Office Chair', 'Desk', 'Filing Cabinet', 'Bookshelf', 'Whiteboard', 'Air Conditioner',
    'Refrigerator', 'Microwave', 'Water Cooler', 'Security Camera', 'Server', 'Router',
    'Switch', 'Firewall', 'UPS', 'Generator', 'Vehicle', 'Bus', 'Van', 'Motorcycle',
    'Library Books', 'Lab Equipment', 'Sports Equipment', 'Musical Instruments',
    'Gym Equipment', 'Playground Equipment', 'Furniture Set', 'Office Supplies',
    'Cleaning Equipment', 'Maintenance Tools', 'Building Materials', 'Land',
    'Building', 'Classroom Furniture', 'Science Lab Equipment', 'Computer Lab Setup',
    'Audio System', 'Video System', 'Lighting Equipment', 'HVAC System',
    'Plumbing System', 'Electrical System', 'Security System', 'Fire Safety Equipment'
  ];
  liability_names TEXT[] := ARRAY[
    'Bank Loan', 'Equipment Lease', 'Vehicle Loan', 'Building Mortgage', 'Credit Line',
    'Supplier Credit', 'Utility Deposit', 'Insurance Premium', 'Tax Liability',
    'Payroll Advance', 'Staff Loan', 'Vendor Payment', 'Contractor Payment',
    'Maintenance Contract', 'Service Agreement', 'Software License', 'Internet Service',
    'Phone Service', 'Electricity Bill', 'Water Bill', 'Gas Bill', 'Property Tax',
    'Income Tax', 'Sales Tax', 'Payroll Tax', 'Social Security', 'Pension Fund',
    'Health Insurance', 'Life Insurance', 'Property Insurance', 'Liability Insurance',
    'Equipment Financing', 'Technology Lease', 'Furniture Lease', 'Vehicle Lease',
    'Building Lease', 'Land Lease', 'Student Fee Advance', 'Scholarship Fund',
    'Grant Liability', 'Donation Commitment', 'Construction Loan', 'Renovation Loan',
    'Expansion Loan', 'Working Capital Loan', 'Short Term Loan', 'Long Term Loan',
    'Bond Issue', 'Debenture'
  ];
  locations TEXT[] := ARRAY[
    'Main Building', 'Annex Building', 'Library', 'Computer Lab', 'Science Lab',
    'Art Room', 'Music Room', 'Gymnasium', 'Auditorium', 'Cafeteria', 'Office',
    'Principal Office', 'Staff Room', 'Storage Room', 'Maintenance Room', 'Parking Lot',
    'Playground', 'Sports Field', 'Garden', 'Roof', 'Basement', 'First Floor',
    'Second Floor', 'Third Floor', 'Ground Floor'
  ];
  vendors TEXT[] := ARRAY[
    'Tech Solutions Inc', 'Office Supplies Co', 'Furniture World', 'Electronics Plus',
    'Equipment Depot', 'Global Suppliers', 'Local Distributors', 'Wholesale Mart',
    'Direct Imports', 'Quality Goods Ltd', 'Premium Supplies', 'Budget Equipment',
    'Reliable Vendors', 'Trusted Suppliers', 'Best Deals Corp'
  ];
  lenders TEXT[] := ARRAY[
    'First National Bank', 'City Bank', 'Commercial Bank', 'Credit Union',
    'Finance Company', 'Leasing Corp', 'Investment Bank', 'Development Bank',
    'Microfinance', 'Private Lender', 'Government Bank', 'Cooperative Bank',
    'Savings Bank', 'Merchant Bank', 'Online Lender'
  ];
  statuses_asset TEXT[] := ARRAY['active', 'active', 'active', 'active', 'under_maintenance', 'disposed', 'sold'];
  statuses_liability TEXT[] := ARRAY['active', 'active', 'active', 'paid_off', 'restructured'];
  depreciation_methods TEXT[] := ARRAY['straight_line', 'declining_balance', 'none'];
  payment_frequencies TEXT[] := ARRAY['monthly', 'quarterly', 'annually', 'one-time'];
  random_name TEXT;
  random_location TEXT;
  random_vendor TEXT;
  random_lender TEXT;
  random_status TEXT;
  random_method TEXT;
  random_frequency TEXT;
  purchase_date DATE;
  purchase_cost NUMERIC;
  current_value NUMERIC;
  principal_amount NUMERIC;
  current_balance NUMERIC;
  interest_rate NUMERIC;
  start_date DATE;
  due_date DATE;
BEGIN
  -- Get the first school and user (for seeding purposes)
  SELECT id INTO school_id_var FROM schools LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE school_id = school_id_var LIMIT 1;
  
  -- Create default categories if they don't exist
  INSERT INTO asset_categories (school_id, name, description, color, is_active, created_at, updated_at)
  VALUES 
    (school_id_var, 'Technology', 'Computers, electronics, and IT equipment', '#3b82f6', true, NOW(), NOW()),
    (school_id_var, 'Furniture', 'Desks, chairs, and office furniture', '#10b981', true, NOW(), NOW()),
    (school_id_var, 'Vehicles', 'School buses, vans, and transportation', '#f59e0b', true, NOW(), NOW()),
    (school_id_var, 'Equipment', 'Lab equipment, sports equipment, etc.', '#8b5cf6', true, NOW(), NOW()),
    (school_id_var, 'Infrastructure', 'Buildings, facilities, and infrastructure', '#ef4444', true, NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO asset_category_id FROM asset_categories WHERE school_id = school_id_var LIMIT 1;
  
  INSERT INTO liability_categories (school_id, name, description, color, is_active, created_at, updated_at)
  VALUES 
    (school_id_var, 'Loans', 'Bank loans and financing', '#ef4444', true, NOW(), NOW()),
    (school_id_var, 'Leases', 'Equipment and property leases', '#f59e0b', true, NOW(), NOW()),
    (school_id_var, 'Payables', 'Accounts payable and vendor credits', '#8b5cf6', true, NOW(), NOW()),
    (school_id_var, 'Taxes', 'Tax liabilities and obligations', '#6366f1', true, NOW(), NOW()),
    (school_id_var, 'Services', 'Service agreements and contracts', '#10b981', true, NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO liability_category_id FROM liability_categories WHERE school_id = school_id_var LIMIT 1;
  
  -- Generate 50 random assets
  FOR i IN 1..50 LOOP
    random_name := asset_names[1 + floor(random() * array_length(asset_names, 1))::int];
    random_location := locations[1 + floor(random() * array_length(locations, 1))::int];
    random_vendor := vendors[1 + floor(random() * array_length(vendors, 1))::int];
    random_status := statuses_asset[1 + floor(random() * array_length(statuses_asset, 1))::int];
    random_method := depreciation_methods[1 + floor(random() * array_length(depreciation_methods, 1))::int];
    
    purchase_date := CURRENT_DATE - (random() * 3650)::int; -- Random date within last 10 years
    purchase_cost := 1000 + (random() * 99000)::numeric; -- Between 1000 and 100000
    current_value := purchase_cost * (0.3 + random() * 0.7); -- 30% to 100% of purchase cost
    
    INSERT INTO assets (
      school_id, category_id, name, description, purchase_date, purchase_cost,
      current_value, depreciation_method, depreciation_rate, useful_life_years,
      location, vendor_name, invoice_number, serial_number, status, notes,
      created_by, created_at, updated_at
    ) VALUES (
      school_id_var,
      asset_category_id,
      random_name || ' ' || i,
      'Test asset for development - ' || random_name,
      purchase_date,
      purchase_cost,
      current_value,
      random_method::text,
      CASE WHEN random_method != 'none' THEN 5 + (random() * 20) ELSE NULL END,
      CASE WHEN random_method != 'none' THEN 3 + floor(random() * 12) ELSE NULL END,
      random_location,
      random_vendor,
      'INV-' || LPAD(i::text, 6, '0'),
      'SN-' || LPAD(i::text, 8, '0'),
      random_status::text,
      'Seeded test data',
      user_id_var,
      NOW(),
      NOW()
    );
  END LOOP;
  
  -- Generate 50 random liabilities
  FOR i IN 1..50 LOOP
    random_name := liability_names[1 + floor(random() * array_length(liability_names, 1))::int];
    random_lender := lenders[1 + floor(random() * array_length(lenders, 1))::int];
    random_status := statuses_liability[1 + floor(random() * array_length(statuses_liability, 1))::int];
    random_frequency := payment_frequencies[1 + floor(random() * array_length(payment_frequencies, 1))::int];
    
    start_date := CURRENT_DATE - (random() * 1095)::int; -- Random date within last 3 years
    due_date := start_date + (30 + random() * 1095)::int; -- 1 month to 3 years from start
    principal_amount := 5000 + (random() * 95000)::numeric; -- Between 5000 and 100000
    
    IF random_status = 'paid_off' THEN
      current_balance := 0;
    ELSE
      current_balance := principal_amount * (0.1 + random() * 0.9); -- 10% to 100% of principal
    END IF;
    
    -- 70% chance of having interest
    IF random() < 0.7 THEN
      interest_rate := 5 + (random() * 15); -- Between 5% and 20%
    ELSE
      interest_rate := NULL;
    END IF;
    
    INSERT INTO liabilities (
      school_id, category_id, name, description, principal_amount, current_balance,
      interest_rate, start_date, due_date, payment_frequency, payment_amount,
      lender_name, account_number, reference_number, status, notes,
      created_by, created_at, updated_at
    ) VALUES (
      school_id_var,
      liability_category_id,
      random_name || ' ' || i,
      'Test liability for development - ' || random_name,
      principal_amount,
      current_balance,
      interest_rate,
      start_date,
      due_date,
      random_frequency::text,
      CASE WHEN random_frequency != 'one-time' THEN principal_amount / 12 ELSE NULL END,
      random_lender,
      'ACC-' || LPAD(i::text, 8, '0'),
      'REF-' || LPAD(i::text, 10, '0'),
      random_status::text,
      'Seeded test data',
      user_id_var,
      NOW(),
      NOW()
    );
  END LOOP;
  
  RAISE NOTICE 'Successfully seeded 50 assets and 50 liabilities';
END $$;




