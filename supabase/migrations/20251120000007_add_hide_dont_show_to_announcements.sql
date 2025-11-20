-- Add toggle to optionally hide the "Don't show again" button per announcement
alter table public.announcements
  add column if not exists hide_dont_show boolean not null default false;
