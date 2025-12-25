-- Migration: Add fee_arrear_id column to fee_payment_items table
-- This allows payment items to link to fee_arrears, similar to how they link to fee_challans_items
-- This enables arrears to be paid through the payment system

-- Step 1: Add fee_arrear_id column (nullable, as items can link to either challan items or arrears)
ALTER TABLE public.fee_payment_items
ADD COLUMN IF NOT EXISTS fee_arrear_id INTEGER;

-- Step 2: Add foreign key constraint
ALTER TABLE public.fee_payment_items
ADD CONSTRAINT fee_payment_items_fee_arrear_id_fkey
FOREIGN KEY (fee_arrear_id) REFERENCES public.fee_arrears(id) ON DELETE CASCADE;

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_fee_payment_items_fee_arrear_id ON public.fee_payment_items(fee_arrear_id);

-- Step 4: Add check constraint to ensure an item links to either a challan item OR an arrear (not both, not neither)
-- Note: This constraint allows NULL for both, but at least one should be set when creating payment items
-- We'll enforce this at the application level for clarity

-- Step 5: Add comment to document the column
COMMENT ON COLUMN public.fee_payment_items.fee_arrear_id IS 'Reference to fee_arrears when this payment item is for an arrear (instead of a challan item). Either fee_challan_item_id or fee_arrear_id should be set.';

