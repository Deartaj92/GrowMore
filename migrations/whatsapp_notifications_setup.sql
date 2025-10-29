-- WhatsApp Semi-Automated Notification System
-- This script creates the necessary database structure for WhatsApp notifications

-- Create WhatsApp notification queue table
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id SERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL,
  family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
  parent_phone VARCHAR(20) NOT NULL,
  message_type VARCHAR(50) NOT NULL, -- 'attendance', 'fee', 'general'
  message_content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  scheduled_time TIMESTAMP WITH TIME ZONE,
  sent_time TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_school_id ON whatsapp_notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status ON whatsapp_notifications(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_scheduled_time ON whatsapp_notifications(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_student_id ON whatsapp_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_created_at ON whatsapp_notifications(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_notifications_updated_at
    BEFORE UPDATE ON whatsapp_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON whatsapp_notifications TO authenticated;
GRANT USAGE ON SEQUENCE whatsapp_notifications_id_seq TO authenticated;

-- Create a view for easy notification tracking
CREATE OR REPLACE VIEW whatsapp_notification_summary AS
SELECT 
  wn.school_id,
  s.name as school_name,
  wn.message_type,
  wn.status,
  COUNT(*) as notification_count,
  DATE(wn.created_at) as notification_date
FROM whatsapp_notifications wn
JOIN schools s ON wn.school_id = s.id
GROUP BY wn.school_id, s.name, wn.message_type, wn.status, DATE(wn.created_at)
ORDER BY notification_date DESC, notification_count DESC;

-- Grant permissions on view
GRANT SELECT ON whatsapp_notification_summary TO authenticated;

