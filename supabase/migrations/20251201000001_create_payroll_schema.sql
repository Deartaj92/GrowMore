-- Payroll Management System Schema
-- This schema creates payroll-related tables for managing employee salaries, payments, and related operations

-- Payroll Settings (General payroll configuration)
CREATE TABLE IF NOT EXISTS public.payroll_settings (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    monthly_working_days INTEGER NOT NULL DEFAULT 26 CHECK (monthly_working_days > 0 AND monthly_working_days <= 31),
    allowed_leaves_per_month INTEGER NOT NULL DEFAULT 2 CHECK (allowed_leaves_per_month >= 0),
    leave_deduction_method VARCHAR(20) DEFAULT 'full_day' CHECK (leave_deduction_method IN ('full_day', 'half_day', 'proportional')),
    salary_calculation_method VARCHAR(20) DEFAULT 'monthly' CHECK (salary_calculation_method IN ('monthly', 'daily', 'hourly')),
    default_payment_mode VARCHAR(30) DEFAULT 'bank_transfer' CHECK (default_payment_mode IN ('cash', 'bank_transfer', 'cheque', 'upi', 'other')),
    auto_approve_payroll BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (school_id)
);

-- Payroll Plans (Salary structure templates)
CREATE TABLE IF NOT EXISTS public.payroll_plans (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    basic_pay NUMERIC(12,2) NOT NULL CHECK (basic_pay >= 0),
    effective_from DATE NOT NULL,
    effective_to DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payroll Plan Items (Allowances and deductions per plan)
CREATE TABLE IF NOT EXISTS public.payroll_plan_items (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES public.payroll_plans(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('allowance', 'deduction')),
    name VARCHAR(255) NOT NULL,
    amount_type VARCHAR(20) NOT NULL CHECK (amount_type IN ('fixed', 'percentage')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    is_taxable BOOLEAN DEFAULT FALSE,
    calculation_basis VARCHAR(50), -- e.g., 'basic_pay', 'gross_salary'
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Payroll Plans (Assignment of plans to employees)
CREATE TABLE IF NOT EXISTS public.employee_payroll_plans (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES public.payroll_plans(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (staff_id, effective_from, school_id)
);

-- Payroll Generations (Generated payroll records per employee per month)
CREATE TABLE IF NOT EXISTS public.payroll_generations (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    payroll_month INTEGER NOT NULL CHECK (payroll_month >= 1 AND payroll_month <= 12),
    payroll_year INTEGER NOT NULL CHECK (payroll_year > 2000),
    total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_earnings >= 0),
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_deductions >= 0),
    net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    working_days INTEGER,
    present_days INTEGER,
    leave_days INTEGER,
    absent_days INTEGER,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
    approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    generated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (staff_id, payroll_month, payroll_year, school_id)
);

-- Payroll Generation Items (Breakdown of earnings/deductions per generation)
CREATE TABLE IF NOT EXISTS public.payroll_generation_items (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    generation_id INTEGER NOT NULL REFERENCES public.payroll_generations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('allowance', 'deduction', 'adjustment')),
    amount NUMERIC(12,2) NOT NULL,
    calculation_basis TEXT, -- Description of how this amount was calculated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payroll Payments (Salary payment records)
CREATE TABLE IF NOT EXISTS public.payroll_payments (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    generation_id INTEGER NOT NULL REFERENCES public.payroll_generations(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(30) NOT NULL CHECK (payment_mode IN ('cash', 'bank_transfer', 'cheque', 'upi', 'other')),
    reference_no VARCHAR(100),
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    received_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payroll Advances (Advance payment records with auto-deduction tracking)
CREATE TABLE IF NOT EXISTS public.payroll_advances (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    advance_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    repayment_amount_per_month NUMERIC(12,2) NOT NULL CHECK (repayment_amount_per_month > 0),
    remaining_balance NUMERIC(12,2) NOT NULL CHECK (remaining_balance >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    reason TEXT,
    approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payroll Adjustments (Bonuses, fines, extra cuts - one-time adjustments)
CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('bonus', 'fine', 'extra_cut', 'other')),
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    payroll_month INTEGER NOT NULL CHECK (payroll_month >= 1 AND payroll_month <= 12),
    payroll_year INTEGER NOT NULL CHECK (payroll_year > 2000),
    is_applied BOOLEAN DEFAULT FALSE,
    applied_to_generation_id INTEGER REFERENCES public.payroll_generations(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payroll Audit Logs (Audit trail for all payroll changes)
CREATE TABLE IF NOT EXISTS public.payroll_audit_logs (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    entity VARCHAR(50) NOT NULL, -- 'payroll_plan', 'payroll_generation', 'payroll_payment', etc.
    entity_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject')),
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_settings_school_id ON public.payroll_settings(school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_plans_school_id ON public.payroll_plans(school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_plans_status ON public.payroll_plans(school_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_plan_items_plan_id ON public.payroll_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_payroll_plan_items_school_id ON public.payroll_plan_items(school_id);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_plans_staff_id ON public.employee_payroll_plans(staff_id);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_plans_school_id ON public.employee_payroll_plans(school_id);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_plans_active ON public.employee_payroll_plans(school_id, staff_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_payroll_generations_staff_id ON public.payroll_generations(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_generations_school_id ON public.payroll_generations(school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_generations_month_year ON public.payroll_generations(school_id, payroll_year, payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_generations_status ON public.payroll_generations(school_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_generation_items_generation_id ON public.payroll_generation_items(generation_id);
CREATE INDEX IF NOT EXISTS idx_payroll_generation_items_school_id ON public.payroll_generation_items(school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_generation_id ON public.payroll_payments(generation_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_school_id ON public.payroll_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_date ON public.payroll_payments(school_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payroll_advances_staff_id ON public.payroll_advances(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_advances_school_id ON public.payroll_advances(school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_advances_status ON public.payroll_advances(school_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_staff_id ON public.payroll_adjustments(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_school_id ON public.payroll_adjustments(school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_month_year ON public.payroll_adjustments(school_id, payroll_year, payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_applied ON public.payroll_adjustments(school_id, is_applied) WHERE is_applied = FALSE;
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_school_id ON public.payroll_audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_entity ON public.payroll_audit_logs(school_id, entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_changed_at ON public.payroll_audit_logs(school_id, changed_at DESC);

-- Create triggers for updated_at columns
CREATE TRIGGER update_payroll_settings_updated_at
    BEFORE UPDATE ON public.payroll_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_plans_updated_at
    BEFORE UPDATE ON public.payroll_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_plan_items_updated_at
    BEFORE UPDATE ON public.payroll_plan_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_payroll_plans_updated_at
    BEFORE UPDATE ON public.employee_payroll_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_generations_updated_at
    BEFORE UPDATE ON public.payroll_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_payments_updated_at
    BEFORE UPDATE ON public.payroll_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_advances_updated_at
    BEFORE UPDATE ON public.payroll_advances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_adjustments_updated_at
    BEFORE UPDATE ON public.payroll_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.payroll_settings IS 'General payroll configuration settings per school';
COMMENT ON TABLE public.payroll_plans IS 'Salary structure templates with basic pay and allowances';
COMMENT ON TABLE public.payroll_plan_items IS 'Individual allowance/deduction items per payroll plan';
COMMENT ON TABLE public.employee_payroll_plans IS 'Assignment of payroll plans to employees with effective dates';
COMMENT ON TABLE public.payroll_generations IS 'Generated payroll records per employee per month';
COMMENT ON TABLE public.payroll_generation_items IS 'Breakdown of earnings/deductions per payroll generation';
COMMENT ON TABLE public.payroll_payments IS 'Salary payment records';
COMMENT ON TABLE public.payroll_advances IS 'Advance payment records with automatic deduction tracking';
COMMENT ON TABLE public.payroll_adjustments IS 'One-time adjustments (bonuses, fines, extra cuts)';
COMMENT ON TABLE public.payroll_audit_logs IS 'Audit trail for all payroll-related changes';

-- Grant permissions
GRANT ALL ON public.payroll_settings TO authenticated;
GRANT ALL ON public.payroll_plans TO authenticated;
GRANT ALL ON public.payroll_plan_items TO authenticated;
GRANT ALL ON public.employee_payroll_plans TO authenticated;
GRANT ALL ON public.payroll_generations TO authenticated;
GRANT ALL ON public.payroll_generation_items TO authenticated;
GRANT ALL ON public.payroll_payments TO authenticated;
GRANT ALL ON public.payroll_advances TO authenticated;
GRANT ALL ON public.payroll_adjustments TO authenticated;
GRANT ALL ON public.payroll_audit_logs TO authenticated;

GRANT USAGE ON SEQUENCE public.payroll_settings_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.payroll_plans_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.payroll_plan_items_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.employee_payroll_plans_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.payroll_generations_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.payroll_generation_items_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.payroll_payments_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.payroll_advances_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.payroll_adjustments_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.payroll_audit_logs_id_seq TO authenticated;


