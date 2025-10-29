-- =====================================================
-- FIX AUDIT USER CONTEXT PERSISTENCE
-- =====================================================
-- This script creates a more robust user context system
-- that persists across database operations
-- =====================================================

-- 1. Create a temporary table to store current user context
CREATE TABLE IF NOT EXISTS public.current_audit_user (
    user_id INTEGER,
    session_id TEXT DEFAULT current_setting('application_name', true),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_current_audit_user_session ON public.current_audit_user(session_id);

-- 3. Update the set_audit_user_id function to use the table
CREATE OR REPLACE FUNCTION set_audit_user_id(user_id INTEGER)
RETURNS void AS $$
DECLARE
    current_session TEXT;
BEGIN
    -- Get current session identifier
    current_session := COALESCE(current_setting('application_name', true), 'default');
    
    -- Delete any existing context for this session
    DELETE FROM public.current_audit_user WHERE session_id = current_session;
    
    -- Insert new context
    INSERT INTO public.current_audit_user (user_id, session_id) 
    VALUES (user_id, current_session);
    
    -- Also set the session variable as backup
    PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the get_current_audit_user_id function
CREATE OR REPLACE FUNCTION get_current_audit_user_id()
RETURNS INTEGER AS $$
DECLARE
    current_session TEXT;
    user_id INTEGER;
BEGIN
    -- Get current session identifier
    current_session := COALESCE(current_setting('application_name', true), 'default');
    
    -- Try to get user ID from table first
    SELECT cau.user_id INTO user_id 
    FROM public.current_audit_user cau 
    WHERE cau.session_id = current_session 
    ORDER BY cau.created_at DESC 
    LIMIT 1;
    
    -- If not found in table, try session variable
    IF user_id IS NULL THEN
        BEGIN
            user_id := current_setting('app.current_user_id', true)::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            user_id := NULL;
        END;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Update the audit logging function with better debugging
CREATE OR REPLACE FUNCTION create_fee_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id INTEGER;
    old_data JSONB;
    new_data JSONB;
    action_type TEXT;
BEGIN
    -- Get current user from context
    current_user_id := get_current_audit_user_id();
    
    -- Debug logging (remove in production)
    RAISE NOTICE 'Audit trigger fired: table=%, operation=%, user_id=%', TG_TABLE_NAME, TG_OP, current_user_id;
    
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

-- 6. Clean up old context data (older than 1 hour)
DELETE FROM public.current_audit_user 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- 7. Test the system
SELECT set_audit_user_id(1) as test_set_user;
SELECT get_current_audit_user_id() as test_get_user;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'AUDIT USER CONTEXT FIXED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '- current_audit_user table for persistent context';
    RAISE NOTICE '- Enhanced set_audit_user_id() function';
    RAISE NOTICE '- Enhanced get_current_audit_user_id() function';
    RAISE NOTICE '- Updated create_fee_audit_log() with debugging';
    RAISE NOTICE '- Cleaned up old context data';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Now audit logs will show actual user names!';
    RAISE NOTICE 'Test user context: %', get_current_audit_user_id();
    RAISE NOTICE '=====================================================';
END $$;

