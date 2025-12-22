-- Clear ALL fee, expense, and asset/liability tables INCLUDING categories
-- This script will DELETE all data from these tables including category definitions
-- WARNING: This is irreversible! Make sure you have backups.

-- ==========================================
-- FEE TABLES (Complete - including categories)
-- ==========================================

-- Delete in order to respect foreign key constraints
DELETE FROM public.fee_payment_items;
DELETE FROM public.fee_audit_logs;
DELETE FROM public.fee_payments;
DELETE FROM public.fee_invoice_items;
DELETE FROM public.fee_invoices;
DELETE FROM public.student_fee_concessions;
DELETE FROM public.student_fee_plans;
DELETE FROM public.fee_structures;
DELETE FROM public.fee_heads;

-- ==========================================
-- EXPENSE TABLES (Complete - including categories)
-- ==========================================

-- Delete in order to respect foreign key constraints
DELETE FROM public.expense_attachments;
DELETE FROM public.expenses;
DELETE FROM public.expense_categories;

-- ==========================================
-- ASSET TABLES (Complete - including categories)
-- ==========================================

-- Delete in order to respect foreign key constraints
DELETE FROM public.asset_attachments;
DELETE FROM public.asset_depreciations;
DELETE FROM public.assets;
DELETE FROM public.asset_categories;

-- ==========================================
-- LIABILITY TABLES (Complete - including categories)
-- ==========================================

-- Delete in order to respect foreign key constraints
DELETE FROM public.liability_attachments;
DELETE FROM public.liability_payments;
DELETE FROM public.liabilities;
DELETE FROM public.liability_categories;

-- ==========================================
-- OTHER INCOME TABLES (Complete - including categories)
-- ==========================================

-- Delete in order to respect foreign key constraints
DELETE FROM public.other_incomes;
DELETE FROM public.income_categories;

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Run this to verify all tables are empty
SELECT 
    'fee_payment_items' as table_name, 
    COUNT(*) as remaining_count 
FROM public.fee_payment_items
UNION ALL
SELECT 'fee_audit_logs', COUNT(*) FROM public.fee_audit_logs
UNION ALL
SELECT 'fee_payments', COUNT(*) FROM public.fee_payments
UNION ALL
SELECT 'fee_invoice_items', COUNT(*) FROM public.fee_invoice_items
UNION ALL
SELECT 'fee_invoices', COUNT(*) FROM public.fee_invoices
UNION ALL
SELECT 'student_fee_concessions', COUNT(*) FROM public.student_fee_concessions
UNION ALL
SELECT 'student_fee_plans', COUNT(*) FROM public.student_fee_plans
UNION ALL
SELECT 'fee_structures', COUNT(*) FROM public.fee_structures
UNION ALL
SELECT 'fee_heads', COUNT(*) FROM public.fee_heads
UNION ALL
SELECT 'expense_attachments', COUNT(*) FROM public.expense_attachments
UNION ALL
SELECT 'expenses', COUNT(*) FROM public.expenses
UNION ALL
SELECT 'expense_categories', COUNT(*) FROM public.expense_categories
UNION ALL
SELECT 'asset_attachments', COUNT(*) FROM public.asset_attachments
UNION ALL
SELECT 'asset_depreciations', COUNT(*) FROM public.asset_depreciations
UNION ALL
SELECT 'assets', COUNT(*) FROM public.assets
UNION ALL
SELECT 'asset_categories', COUNT(*) FROM public.asset_categories
UNION ALL
SELECT 'liability_attachments', COUNT(*) FROM public.liability_attachments
UNION ALL
SELECT 'liability_payments', COUNT(*) FROM public.liability_payments
UNION ALL
SELECT 'liabilities', COUNT(*) FROM public.liabilities
UNION ALL
SELECT 'liability_categories', COUNT(*) FROM public.liability_categories
UNION ALL
SELECT 'other_incomes', COUNT(*) FROM public.other_incomes
UNION ALL
SELECT 'income_categories', COUNT(*) FROM public.income_categories
ORDER BY table_name;

