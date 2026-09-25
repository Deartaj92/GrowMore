-- Migration: Drop all fee-related tables, views, functions, triggers, and permissions
-- Description: Clean removal of legacy Fee system database objects to allow building a brand new Fee system.

-- ==========================================
-- 1. DROP ALL FEE TABLES (CASCADE)
-- ==========================================

DROP TABLE IF EXISTS public.fee_payment_items CASCADE;
DROP TABLE IF EXISTS public.fee_payments CASCADE;
DROP TABLE IF EXISTS public.fee_challans_items CASCADE;
DROP TABLE IF EXISTS public.fee_challan_items CASCADE;
DROP TABLE IF EXISTS public.fee_challans CASCADE;
DROP TABLE IF EXISTS public.fee_invoice_items CASCADE;
DROP TABLE IF EXISTS public.fee_invoices CASCADE;
DROP TABLE IF EXISTS public.fee_arrears CASCADE;
DROP TABLE IF EXISTS public.fee_increment_history CASCADE;
DROP TABLE IF EXISTS public.student_fee_concessions CASCADE;
DROP TABLE IF EXISTS public.student_fee_plans CASCADE;
DROP TABLE IF EXISTS public.fee_structures CASCADE;
DROP TABLE IF EXISTS public.fee_heads CASCADE;
DROP TABLE IF EXISTS public.fee_settings CASCADE;
DROP TABLE IF EXISTS public.fee_audit_logs CASCADE;

-- ==========================================
-- 2. DROP FEE FUNCTIONS & PROCEDURES
-- ==========================================

DROP FUNCTION IF EXISTS public.fee_audit_logs_set_id() CASCADE;
DROP FUNCTION IF EXISTS public.fee_payments_set_id() CASCADE;
DROP FUNCTION IF EXISTS public.fee_invoice_items_set_id() CASCADE;
DROP FUNCTION IF EXISTS public.fee_invoices_set_id() CASCADE;
DROP FUNCTION IF EXISTS public.student_fee_plans_set_id() CASCADE;
DROP FUNCTION IF EXISTS public.fee_structures_set_id() CASCADE;
DROP FUNCTION IF EXISTS public.fee_heads_set_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_fee_summary(BIGINT, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.fetch_fee_summary(BIGINT, DATE) CASCADE;

-- ==========================================
-- 3. CLEAN UP FEE PERMISSIONS
-- ==========================================

-- Remove fee role_permissions and user_permissions
DELETE FROM public.role_permissions
WHERE permission_id IN (
    SELECT id FROM public.permissions 
    WHERE key IN (
        'fee-structure',
        'fee-plans',
        'fee-increments',
        'generate-challans',
        'view-challans',
        'fee-collection',
        'fee-defaulters',
        'fee-arrears',
        'fee-audit-logs',
        'fee-analytics',
        'payments-analytics',
        'payment-history',
        'fee-ledger',
        'dashboard-tab-fee'
    ) OR category = 'Fee Management'
);

DELETE FROM public.user_permissions
WHERE permission_id IN (
    SELECT id FROM public.permissions 
    WHERE key IN (
        'fee-structure',
        'fee-plans',
        'fee-increments',
        'generate-challans',
        'view-challans',
        'fee-collection',
        'fee-defaulters',
        'fee-arrears',
        'fee-audit-logs',
        'fee-analytics',
        'payments-analytics',
        'payment-history',
        'fee-ledger',
        'dashboard-tab-fee'
    ) OR category = 'Fee Management'
);

-- Remove permissions entries
DELETE FROM public.permissions 
WHERE key IN (
    'fee-structure',
    'fee-plans',
    'fee-increments',
    'generate-challans',
    'view-challans',
    'fee-collection',
    'fee-defaulters',
    'fee-arrears',
    'fee-audit-logs',
    'fee-analytics',
    'payments-analytics',
    'payment-history',
    'fee-ledger',
    'dashboard-tab-fee'
) OR category = 'Fee Management';
