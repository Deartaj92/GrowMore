-- Simple script to enable real-time for notifications table
-- This is the minimal setup needed for real-time to work

-- Enable real-time on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Grant necessary permissions for real-time
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT ON notifications TO anon;

-- Note: This script only enables real-time functionality
-- RLS policies can be added later if needed
