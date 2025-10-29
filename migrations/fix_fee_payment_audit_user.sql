-- Fix fee payment audit to use received_by field from payment record
-- This ensures the audit log shows the actual user who collected the payment

-- Drop and recreate the audit function to handle fee payments specially
DROP FUNCTION IF EXISTS create_fee_audit_log() CASCADE;

CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    entity_name TEXT;
    action_type TEXT;
    entity_id INTEGER;
    old_data JSONB;
    new_data JSONB;
    current_user_id INTEGER;
    payment_received_by INTEGER;
BEGIN
    -- Determine the entity name from the table name
    entity_name := TG_TABLE_NAME;
    
    -- Determine the action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
        entity_id := NEW.id;
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        entity_id := NEW.id;
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        entity_id := OLD.id;
        old_data := to_jsonb(OLD);
        new_data := NULL;
    END IF;
    
    -- Get current user from session setting
    current_user_id := current_setting('app.current_user_id', true)::INTEGER;
    
    -- For fee payments, prioritize the received_by field from the payment record
    IF entity_name = 'fee_payments' THEN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            payment_received_by := NEW.received_by;
        ELSIF TG_OP = 'DELETE' THEN
            payment_received_by := OLD.received_by;
        END IF;
        
        -- Use received_by if available, otherwise fall back to session user
        IF payment_received_by IS NOT NULL THEN
            current_user_id := payment_received_by;
        END IF;
    END IF;
    
    -- Insert audit log based on entity type
    CASE entity_name
        WHEN 'fee_heads' THEN
            INSERT INTO public.fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
            VALUES (
                COALESCE(NEW.school_id, OLD.school_id),
                'fee_heads',
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
                'fee_structures',
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
                'fee_invoices',
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
                'fee_payments',
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
                'student_fee_plans',
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
                'student_fee_concessions',
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

-- Recreate triggers for fee_payments table
DROP TRIGGER IF EXISTS audit_fee_payments ON public.fee_payments;
CREATE TRIGGER audit_fee_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
    FOR EACH ROW EXECUTE FUNCTION create_fee_audit_log();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_fee_audit_log() TO authenticated;

-- Add comment explaining the special handling
COMMENT ON FUNCTION create_fee_audit_log() IS 'Audit function that prioritizes received_by field for fee_payments to track the actual user who collected the payment';
