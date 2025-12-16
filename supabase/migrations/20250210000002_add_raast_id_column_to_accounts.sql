-- Add raast_id column to accounts table for Raast ID account type
-- This allows storing Raast ID for accounts of type 'raast_id'

DO $$ 
BEGIN
    -- Add raast_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'raast_id'
    ) THEN
        ALTER TABLE public.accounts 
        ADD COLUMN raast_id VARCHAR(100);
    END IF;
END $$;

