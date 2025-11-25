-- Migration: Add paid_amount column to fee_payment_items table
-- This migration adds a new column to store the paid amount separately from the full fee item amount
-- 
-- Logic:
-- - amount: Will store the full amount of the fee item (from the page/UI, not from DB)
-- - paid_amount: Will store the amount paid for this specific item in this payment
-- 
-- Steps:
-- 1. Add paid_amount column
-- 2. Migrate existing amount values to paid_amount (since current amount is the paid amount)
-- 3. Update amount to store full amounts from fee_invoice_items for existing records
-- 4. For new records, amount will be populated from the UI/page

-- Step 1: Add paid_amount column
ALTER TABLE fee_payment_items
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);

-- Step 2: Migrate existing amount values to paid_amount
-- The current 'amount' column contains the paid amount, so we copy it to paid_amount
UPDATE fee_payment_items
SET paid_amount = amount
WHERE paid_amount IS NULL AND amount IS NOT NULL;

-- Step 3: Update amount to store full amounts from fee_invoice_items for existing records
-- This ensures existing records have the full amount populated
UPDATE fee_payment_items fpi
SET amount = fii.amount
FROM fee_invoice_items fii
WHERE fpi.fee_item_id = fii.id
  AND fpi.amount != fii.amount; -- Only update if different (to avoid unnecessary updates)

-- Step 4: Add comment to document the columns
COMMENT ON COLUMN fee_payment_items.amount IS 'Full amount of the fee item (from UI/page, not from DB)';
COMMENT ON COLUMN fee_payment_items.paid_amount IS 'Amount paid for this specific fee item in this payment';

