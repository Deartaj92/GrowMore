CREATE TABLE IF NOT EXISTS public.attendance_scan_history (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id BIGINT NULL,
  role TEXT NOT NULL DEFAULT 'unknown' CHECK (role IN ('student', 'employee', 'unknown')),
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  platform TEXT NOT NULL CHECK (platform IN ('web', 'electron', 'mobile')),
  mode TEXT NOT NULL CHECK (mode IN ('online', 'offline')),
  action_taken TEXT NOT NULL CHECK (action_taken IN ('present', 'late', 'checkout', 'ignored', 'already_checked_out')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_scan_history_school_timestamp
  ON public.attendance_scan_history (school_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_scan_history_user_timestamp
  ON public.attendance_scan_history (user_id, "timestamp" DESC);

ALTER TABLE public.attendance_scan_history DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.attendance_scan_history TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.attendance_scan_history_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.get_server_timestamp()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT NOW();
$$;

GRANT EXECUTE ON FUNCTION public.get_server_timestamp() TO authenticated;
