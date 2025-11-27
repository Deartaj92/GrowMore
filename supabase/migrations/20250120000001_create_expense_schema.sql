-- Expense Management System Schema
-- This schema creates expense-related tables for tracking school expenditures

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.expense_categories CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.expense_attachments CASCADE;

-- Expense Categories (types of expenses: utilities, salaries, supplies, etc.)
CREATE TABLE public.expense_categories (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color for UI display
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (name, school_id)
);

-- Expenses (main expense records)
CREATE TABLE public.expenses (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'card', 'online', 'other')),
    reference_number VARCHAR(100), -- Cheque number, transaction ID, etc.
    vendor_name VARCHAR(255), -- Supplier/vendor name
    vendor_contact VARCHAR(255), -- Vendor contact info
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Expense Attachments (receipts, invoices, documents)
CREATE TABLE public.expense_attachments (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    expense_id INTEGER NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50), -- MIME type
    file_size BIGINT, -- Size in bytes
    uploaded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_school_id ON public.expense_categories(school_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON public.expense_categories(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_expenses_school_id ON public.expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(school_id, category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(school_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(school_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(school_id, created_by);
CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense_id ON public.expense_attachments(expense_id);

-- Add comments for documentation
COMMENT ON TABLE public.expense_categories IS 'Categories for organizing expenses (e.g., Utilities, Salaries, Supplies)';
COMMENT ON TABLE public.expenses IS 'Main expense records with details about school expenditures';
COMMENT ON TABLE public.expense_attachments IS 'File attachments (receipts, invoices) for expenses';

COMMENT ON COLUMN public.expenses.payment_method IS 'Method used to pay the expense';
COMMENT ON COLUMN public.expenses.reference_number IS 'Transaction reference (cheque number, transaction ID, etc.)';
COMMENT ON COLUMN public.expenses.status IS 'Approval status of the expense';
COMMENT ON COLUMN public.expenses.approved_by IS 'User who approved the expense';
COMMENT ON COLUMN public.expenses.approved_at IS 'Timestamp when expense was approved';

