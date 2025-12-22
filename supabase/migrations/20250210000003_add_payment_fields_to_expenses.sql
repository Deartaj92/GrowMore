-- Add account_id, transaction_id, and cheque_number columns to expenses table
-- This allows tracking which account was used for payment, transaction IDs, and cheque numbers

DO $$
BEGIN
    -- Add account_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenses' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.expenses
        ADD COLUMN account_id INTEGER REFERENCES public.accounts(id) ON DELETE SET NULL;

        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON public.expenses(account_id);
    END IF;

    -- Add transaction_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenses' AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE public.expenses
        ADD COLUMN transaction_id VARCHAR(100);
    END IF;

    -- Add cheque_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenses' AND column_name = 'cheque_number'
    ) THEN
        ALTER TABLE public.expenses
        ADD COLUMN cheque_number VARCHAR(100);
    END IF;
END $$;

































