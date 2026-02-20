-- Add has_chequebook column to accounts table
-- This allows marking bank accounts that have a chequebook facility

DO $$ 
BEGIN
    -- Add has_chequebook column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'has_chequebook'
    ) THEN
        ALTER TABLE public.accounts 
        ADD COLUMN has_chequebook BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

