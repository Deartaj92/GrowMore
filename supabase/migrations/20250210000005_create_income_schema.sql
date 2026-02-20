-- Income Management System Schema
-- This schema creates income-related tables for tracking school income other than fees

-- Income Categories (types of income: donations, grants, sponsorships, etc.)
CREATE TABLE IF NOT EXISTS public.income_categories (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#22c55e', -- Hex color for UI display (green for income)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (name, school_id)
);

-- Other Incomes (main income records - income other than fees)
CREATE TABLE IF NOT EXISTS public.other_incomes (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES public.income_categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    income_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'cheque', 'account', 'bank_transfer', 'card', 'online', 'other')),
    account_id INTEGER REFERENCES public.accounts(id) ON DELETE SET NULL,
    transaction_id VARCHAR(100), -- Transaction ID for account-based payments
    cheque_number VARCHAR(100), -- Cheque number for cheque payments
    payer_name VARCHAR(255), -- Name of person/organization paying
    payer_contact VARCHAR(255), -- Payer contact info
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'received')),
    approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_income_categories_school_id ON public.income_categories(school_id);
CREATE INDEX IF NOT EXISTS idx_income_categories_active ON public.income_categories(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_other_incomes_school_id ON public.other_incomes(school_id);
CREATE INDEX IF NOT EXISTS idx_other_incomes_category ON public.other_incomes(school_id, category_id);
CREATE INDEX IF NOT EXISTS idx_other_incomes_date ON public.other_incomes(school_id, income_date);
CREATE INDEX IF NOT EXISTS idx_other_incomes_status ON public.other_incomes(school_id, status);
CREATE INDEX IF NOT EXISTS idx_other_incomes_created_by ON public.other_incomes(school_id, created_by);
CREATE INDEX IF NOT EXISTS idx_other_incomes_account_id ON public.other_incomes(account_id);

-- Add comments for documentation
COMMENT ON TABLE public.income_categories IS 'Categories for organizing income (e.g., Donations, Grants, Sponsorships)';
COMMENT ON TABLE public.other_incomes IS 'Main income records for income other than fees';
COMMENT ON COLUMN public.other_incomes.payment_method IS 'Method used to receive the income';
COMMENT ON COLUMN public.other_incomes.transaction_id IS 'Transaction ID for account-based payments';
COMMENT ON COLUMN public.other_incomes.cheque_number IS 'Cheque number for cheque payments';
COMMENT ON COLUMN public.other_incomes.status IS 'Approval status of the income';
COMMENT ON COLUMN public.other_incomes.approved_by IS 'User who approved the income';
COMMENT ON COLUMN public.other_incomes.approved_at IS 'Timestamp when income was approved';

