-- Activity Tracking System for Teachers (Fixed Version)
-- This file creates the necessary tables and functions for tracking teacher activities

-- 1. Create activity_logs table to track all teacher activities
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'attendance', 'test_marks', 'examination_marks', etc.
    activity_action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'view'
    entity_type VARCHAR(50) NOT NULL, -- 'attendance', 'test_record', 'examination_marks', etc.
    entity_id INTEGER, -- ID of the specific record being modified
    entity_name VARCHAR(255), -- Human-readable name of the entity
    details JSONB, -- Additional details about the activity
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'activity', 'system', 'alert'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    activity_log_id INTEGER REFERENCES activity_logs(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create notification_preferences table for user preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    activity_notifications BOOLEAN DEFAULT TRUE,
    system_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, school_id)
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_teacher_id ON activity_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_school_id ON activity_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_activity_log_id ON notifications(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_school_id ON notification_preferences(school_id);

-- Additional indexes for report activities
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_action ON activity_logs(activity_action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id);

-- 5. Create function to log teacher activities
CREATE OR REPLACE FUNCTION log_teacher_activity(
    p_teacher_id INTEGER,
    p_school_id INTEGER,
    p_activity_type VARCHAR(50),
    p_activity_action VARCHAR(50),
    p_entity_type VARCHAR(50),
    p_entity_id INTEGER DEFAULT NULL,
    p_entity_name VARCHAR(255) DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    activity_id INTEGER;
BEGIN
    INSERT INTO activity_logs (
        teacher_id, school_id, activity_type, activity_action, 
        entity_type, entity_id, entity_name, details, 
        ip_address, user_agent
    ) VALUES (
        p_teacher_id, p_school_id, p_activity_type, p_activity_action,
        p_entity_type, p_entity_id, p_entity_name, p_details,
        p_ip_address, p_user_agent
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_recipient_id INTEGER,
    p_school_id INTEGER,
    p_notification_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_activity_log_id INTEGER DEFAULT NULL,
    p_is_important BOOLEAN DEFAULT FALSE,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    notification_id INTEGER;
BEGIN
    INSERT INTO notifications (
        recipient_id, school_id, notification_type, title, message,
        activity_log_id, is_important, expires_at
    ) VALUES (
        p_recipient_id, p_school_id, p_notification_type, p_title, p_message,
        p_activity_log_id, p_is_important, p_expires_at
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id INTEGER, p_school_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE recipient_id = p_user_id 
    AND school_id = p_school_id 
    AND is_read = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id INTEGER, p_school_id INTEGER, p_notification_ids INTEGER[] DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Mark all unread notifications as read
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE recipient_id = p_user_id 
        AND school_id = p_school_id 
        AND is_read = FALSE;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
    ELSE
        -- Mark specific notifications as read
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE recipient_id = p_user_id 
        AND school_id = p_school_id 
        AND id = ANY(p_notification_ids);
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
    END IF;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to get recent activities for a teacher
CREATE OR REPLACE FUNCTION get_teacher_recent_activities(
    p_teacher_id INTEGER,
    p_school_id INTEGER,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    id INTEGER,
    activity_type VARCHAR(50),
    activity_action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_name VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.activity_type,
        al.activity_action,
        al.entity_type,
        al.entity_name,
        al.details,
        al.created_at
    FROM activity_logs al
    WHERE al.teacher_id = p_teacher_id 
    AND al.school_id = p_school_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get notifications for a user
CREATE OR REPLACE FUNCTION get_user_notifications(
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

-- 11. Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_logs_updated_at
    BEFORE UPDATE ON activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id, school_id, activity_notifications, system_notifications, email_notifications, push_notifications)
SELECT 
    s.id as user_id,
    s.school_id,
    TRUE as activity_notifications,
    TRUE as system_notifications,
    FALSE as email_notifications,
    TRUE as push_notifications
FROM staff s
WHERE s.role = 'Teacher'
ON CONFLICT (user_id, school_id) DO NOTHING;

-- 13. Create view for activity summary
CREATE OR REPLACE VIEW teacher_activity_summary AS
SELECT 
    al.teacher_id,
    s.name as teacher_name,
    al.school_id,
    al.activity_type,
    al.activity_action,
    COUNT(*) as activity_count,
    MAX(al.created_at) as last_activity
FROM activity_logs al
JOIN staff s ON al.teacher_id = s.id
GROUP BY al.teacher_id, s.name, al.school_id, al.activity_type, al.activity_action;

-- 14. Create view for notification summary
CREATE OR REPLACE VIEW notification_summary AS
SELECT 
    n.recipient_id,
    s.name as recipient_name,
    n.school_id,
    n.notification_type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN n.is_read = FALSE THEN 1 END) as unread_count,
    MAX(n.created_at) as latest_notification
FROM notifications n
JOIN staff s ON n.recipient_id = s.id
WHERE n.expires_at IS NULL OR n.expires_at > NOW()
GROUP BY n.recipient_id, s.name, n.school_id, n.notification_type;
