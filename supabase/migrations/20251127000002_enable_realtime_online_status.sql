-- Enable real-time for staff, students, and families tables for online status tracking
-- This allows real-time updates of is_online, last_online, and app_version fields

do $$
begin
  -- Enable real-time on staff table
  alter publication supabase_realtime add table public.staff;
exception
  when duplicate_object then null; -- already added
end $$;

do $$
begin
  -- Enable real-time on students table
  alter publication supabase_realtime add table public.students;
exception
  when duplicate_object then null; -- already added
end $$;

do $$
begin
  -- Enable real-time on families table
  alter publication supabase_realtime add table public.families;
exception
  when duplicate_object then null; -- already added
end $$;

-- Provide complete row data for update/delete events
alter table public.staff replica identity full;
alter table public.students replica identity full;
alter table public.families replica identity full;

