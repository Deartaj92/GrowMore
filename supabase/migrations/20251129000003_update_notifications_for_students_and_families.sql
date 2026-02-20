-- Update notifications table and functions to support students and families
-- This migration ensures students and parents can receive notifications properly

-- 1. Update the recipient_id constraint to allow both staff and student IDs
-- First, drop the existing foreign key constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;

-- Note: We can't directly reference both staff(id) and students(id) with a single FK
-- So we'll remove the FK constraint and rely on application-level validation
-- The recipient_id can now be either:
-- - staff.id (for staff notifications)
-- - students.id (for student notifications)  
-- - NULL (for family notifications using family_recipient_id)

-- 2. Update get_user_notifications function to support both staff and student recipient_ids
DROP FUNCTION IF EXISTS get_user_notifications(INTEGER, INTEGER, INTEGER, INTEGER);

CREATE FUNCTION get_user_notifications(
    p_user_id INTEGER,
    p_school_id INTEGER,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id INTEGER,
    notification_type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    activity_log_id INTEGER,
    activity_action VARCHAR(50),
    is_read BOOLEAN,
    is_important BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.notification_type,
        n.title,
        n.message,
        n.activity_log_id,
        al.activity_action,
        n.is_read,
        n.is_important,
        n.created_at,
        n.read_at
    FROM notifications n
    LEFT JOIN activity_logs al ON n.activity_log_id = al.id
    WHERE n.recipient_id = p_user_id 
    AND n.school_id = p_school_id
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to get family notifications
CREATE OR REPLACE FUNCTION get_family_notifications(
    p_family_id INTEGER,
    p_school_id INTEGER,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id INTEGER,
    notification_type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    activity_log_id INTEGER,
    activity_action VARCHAR(50),
    is_read BOOLEAN,
    is_important BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.notification_type,
        n.title,
        n.message,
        n.activity_log_id,
        al.activity_action,
        n.is_read,
        n.is_important,
        n.created_at,
        n.read_at
    FROM notifications n
    LEFT JOIN activity_logs al ON n.activity_log_id = al.id
    WHERE n.family_recipient_id = p_family_id 
    AND n.school_id = p_school_id
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 4. Create index for family_recipient_id lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_notifications_family_recipient_id ON notifications(family_recipient_id);

-- 5. Create index for recipient_id lookups (for both staff and students)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);

-- 6. Create composite index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_school ON notifications(recipient_id, school_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_family_school ON notifications(family_recipient_id, school_id) WHERE family_recipient_id IS NOT NULL;

