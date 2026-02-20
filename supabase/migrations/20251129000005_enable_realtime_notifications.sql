-- Enable real-time for notifications table
-- This is required for real-time subscriptions to work properly

-- Enable real-time publication for notifications table
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null; -- already added
end $$;

-- Set replica identity to full (required for real-time to send full row data)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

