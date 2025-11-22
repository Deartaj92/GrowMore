-- 20251122000001_fix_announcement_views_constraint.sql

-- 1. Fix Unique Constraint on announcement_views
-- Drop existing indexes/constraints to ensure clean slate
DROP INDEX IF EXISTS public.announcement_views_unique_viewer;
DROP INDEX IF EXISTS public.announcement_views_unique_viewer_idx;
ALTER TABLE public.announcement_views DROP CONSTRAINT IF EXISTS announcement_views_unique_viewer_constraint;

-- Add the correct unique constraint
ALTER TABLE public.announcement_views
  ADD CONSTRAINT announcement_views_unique_viewer_constraint
  UNIQUE (announcement_id, viewer_identifier);

-- 2. Enable RLS on tables
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;

-- 3. Add Permissive Policies (since app uses custom auth/anon key)

-- Announcements: Allow public read (filtering done in app), allow public insert/update (for admins)
DROP POLICY IF EXISTS "Public read announcements" ON public.announcements;
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public insert announcements" ON public.announcements;
CREATE POLICY "Public insert announcements" ON public.announcements FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public update announcements" ON public.announcements;
CREATE POLICY "Public update announcements" ON public.announcements FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete announcements" ON public.announcements;
CREATE POLICY "Public delete announcements" ON public.announcements FOR DELETE TO public USING (true);

-- Announcement Views: Allow public to do everything (needed for mark as read)
DROP POLICY IF EXISTS "Public all announcement_views" ON public.announcement_views;
CREATE POLICY "Public all announcement_views" ON public.announcement_views FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. Fix Notification Preferences RLS if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_preferences') THEN
        ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public all notification_preferences" ON public.notification_preferences;
        CREATE POLICY "Public all notification_preferences" ON public.notification_preferences FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
END
$$;
