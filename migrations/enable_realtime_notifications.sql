-- Enable real-time for notifications table
-- This script enables real-time subscriptions for the notifications table

-- Enable real-time on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Grant necessary permissions for real-time
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT ON notifications TO anon;

-- Enable RLS (Row Level Security) if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for notifications (users can only see their own notifications)
-- Note: This assumes you have a way to get the current user's ID as integer
-- You may need to adjust this based on your authentication setup
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (true); -- Temporarily allow all for testing

-- Create RLS policy for INSERT (allow all for now)
CREATE POLICY "Allow notification creation" ON notifications
    FOR INSERT WITH CHECK (true);

-- Create RLS policy for UPDATE (users can mark their notifications as read)
CREATE POLICY "Users can update notifications" ON notifications
    FOR UPDATE USING (true); -- Temporarily allow all for testing

-- Note: The RLS policies above are set to allow all for testing purposes
-- You should replace 'true' with proper conditions based on your auth system
-- For example, if you have a way to get current user ID as integer:
-- USING (recipient_id = current_user_id_integer)
