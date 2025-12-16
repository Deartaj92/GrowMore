-- Update payment_method constraint to allow 'account' for account-based payments
-- This allows expenses to be paid through configured accounts (banks, EasyPaisa, JazzCash, etc.)

DO $$
BEGIN
    -- Drop the existing constraint
    ALTER TABLE public.expenses
    DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
    
    -- Add new constraint that includes 'account' as a valid payment method
    ALTER TABLE public.expenses
    ADD CONSTRAINT expenses_payment_method_check 
    CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'card', 'online', 'other', 'account'));
END $$;

