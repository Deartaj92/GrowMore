do $$
begin
  -- Ensure the announcements table broadcasts realtime changes
  alter publication supabase_realtime add table public.announcements;
exception
  when duplicate_object then null; -- already added
end $$;

-- Provide complete row data for update/delete events (harmless for inserts but future‑proofs usage)
alter table public.announcements replica identity full;
