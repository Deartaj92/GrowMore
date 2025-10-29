-- =====================================================
-- CLEAR ALL FEE DATA SCRIPT
-- =====================================================
-- This script clears all data from fee-related tables
-- to start fresh with fee management.
-- 
-- IMPORTANT: This will permanently delete all fee data!
-- Make sure to backup your data before running this script.
-- =====================================================

-- Disable foreign key checks temporarily to avoid constraint issues
SET session_replication_role = replica;

-- Clear data from fee tables in dependency order (child tables first)
-- This ensures we don't violate foreign key constraints

-- 1. Clear fee audit logs (no dependencies)
TRUNCATE TABLE public.fee_audit_logs CASCADE;

-- 2. Clear fee payments (depends on fee_invoices)
TRUNCATE TABLE public.fee_payments CASCADE;

-- 3. Clear fee invoice items (depends on fee_invoices and fee_heads)
TRUNCATE TABLE public.fee_invoice_items CASCADE;

-- 4. Clear fee invoices (depends on students, sessions, fee_heads)
TRUNCATE TABLE public.fee_invoices CASCADE;

-- 5. Clear student fee concessions (depends on students, fee_heads)
TRUNCATE TABLE public.student_fee_concessions CASCADE;

-- 6. Clear student fee plans (depends on students, sessions, fee_heads)
TRUNCATE TABLE public.student_fee_plans CASCADE;

-- 7. Clear fee structures (depends on classes, sections, sessions, fee_heads)
TRUNCATE TABLE public.fee_structures CASCADE;

-- 8. Clear fee heads (base table - no fee dependencies)
TRUNCATE TABLE public.fee_heads CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset auto-increment sequences to start from 1
-- This ensures new records start with ID 1
ALTER SEQUENCE public.fee_audit_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE public.fee_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE public.fee_invoice_items_id_seq RESTART WITH 1;
ALTER SEQUENCE public.fee_invoices_id_seq RESTART WITH 1;
ALTER SEQUENCE public.student_fee_concessions_id_seq RESTART WITH 1;
ALTER SEQUENCE public.student_fee_plans_id_seq RESTART WITH 1;
ALTER SEQUENCE public.fee_structures_id_seq RESTART WITH 1;
ALTER SEQUENCE public.fee_heads_id_seq RESTART WITH 1;

-- Display confirmation message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FEE DATA CLEARED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'All fee-related data has been removed from:';
    RAISE NOTICE '- fee_audit_logs';
    RAISE NOTICE '- fee_payments';
    RAISE NOTICE '- fee_invoice_items';
    RAISE NOTICE '- fee_invoices';
    RAISE NOTICE '- student_fee_concessions';
    RAISE NOTICE '- student_fee_plans';
    RAISE NOTICE '- fee_structures';
    RAISE NOTICE '- fee_heads';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Auto-increment sequences have been reset to start from 1';
    RAISE NOTICE 'You can now start fresh with fee management setup.';
    RAISE NOTICE '=====================================================';
END $$;

-- Optional: Show current record counts (should all be 0)
SELECT 
    'fee_audit_logs' as table_name, COUNT(*) as record_count FROM public.fee_audit_logs
UNION ALL
SELECT 
    'fee_payments' as table_name, COUNT(*) as record_count FROM public.fee_payments
UNION ALL
SELECT 
    'fee_invoice_items' as table_name, COUNT(*) as record_count FROM public.fee_invoice_items
UNION ALL
SELECT 
    'fee_invoices' as table_name, COUNT(*) as record_count FROM public.fee_invoices
UNION ALL
SELECT 
    'student_fee_concessions' as table_name, COUNT(*) as record_count FROM public.student_fee_concessions
UNION ALL
SELECT 
    'student_fee_plans' as table_name, COUNT(*) as record_count FROM public.student_fee_plans
UNION ALL
SELECT 
    'fee_structures' as table_name, COUNT(*) as record_count FROM public.fee_structures
UNION ALL
SELECT 
    'fee_heads' as table_name, COUNT(*) as record_count FROM public.fee_heads
ORDER BY table_name;

