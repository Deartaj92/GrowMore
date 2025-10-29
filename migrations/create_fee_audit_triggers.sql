-- =====================================================
-- FEE AUDIT TRIGGERS
-- =====================================================
-- This script creates triggers to automatically log
-- all changes to fee-related tables
-- =====================================================

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT;
    old_data JSONB;
    new_data JSONB;
    action_type TEXT;
    entity_id INTEGER;
BEGIN
    -- Get table name
    table_name := TG_TABLE_NAME;
    
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
    
    -- Map table names to entity names
    CASE table_name
        WHEN 'fee_heads' THEN
            INSERT INTO fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'fee_head',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_setting('app.current_user_id', true)::INTEGER
            );
        WHEN 'fee_structures' THEN
            INSERT INTO fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'fee_structure',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_setting('app.current_user_id', true)::INTEGER
            );
        WHEN 'fee_invoices' THEN
            INSERT INTO fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'fee_invoice',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_setting('app.current_user_id', true)::INTEGER
            );
        WHEN 'fee_payments' THEN
            INSERT INTO fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'fee_payment',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_setting('app.current_user_id', true)::INTEGER
            );
        WHEN 'student_fee_plans' THEN
            INSERT INTO fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'student_fee_plan',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_setting('app.current_user_id', true)::INTEGER
            );
        WHEN 'student_fee_concessions' THEN
            INSERT INTO fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'student_fee_concession',
                entity_id,
                action_type,
                old_data,
                new_data,
                current_setting('app.current_user_id', true)::INTEGER
            );
    END CASE;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each fee table
DROP TRIGGER IF EXISTS audit_fee_heads ON fee_heads;
CREATE TRIGGER audit_fee_heads
    AFTER INSERT OR UPDATE OR DELETE ON fee_heads
    FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();

DROP TRIGGER IF EXISTS audit_fee_structures ON fee_structures;
CREATE TRIGGER audit_fee_structures
    AFTER INSERT OR UPDATE OR DELETE ON fee_structures
    FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();

DROP TRIGGER IF EXISTS audit_fee_invoices ON fee_invoices;
CREATE TRIGGER audit_fee_invoices
    AFTER INSERT OR UPDATE OR DELETE ON fee_invoices
    FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();

DROP TRIGGER IF EXISTS audit_fee_payments ON fee_payments;
CREATE TRIGGER audit_fee_payments
    AFTER INSERT OR UPDATE OR DELETE ON fee_payments
    FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();

DROP TRIGGER IF EXISTS audit_student_fee_plans ON student_fee_plans;
CREATE TRIGGER audit_student_fee_plans
    AFTER INSERT OR UPDATE OR DELETE ON student_fee_plans
    FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();

DROP TRIGGER IF EXISTS audit_student_fee_concessions ON student_fee_concessions;
CREATE TRIGGER audit_student_fee_concessions
    AFTER INSERT OR UPDATE OR DELETE ON student_fee_concessions
    FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();

-- Function to set current user ID for audit logging
CREATE OR REPLACE FUNCTION set_audit_user_id(user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_fee_audit_log() TO authenticated;
GRANT EXECUTE ON FUNCTION set_audit_user_id(INTEGER) TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_entity_lookup 
ON fee_audit_logs(school_id, entity, entity_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_user_lookup 
ON fee_audit_logs(school_id, changed_by, changed_at DESC);

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FEE AUDIT TRIGGERS CREATED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Audit triggers have been created for:';
    RAISE NOTICE '- fee_heads';
    RAISE NOTICE '- fee_structures';
    RAISE NOTICE '- fee_invoices';
    RAISE NOTICE '- fee_payments';
    RAISE NOTICE '- student_fee_plans';
    RAISE NOTICE '- student_fee_concessions';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'All changes to these tables will now be automatically logged.';
    RAISE NOTICE 'Use set_audit_user_id(user_id) to track which user made changes.';
    RAISE NOTICE '=====================================================';
END $$;

