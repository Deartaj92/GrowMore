-- Assets and Liabilities Management System Schema
-- This schema creates tables for tracking school assets and liabilities

-- ==========================================
-- ASSETS TABLES
-- ==========================================

-- Asset Categories (types of assets: buildings, equipment, vehicles, etc.)
CREATE TABLE IF NOT EXISTS public.asset_categories (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    depreciation_method VARCHAR(20) DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'none')),
    default_depreciation_rate NUMERIC(5,2), -- Annual percentage
    color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color for UI display
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (name, school_id)
);

-- Assets (main asset records)
CREATE TABLE IF NOT EXISTS public.assets (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES public.asset_categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    purchase_date DATE NOT NULL,
    purchase_cost NUMERIC(12,2) NOT NULL CHECK (purchase_cost > 0),
    current_value NUMERIC(12,2), -- Calculated or manual
    depreciation_method VARCHAR(20) DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'none')),
    depreciation_rate NUMERIC(5,2), -- Annual percentage
    useful_life_years INTEGER,
    location VARCHAR(255), -- Physical location
    vendor_name VARCHAR(255),
    invoice_number VARCHAR(100),
    serial_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'under_maintenance', 'sold')),
    disposed_date DATE,
    disposed_value NUMERIC(12,2),
    notes TEXT,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Asset Depreciations (depreciation history)
CREATE TABLE IF NOT EXISTS public.asset_depreciations (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    depreciation_date DATE NOT NULL,
    depreciation_amount NUMERIC(12,2) NOT NULL,
    accumulated_depreciation NUMERIC(12,2) NOT NULL,
    remaining_value NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Asset Attachments (documents for assets: invoices, receipts, warranties)
CREATE TABLE IF NOT EXISTS public.asset_attachments (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50), -- MIME type
    file_size BIGINT, -- Size in bytes
    uploaded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- LIABILITIES TABLES
-- ==========================================

-- Liability Categories (types of liabilities: loans, accounts payable, etc.)
CREATE TABLE IF NOT EXISTS public.liability_categories (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#ef4444', -- Hex color for UI display (red for liabilities)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (name, school_id)
);

-- Liabilities (main liability records)
CREATE TABLE IF NOT EXISTS public.liabilities (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES public.liability_categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    principal_amount NUMERIC(12,2) NOT NULL CHECK (principal_amount > 0),
    current_balance NUMERIC(12,2) NOT NULL CHECK (current_balance >= 0),
    interest_rate NUMERIC(5,2), -- Annual percentage (optional, NULL by default)
    start_date DATE NOT NULL,
    due_date DATE,
    payment_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'quarterly', 'annually', 'one-time')),
    payment_amount NUMERIC(12,2), -- Per payment
    lender_name VARCHAR(255),
    account_number VARCHAR(100),
    reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted', 'restructured')),
    paid_off_date DATE,
    notes TEXT,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Liability Payments (payment history for liabilities)
CREATE TABLE IF NOT EXISTS public.liability_payments (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    liability_id INTEGER NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    payment_amount NUMERIC(12,2) NOT NULL CHECK (payment_amount > 0),
    principal_paid NUMERIC(12,2) NOT NULL,
    interest_paid NUMERIC(12,2), -- NULL if liability has no interest rate
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'card', 'online', 'other')),
    account_id INTEGER REFERENCES public.accounts(id) ON DELETE SET NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Liability Attachments (documents for liabilities: contracts, agreements)
CREATE TABLE IF NOT EXISTS public.liability_attachments (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    liability_id INTEGER NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50), -- MIME type
    file_size BIGINT, -- Size in bytes
    uploaded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Asset Categories indexes
CREATE INDEX IF NOT EXISTS idx_asset_categories_school_id ON public.asset_categories(school_id);
CREATE INDEX IF NOT EXISTS idx_asset_categories_active ON public.asset_categories(school_id, is_active);

