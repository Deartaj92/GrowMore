-- 20251120_recreate_announcements_and_views.sql
-- Drops and recreates the announcements + announcement_views tables with the latest schema

-- Drop dependent tables first to avoid foreign-key issues
DROP TABLE IF EXISTS public.announcement_views CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;

-- Recreate announcements table with full targeting + content metadata
CREATE TABLE public.announcements (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id       BIGINT NOT NULL,
  created_by      BIGINT NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Targeting
  audience_group  TEXT NOT NULL,              -- 'students' | 'staff' | 'students_staff'
  target_scope    TEXT NOT NULL,              -- 'all' | 'class' | 'role' | 'single' | 'multi'

  -- Student targeting
  class_id        BIGINT,
  section_id      BIGINT,
  student_id      BIGINT,
  student_ids     BIGINT[],

  -- Staff targeting
  staff_role      TEXT,
  staff_id        BIGINT,
  staff_ids       BIGINT[],

  -- Content
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  footer_text     TEXT,

  -- Display window
  show_from       DATE NOT NULL DEFAULT current_date,
  show_until      DATE,

  -- UI flags
  hide_dont_show  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX announcements_school_active_idx
  ON public.announcements (school_id, is_active);

CREATE INDEX announcements_audience_idx
  ON public.announcements (audience_group, target_scope);

CREATE INDEX announcements_dates_idx
  ON public.announcements (show_from, show_until);

-- Table that records who viewed an announcement popup
CREATE TABLE public.announcement_views (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  announcement_id   BIGINT NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  school_id         BIGINT NOT NULL,
  viewer_identifier TEXT NOT NULL,
  viewer_type       TEXT NOT NULL,
  viewer_role       TEXT,
  viewer_name       TEXT,
  student_id        BIGINT,
  staff_id          BIGINT,
  user_id           BIGINT,
  viewer_device_id  TEXT,
  seen_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX announcement_views_unique_viewer
  ON public.announcement_views (announcement_id, viewer_identifier);

CREATE INDEX announcement_views_school_idx
  ON public.announcement_views (school_id, announcement_id);
