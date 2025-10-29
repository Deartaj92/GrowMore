-- =====================================================
-- FIX AUDIT USER TRACKING
-- =====================================================
-- This script creates a proper audit system that captures
-- the actual user making changes instead of showing "System"
-- =====================================================

-- 1. Create a function to set current user context
CREATE OR REPLACE FUNCTION set_audit_user_id(user_id INTEGER)
RETURNS void AS $$
BEGIN
    -- Set a session variable to track the current user
    PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to get current user from context
CREATE OR REPLACE FUNCTION get_current_audit_user_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(current_setting('app.current_user_id', true)::INTEGER, NULL);
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Create audit logging function that uses user context
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id INTEGER;
    old_data JSONB;
    new_data JSONB;
    action_type TEXT;
BEGIN
    -- Get current user from session context
    current_user_id := get_current_audit_user_id();
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    END IF;
    
    -- Insert audit log
    INSERT INTO public.fee_audit_logs (
        school_id,
        entity,
        entity_id,
        action,
        old_values,
        new_values,
        changed_by,
        changed_at
    ) VALUES (
        COALESCE(NEW.school_id, OLD.school_id),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        action_type,
        old_data,
        new_data,
        current_user_id,
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create triggers for fee-related tables
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS audit_fee_heads ON public.fee_heads;
    DROP TRIGGER IF EXISTS audit_fee_structures ON public.fee_structures;
    DROP TRIGGER IF EXISTS audit_fee_invoices ON public.fee_invoices;
    DROP TRIGGER IF EXISTS audit_fee_payments ON public.fee_payments;
    DROP TRIGGER IF EXISTS audit_student_fee_plans ON public.student_fee_plans;
    DROP TRIGGER IF EXISTS audit_student_fee_concessions ON public.student_fee_concessions;
    
    -- Create new triggers
    CREATE TRIGGER audit_fee_heads
        AFTER INSERT OR UPDATE OR DELETE ON public.fee_heads
        FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();
    
    CREATE TRIGGER audit_fee_structures
        AFTER INSERT OR UPDATE OR DELETE ON public.fee_structures
        FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();
    
    CREATE TRIGGER audit_fee_invoices
        AFTER INSERT OR UPDATE OR DELETE ON public.fee_invoices
        FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();
    
    CREATE TRIGGER audit_fee_payments
        AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
        FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();
    
    CREATE TRIGGER audit_student_fee_plans
        AFTER INSERT OR UPDATE OR DELETE ON public.student_fee_plans
        FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();
    
    CREATE TRIGGER audit_student_fee_concessions
        AFTER INSERT OR UPDATE OR DELETE ON public.student_fee_concessions
        FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();
END $$;

-- 5. Clear existing test data
DELETE FROM public.fee_audit_logs WHERE entity = 'test';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'AUDIT USER TRACKING FIXED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '- set_audit_user_id() function';
    RAISE NOTICE '- get_current_audit_user_id() function';
    RAISE NOTICE '- create_fee_audit_log() trigger function';
    RAISE NOTICE '- Audit triggers for all fee tables';
    RAISE NOTICE '- Cleared test data';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Now audit logs will show actual user names!';
    RAISE NOTICE '=====================================================';
END $$;