-- Assets indexes
CREATE INDEX IF NOT EXISTS idx_assets_school_id ON public.assets(school_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(school_id, category_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(school_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_purchase_date ON public.assets(school_id, purchase_date);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON public.assets(school_id, created_by);

-- Asset Depreciations indexes
CREATE INDEX IF NOT EXISTS idx_asset_depreciations_school_id ON public.asset_depreciations(school_id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciations_asset_id ON public.asset_depreciations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciations_date ON public.asset_depreciations(school_id, depreciation_date);

-- Asset Attachments indexes
CREATE INDEX IF NOT EXISTS idx_asset_attachments_asset_id ON public.asset_attachments(asset_id);

-- Liability Categories indexes
CREATE INDEX IF NOT EXISTS idx_liability_categories_school_id ON public.liability_categories(school_id);
CREATE INDEX IF NOT EXISTS idx_liability_categories_active ON public.liability_categories(school_id, is_active);

-- Liabilities indexes
CREATE INDEX IF NOT EXISTS idx_liabilities_school_id ON public.liabilities(school_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_category ON public.liabilities(school_id, category_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_status ON public.liabilities(school_id, status);
CREATE INDEX IF NOT EXISTS idx_liabilities_due_date ON public.liabilities(school_id, due_date);
CREATE INDEX IF NOT EXISTS idx_liabilities_created_by ON public.liabilities(school_id, created_by);

-- Liability Payments indexes
CREATE INDEX IF NOT EXISTS idx_liability_payments_school_id ON public.liability_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_liability_payments_liability_id ON public.liability_payments(liability_id);
CREATE INDEX IF NOT EXISTS idx_liability_payments_date ON public.liability_payments(school_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_liability_payments_account_id ON public.liability_payments(account_id);

-- Liability Attachments indexes
CREATE INDEX IF NOT EXISTS idx_liability_attachments_liability_id ON public.liability_attachments(liability_id);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Create function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Asset Categories trigger
CREATE TRIGGER update_asset_categories_updated_at
    BEFORE UPDATE ON public.asset_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Assets trigger
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Liability Categories trigger
CREATE TRIGGER update_liability_categories_updated_at
    BEFORE UPDATE ON public.liability_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Liabilities trigger
CREATE TRIGGER update_liabilities_updated_at
    BEFORE UPDATE ON public.liabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE public.asset_categories IS 'Categories for organizing assets (e.g., Buildings, Equipment, Vehicles, Land)';
COMMENT ON TABLE public.assets IS 'Main asset records with purchase details, depreciation, and status';
COMMENT ON TABLE public.asset_depreciations IS 'Depreciation history for assets';
COMMENT ON TABLE public.asset_attachments IS 'File attachments (invoices, receipts, warranties) for assets';

COMMENT ON TABLE public.liability_categories IS 'Categories for organizing liabilities (e.g., Loans, Accounts Payable, Salaries Payable)';
COMMENT ON TABLE public.liabilities IS 'Main liability records with principal, interest (optional), and payment schedule';
COMMENT ON TABLE public.liability_payments IS 'Payment history for liabilities with principal and interest split';
COMMENT ON TABLE public.liability_attachments IS 'File attachments (contracts, agreements) for liabilities';

COMMENT ON COLUMN public.assets.depreciation_method IS 'Method used for depreciation calculation';
COMMENT ON COLUMN public.assets.current_value IS 'Current book value (can be calculated or manually set)';
COMMENT ON COLUMN public.assets.status IS 'Current status of the asset';

COMMENT ON COLUMN public.liabilities.interest_rate IS 'Annual interest rate percentage (optional, NULL by default)';
COMMENT ON COLUMN public.liabilities.current_balance IS 'Current outstanding balance';
COMMENT ON COLUMN public.liabilities.status IS 'Current status of the liability';
COMMENT ON COLUMN public.liability_payments.interest_paid IS 'Interest portion of payment (NULL if liability has no interest rate)';





