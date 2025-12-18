-- Update payment_method constraint for liability_payments to allow 'account' for account-based payments
-- This allows liability payments to be paid through configured accounts (banks, EasyPaisa, JazzCash, etc.)
-- Same approach as expenses

DO $$
BEGIN
    -- Drop the existing constraint
    ALTER TABLE public.liability_payments
    DROP CONSTRAINT IF EXISTS liability_payments_payment_method_check;
    
    -- Add new constraint that includes 'account' as a valid payment method
    ALTER TABLE public.liability_payments
    ADD CONSTRAINT liability_payments_payment_method_check 
    CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'card', 'online', 'other', 'account'));
END $$;
