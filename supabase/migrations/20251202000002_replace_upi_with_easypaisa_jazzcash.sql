-- Replace UPI with EasyPaisa/JazzCash in payment mode constraints
-- First, update any existing 'upi' values to 'easypaisa_jazzcash'
UPDATE public.payroll_settings 
SET default_payment_mode = 'easypaisa_jazzcash' 
WHERE default_payment_mode = 'upi';

UPDATE public.payroll_payments 
SET payment_mode = 'easypaisa_jazzcash' 
WHERE payment_mode = 'upi';

-- Drop and recreate the check constraints
ALTER TABLE public.payroll_settings 
DROP CONSTRAINT IF EXISTS payroll_settings_default_payment_mode_check;

ALTER TABLE public.payroll_settings 
ADD CONSTRAINT payroll_settings_default_payment_mode_check 
CHECK (default_payment_mode IN ('cash', 'bank_transfer', 'cheque', 'easypaisa_jazzcash', 'other'));

ALTER TABLE public.payroll_payments 
DROP CONSTRAINT IF EXISTS payroll_payments_payment_mode_check;

ALTER TABLE public.payroll_payments 
ADD CONSTRAINT payroll_payments_payment_mode_check 
CHECK (payment_mode IN ('cash', 'bank_transfer', 'cheque', 'easypaisa_jazzcash', 'other'));

