-- 20251120_add_footer_text_to_announcements.sql
-- Adds footer_text column so announcements can show optional footer content

alter table if exists public.announcements
  add column if not exists footer_text text;
