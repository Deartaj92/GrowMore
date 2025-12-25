-- Migration: Add student_id column to fee_payments table
-- This simplifies payment fetching by allowing direct queries by student_id
-- instead of going through the relationship chain: fee_payments -> fee_payment_items -> fee_challans_items -> fee_challans -> student_id

-- Step 1: Add student_id column
ALTER TABLE public.fee_payments
ADD COLUMN IF NOT EXISTS student_id INTEGER;

-- Step 2: Add foreign key constraint
ALTER TABLE public.fee_payments
ADD CONSTRAINT fee_payments_student_id_fkey
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- Step 3: Backfill existing records with student_id from the relationship chain
-- This ensures existing payments have student_id populated
UPDATE public.fee_payments fp
SET student_id = (
  SELECT DISTINCT fc.student_id
  FROM public.fee_payment_items fpi
  INNER JOIN public.fee_challans_items fci ON fpi.fee_challan_item_id = fci.id
  INNER JOIN public.fee_challans fc ON fci.challan_id = fc.id
  WHERE fpi.payment_id = fp.id
  LIMIT 1
)
WHERE fp.student_id IS NULL;

-- Step 4: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON public.fee_payments(student_id);

-- Step 5: Add comment to document the column
COMMENT ON COLUMN public.fee_payments.student_id IS 'Direct reference to the student for this payment. Simplifies payment queries.';

