-- 20251120_create_announcements_table.sql
-- Migration: Create announcements table for in‑app user popups

create table if not exists public.announcements (
  id              bigint generated always as identity primary key,
  school_id       bigint not null,
  created_by      bigint not null,              -- users.id (admin/principal)
  created_at      timestamptz not null default now(),

  -- Targeting
  audience_group  text not null,                -- 'students' | 'staff'
  target_scope    text not null,                -- 'all' | 'class' | 'single' | 'role' | 'multi'

  -- For students
  class_id        bigint,                       -- when target_scope = 'class'
  section_id      bigint,                       -- optional
  student_id      bigint,                       -- when target_scope = 'single'
  student_ids     bigint[],                     -- when target_scope = 'multi'

  -- For staff
  staff_role      text,                         -- e.g. 'Teacher', 'Principal'
  staff_id        bigint,                       -- when target_scope = 'single'
  staff_ids       bigint[],                     -- when target_scope = 'multi'

  -- Content
  title           text not null,
  message         text not null,

  -- Visibility window
  show_from       date not null default current_date,
  show_until      date,                         -- null = no end date

  is_active       boolean not null default true
);

-- Indexes for fast lookups by school + status + audience
create index if not exists announcements_school_active_idx
  on public.announcements (school_id, is_active);

create index if not exists announcements_audience_idx
  on public.announcements (audience_group, target_scope);

create index if not exists announcements_dates_idx
  on public.announcements (show_from, show_until);