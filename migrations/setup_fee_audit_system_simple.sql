-- =====================================================
-- SIMPLE FEE AUDIT SYSTEM SETUP
-- =====================================================
-- This script creates a simplified fee audit system
-- without foreign key constraints to avoid type issues
-- =====================================================

-- 1. Create the fee_audit_logs table (simple version)
CREATE TABLE IF NOT EXISTS public.fee_audit_logs (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_school_id ON public.fee_audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_entity_lookup ON public.fee_audit_logs(school_id, entity, entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_user_lookup ON public.fee_audit_logs(school_id, changed_by, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_changed_at ON public.fee_audit_logs(changed_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.fee_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can read audit logs for their school" ON public.fee_audit_logs
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert audit logs for their school" ON public.fee_audit_logs
    FOR INSERT WITH CHECK (
        school_id IN (
            SELECT school_id FROM public.users WHERE id = auth.uid()
        )
    );

-- 5. Create simple audit logging function
CREATE OR REPLACE FUNCTION log_fee_change()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT;
    old_data JSONB;
    new_data JSONB;
    action_type TEXT;
    entity_id INTEGER;
    current_user_id INTEGER;
BEGIN
    -- Get table name
    table_name := TG_TABLE_NAME;
    
    -- Get current user ID from session (default to 0 if not set)
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := 0;
    END;
    
    -- Determine action type
    IF TG_OP = 'DELETE' THEN
        action_type := 'delete';
        old_data := to_jsonb(OLD);
        new_data := NULL;
        entity_id := OLD.id;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        entity_id := NEW.id;
    ELSIF TG_OP = 'INSERT' THEN
        action_type := 'create';
        old_data := NULL;
        new_data := to_jsonb(NEW);
        entity_id := NEW.id;
    END IF;
    
    -- Insert audit log based on table name
    CASE table_name
        WHEN 'fee_heads' THEN
            INSERT INTO public.fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'fee_head',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_user_id
            );
        WHEN 'fee_structures' THEN
            INSERT INTO public.fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'fee_structure',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_user_id
            );
        WHEN 'fee_invoices' THEN
            INSERT INTO public.fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'fee_invoice',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_user_id
            );
        WHEN 'fee_payments' THEN
            INSERT INTO public.fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'fee_payment',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_user_id
            );
        WHEN 'student_fee_plans' THEN
            INSERT INTO public.fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'student_fee_plan',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_user_id
            );
        WHEN 'student_fee_concessions' THEN
            INSERT INTO public.fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'student_fee_concession',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_user_id
            );
    END CASE;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to set current user for audit logging
CREATE OR REPLACE FUNCTION set_audit_user_id(user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create triggers for each fee table (only if tables exist)
DO $$
BEGIN
    -- Check if fee_heads table exists and create trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_heads' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_fee_heads ON public.fee_heads;
        CREATE TRIGGER audit_fee_heads
            AFTER INSERT OR UPDATE OR DELETE ON public.fee_heads
            FOR EACH ROW EXECUTE FUNCTION log_fee_change();
    END IF;

    -- Check if fee_structures table exists and create trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_structures' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_fee_structures ON public.fee_structures;
        CREATE TRIGGER audit_fee_structures
            AFTER INSERT OR UPDATE OR DELETE ON public.fee_structures
            FOR EACH ROW EXECUTE FUNCTION log_fee_change();
    END IF;

    -- Check if fee_invoices table exists and create trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_invoices' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_fee_invoices ON public.fee_invoices;
        CREATE TRIGGER audit_fee_invoices
            AFTER INSERT OR UPDATE OR DELETE ON public.fee_invoices
            FOR EACH ROW EXECUTE FUNCTION log_fee_change();
    END IF;

    -- Check if fee_payments table exists and create trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_payments' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_fee_payments ON public.fee_payments;
        CREATE TRIGGER audit_fee_payments
            AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
            FOR EACH ROW EXECUTE FUNCTION log_fee_change();
    END IF;

    -- Check if student_fee_plans table exists and create trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_fee_plans' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_student_fee_plans ON public.student_fee_plans;
        CREATE TRIGGER audit_student_fee_plans
            AFTER INSERT OR UPDATE OR DELETE ON public.student_fee_plans
            FOR EACH ROW EXECUTE FUNCTION log_fee_change();
    END IF;

    -- Check if student_fee_concessions table exists and create trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_fee_concessions' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_student_fee_concessions ON public.student_fee_concessions;
        CREATE TRIGGER audit_student_fee_concessions
            AFTER INSERT OR UPDATE OR DELETE ON public.student_fee_concessions
            FOR EACH ROW EXECUTE FUNCTION log_fee_change();
    END IF;
END $$;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_audit_user_id(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_fee_change() TO authenticated;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'SIMPLE FEE AUDIT SYSTEM SETUP COMPLETED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '- fee_audit_logs table with RLS policies';
    RAISE NOTICE '- Performance indexes';
    RAISE NOTICE '- Simple audit logging function';
    RAISE NOTICE '- Database triggers for fee tables';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'The fee audit system is now ready to use!';
    RAISE NOTICE 'All changes to fee tables will be automatically logged.';
    RAISE NOTICE '=====================================================';
END $$;

