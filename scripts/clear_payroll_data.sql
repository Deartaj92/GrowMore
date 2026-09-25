-- Clear All Payroll Tables SQL Script
-- Execute this script in the Supabase SQL Editor or psql console to empty all payroll tables.

-- Option A: Complete Reset (Wipe all payroll data including settings and plans)
TRUNCATE TABLE 
    public.payroll_payment_items,
    public.payroll_payments,
    public.payroll_generation_items,
    public.payroll_generations,
    public.payroll_adjustments,
    public.payroll_advances,
    public.payroll_audit_logs,
    public.employee_payroll_plans,
    public.payroll_plan_items,
    public.payroll_plans,
    public.payroll_settings
RESTART IDENTITY CASCADE;

-- Option B: Transactional Data Only (Uncomment below if you wish to keep plans & settings)
/*
TRUNCATE TABLE 
    public.payroll_payment_items,
    public.payroll_payments,
    public.payroll_generation_items,
    public.payroll_generations,
    public.payroll_adjustments,
    public.payroll_advances,
    public.payroll_audit_logs
RESTART IDENTITY CASCADE;
*/
