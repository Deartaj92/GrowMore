-- Migration: Update get_user_notifications function to include activity_log_id and add performance indexes
-- This migration fixes the issue where activity_log_id was missing from notifications, preventing proper linking to activity logs

-- 1. Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_user_notifications(INTEGER, INTEGER, INTEGER, INTEGER);

-- 2. Recreate get_user_notifications function with activity_log_id and activity_action in return table
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
        al.activity_action, -- Include activity_action to identify delete actions
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

-- 2. Add performance indexes for better query performance
-- Index for activity_log_id lookups (critical for linking notifications to activity logs)
CREATE INDEX IF NOT EXISTS idx_notifications_activity_log_id ON notifications(activity_log_id);

-- Index for notification_type filtering (used for filtering report notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON notifications(notification_type);

-- Index for activity_action filtering (used for checking delete actions)
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_action ON activity_logs(activity_action);

-- Index for entity_id lookups (used for finding reports by ID)
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id);

