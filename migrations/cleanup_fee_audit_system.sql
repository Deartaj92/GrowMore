-- =====================================================
-- CLEANUP FEE AUDIT SYSTEM
-- =====================================================
-- This script removes all fee audit related tables and functions
-- to start fresh
-- =====================================================

-- 1. Drop all triggers first (only if tables exist)
DO $$
BEGIN
    -- Drop triggers only if the parent tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_heads' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_fee_heads ON public.fee_heads CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_structures' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_fee_structures ON public.fee_structures CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_invoices' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_fee_invoices ON public.fee_invoices CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_payments' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_fee_payments ON public.fee_payments CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_fee_plans' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_student_fee_plans ON public.student_fee_plans CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_fee_concessions' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_student_fee_concessions ON public.student_fee_concessions CASCADE;
    END IF;
END $$;

-- 2. Drop all functions
DROP FUNCTION IF EXISTS create_fee_audit_log() CASCADE;
DROP FUNCTION IF EXISTS log_fee_change() CASCADE;
DROP FUNCTION IF EXISTS set_audit_user_id(INTEGER) CASCADE;

-- 3. Drop the audit logs table (only if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_audit_logs' AND table_schema = 'public') THEN
        DROP TABLE public.fee_audit_logs CASCADE;
        RAISE NOTICE 'Dropped fee_audit_logs table';
    ELSE
        RAISE NOTICE 'fee_audit_logs table does not exist, skipping';
    END IF;
END $$;

-- 4. Drop any related indexes (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fee_audit_logs_school_id') THEN
        DROP INDEX idx_fee_audit_logs_school_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fee_audit_logs_entity_lookup') THEN
        DROP INDEX idx_fee_audit_logs_entity_lookup;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fee_audit_logs_user_lookup') THEN
        DROP INDEX idx_fee_audit_logs_user_lookup;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fee_audit_logs_changed_at') THEN
        DROP INDEX idx_fee_audit_logs_changed_at;
    END IF;
END $$;

-- Display cleanup message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FEE AUDIT SYSTEM CLEANUP COMPLETED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Removed:';
    RAISE NOTICE '- All fee audit triggers';
    RAISE NOTICE '- All fee audit functions';
    RAISE NOTICE '- fee_audit_logs table';
    RAISE NOTICE '- All related indexes and policies';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'You can now run the setup script to create a fresh audit system.';
    RAISE NOTICE '=====================================================';
END $$;
