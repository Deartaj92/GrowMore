-- Enable real-time for leave_requests, complaints, and suggestions tables
-- This is required for real-time subscriptions to work properly

-- Enable real-time publication for leave_requests table
do $$
begin
  alter publication supabase_realtime add table public.leave_requests;
exception
  when duplicate_object then null; -- already added
end $$;

-- Enable real-time publication for complaints table
do $$
begin
  alter publication supabase_realtime add table public.complaints;
exception
  when duplicate_object then null; -- already added
end $$;

-- Enable real-time publication for suggestions table
do $$
begin
  alter publication supabase_realtime add table public.suggestions;
exception
  when duplicate_object then null; -- already added
end $$;

-- Set replica identity to full (required for real-time to send full row data on updates)
ALTER TABLE public.leave_requests REPLICA IDENTITY FULL;
ALTER TABLE public.complaints REPLICA IDENTITY FULL;
ALTER TABLE public.suggestions REPLICA IDENTITY FULL;
