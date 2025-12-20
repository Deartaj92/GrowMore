-- Create accounts table for managing bank accounts, EasyPaisa, JazzCash, and other payment accounts
-- This table supports multi-tenancy with school_id

-- Drop table if exists
DROP TABLE IF EXISTS public.accounts CASCADE;

-- Create accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('bank', 'easypaisa', 'jazzcash', 'other')),
    account_number VARCHAR(100),
    bank_name VARCHAR(255),
    branch_name VARCHAR(255),
    iban VARCHAR(50),
    swift_code VARCHAR(20),
    mobile_number VARCHAR(20),
    wallet_number VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, school_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_school_id ON public.accounts(school_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON public.accounts(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
















