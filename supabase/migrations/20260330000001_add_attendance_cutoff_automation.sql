-- Attendance cutoff automation
-- Adds configurable cutoff settings and backend functions that auto-mark
-- missing students/staff absent after the configured cutoff time.

ALTER TABLE public.attendance_settings
ADD COLUMN IF NOT EXISTS auto_mark_absent_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS student_auto_mark_absent_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS staff_auto_mark_absent_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS student_cutoff_time TIME,
ADD COLUMN IF NOT EXISTS staff_cutoff_time TIME,
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Karachi';

UPDATE public.attendance_settings
SET
  student_cutoff_time = COALESCE(
    student_cutoff_time,
    (student_start_time + make_interval(mins => COALESCE(grace_period_minutes, 0)))::time
  ),
  staff_cutoff_time = COALESCE(
    staff_cutoff_time,
    (staff_start_time + make_interval(mins => COALESCE(grace_period_minutes, 0)))::time
  ),
  student_auto_mark_absent_enabled = COALESCE(student_auto_mark_absent_enabled, auto_mark_absent_enabled, false),
  staff_auto_mark_absent_enabled = COALESCE(staff_auto_mark_absent_enabled, auto_mark_absent_enabled, false),
  auto_mark_absent_enabled = COALESCE(
    auto_mark_absent_enabled,
    student_auto_mark_absent_enabled,
    staff_auto_mark_absent_enabled,
    false
  ),
  timezone = COALESCE(NULLIF(timezone, ''), 'Asia/Karachi');

COMMENT ON COLUMN public.attendance_settings.auto_mark_absent_enabled IS
  'Legacy aggregate flag for backend auto-marking of absent attendance after cutoff times.';
COMMENT ON COLUMN public.attendance_settings.student_auto_mark_absent_enabled IS
  'Enables backend auto-marking of absent attendance for students after cutoff time.';
COMMENT ON COLUMN public.attendance_settings.staff_auto_mark_absent_enabled IS
  'Enables backend auto-marking of absent attendance for staff after cutoff time.';
COMMENT ON COLUMN public.attendance_settings.student_cutoff_time IS
  'Local school cutoff time after which missing students are auto-marked absent.';
COMMENT ON COLUMN public.attendance_settings.staff_cutoff_time IS
  'Local school cutoff time after which missing staff are auto-marked absent.';
COMMENT ON COLUMN public.attendance_settings.timezone IS
  'IANA timezone used to evaluate attendance cutoff times for the school.';

CREATE OR REPLACE FUNCTION public.attendance_date_matches_holiday(
  p_start_date DATE,
  p_end_date DATE,
  p_is_recurring BOOLEAN,
  p_target_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  start_md INTEGER;
  end_md INTEGER;
  target_md INTEGER;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_target_date IS NULL THEN
    RETURN false;
  END IF;

  IF COALESCE(p_is_recurring, false) = false THEN
    RETURN p_target_date BETWEEN p_start_date AND p_end_date;
  END IF;

  start_md := EXTRACT(MONTH FROM p_start_date)::INTEGER * 100 + EXTRACT(DAY FROM p_start_date)::INTEGER;
  end_md := EXTRACT(MONTH FROM p_end_date)::INTEGER * 100 + EXTRACT(DAY FROM p_end_date)::INTEGER;
  target_md := EXTRACT(MONTH FROM p_target_date)::INTEGER * 100 + EXTRACT(DAY FROM p_target_date)::INTEGER;

  IF start_md <= end_md THEN
    RETURN target_md BETWEEN start_md AND end_md;
  END IF;

  RETURN target_md >= start_md OR target_md <= end_md;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_student_holiday(
  p_school_id BIGINT,
  p_session_id BIGINT,
  p_target_date DATE,
  p_class_id BIGINT,
  p_section_id BIGINT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  WITH matching_holidays AS (
    SELECT h.id
    FROM public.holidays h
    WHERE h.school_id = p_school_id
      AND h.session_id = p_session_id
      AND public.attendance_date_matches_holiday(
        h.start_date,
        h.end_date,
        COALESCE(h.is_recurring, false),
        p_target_date
      )
  ),
  filtered_class_assignments AS (
    SELECT
      mh.id AS holiday_id,
      hc.class_id,
      hc.section_id
    FROM matching_holidays mh
    JOIN public.holiday_classes hc
      ON hc.holiday_id = mh.id
    WHERE hc.school_id IS NULL OR hc.school_id = p_school_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM matching_holidays mh
    WHERE EXISTS (
      SELECT 1
      FROM filtered_class_assignments fca
      WHERE fca.holiday_id = mh.id
        AND fca.class_id = p_class_id
        AND (
          (
            EXISTS (
              SELECT 1
              FROM filtered_class_assignments scoped
              WHERE scoped.holiday_id = mh.id
                AND scoped.class_id = p_class_id
                AND scoped.section_id IS NOT NULL
            )
            AND p_section_id IS NOT NULL
            AND fca.section_id = p_section_id
          )
          OR (
            NOT EXISTS (
              SELECT 1
              FROM filtered_class_assignments scoped
              WHERE scoped.holiday_id = mh.id
                AND scoped.class_id = p_class_id
                AND scoped.section_id IS NOT NULL
            )
            AND fca.section_id IS NULL
          )
        )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_holiday(
  p_school_id BIGINT,
  p_session_id BIGINT,
  p_target_date DATE,
  p_staff_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  WITH matching_holidays AS (
    SELECT h.id
    FROM public.holidays h
    WHERE h.school_id = p_school_id
      AND h.session_id = p_session_id
      AND public.attendance_date_matches_holiday(
        h.start_date,
        h.end_date,
        COALESCE(h.is_recurring, false),
        p_target_date
      )
  )
  SELECT EXISTS (
    SELECT 1
    FROM matching_holidays mh
    WHERE (
      NOT EXISTS (
        SELECT 1
        FROM public.holiday_classes hc
        WHERE hc.holiday_id = mh.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.holiday_staff hs
        WHERE hs.holiday_id = mh.id
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.holiday_staff hs
      WHERE hs.holiday_id = mh.id
        AND hs.staff_id = p_staff_id
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.finalize_student_absences_for_school(
  p_school_id BIGINT,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id BIGINT;
  v_inserted_count INTEGER := 0;
BEGIN
  IF EXTRACT(DOW FROM p_target_date) = 0 THEN
    RETURN 0;
  END IF;

  SELECT s.id
  INTO v_session_id
  FROM public.sessions s
  WHERE s.school_id = p_school_id
    AND s.is_active = true
  ORDER BY s.id DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN 0;
  END IF;

  WITH current_students AS (
    SELECT
      sch.student_id,
      MAX(sch.new_class_id) AS class_id,
      MAX(sch.new_section_id) AS section_id
    FROM public.student_class_history sch
    INNER JOIN public.students st
      ON st.id = sch.student_id
     AND st.school_id = sch.school_id
    WHERE sch.school_id = p_school_id
      AND sch.session_id = v_session_id
      AND COALESCE(st.status, 'active') = 'active'
    GROUP BY sch.student_id
  ),
  inserted_rows AS (
    INSERT INTO public.attendance_records (
      student_id,
      school_id,
      session_id,
      class_id,
      section_id,
      date,
      status,
      source,
      check_in_time
    )
    SELECT
      cs.student_id,
      p_school_id,
      v_session_id,
      cs.class_id,
      cs.section_id,
      p_target_date,
      'absent',
      'auto-cutoff',
      NULL
    FROM current_students cs
    WHERE NOT public.is_student_holiday(
      p_school_id,
      v_session_id,
      p_target_date,
      cs.class_id,
      cs.section_id
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.attendance_records ar
        WHERE ar.school_id = p_school_id
          AND ar.student_id = cs.student_id
          AND ar.date = p_target_date
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_count
  FROM inserted_rows;

  RETURN COALESCE(v_inserted_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_staff_absences_for_school(
  p_school_id BIGINT,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id BIGINT;
  v_inserted_count INTEGER := 0;
BEGIN
  IF EXTRACT(DOW FROM p_target_date) = 0 THEN
    RETURN 0;
  END IF;

  SELECT s.id
  INTO v_session_id
  FROM public.sessions s
  WHERE s.school_id = p_school_id
    AND s.is_active = true
  ORDER BY s.id DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN 0;
  END IF;

  WITH current_staff AS (
    SELECT st.id AS staff_id
    FROM public.staff st
    WHERE st.school_id = p_school_id
      AND COALESCE(st.status, 'active') = 'active'
  ),
  inserted_rows AS (
    INSERT INTO public.staff_attendance_records (
      staff_id,
      school_id,
      session_id,
      date,
      status,
      source,
      check_in_time
    )
    SELECT
      cs.staff_id,
      p_school_id,
      v_session_id,
      p_target_date,
      'absent',
      'auto-cutoff',
      NULL
    FROM current_staff cs
    WHERE NOT public.is_staff_holiday(
      p_school_id,
      v_session_id,
      p_target_date,
      cs.staff_id
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.staff_attendance_records sar
        WHERE sar.school_id = p_school_id
          AND sar.staff_id = cs.staff_id
          AND sar.date = p_target_date
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_count
  FROM inserted_rows;

  RETURN COALESCE(v_inserted_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.run_attendance_cutoff_for_due_schools()
RETURNS TABLE (
  school_id BIGINT,
  student_absent_marked INTEGER,
  staff_absent_marked INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_row RECORD;
  local_now TIMESTAMP WITHOUT TIME ZONE;
  local_date DATE;
  local_time TIME WITHOUT TIME ZONE;
  student_count INTEGER;
  staff_count INTEGER;
BEGIN
  FOR settings_row IN
    SELECT
      ats.school_id,
      ats.auto_mark_absent_enabled,
      ats.student_auto_mark_absent_enabled,
      ats.staff_auto_mark_absent_enabled,
      ats.student_cutoff_time,
      ats.staff_cutoff_time,
      ats.timezone
    FROM public.attendance_settings ats
    WHERE COALESCE(ats.student_auto_mark_absent_enabled, false) = true
       OR COALESCE(ats.staff_auto_mark_absent_enabled, false) = true
       OR COALESCE(ats.auto_mark_absent_enabled, false) = true
  LOOP
    local_now := timezone(COALESCE(NULLIF(settings_row.timezone, ''), 'Asia/Karachi'), now());
    local_date := local_now::date;
    local_time := local_now::time;

    IF EXTRACT(DOW FROM local_date) = 0 THEN
      CONTINUE;
    END IF;

    student_count := 0;
    staff_count := 0;

    IF (
         COALESCE(settings_row.student_auto_mark_absent_enabled, false) = true
         OR (
           COALESCE(settings_row.student_auto_mark_absent_enabled, false) = false
           AND COALESCE(settings_row.staff_auto_mark_absent_enabled, false) = false
           AND COALESCE(settings_row.auto_mark_absent_enabled, false) = true
         )
       )
       AND settings_row.student_cutoff_time IS NOT NULL
       AND local_time >= settings_row.student_cutoff_time THEN
      student_count := public.finalize_student_absences_for_school(
        settings_row.school_id,
        local_date
      );
    END IF;

    IF (
         COALESCE(settings_row.staff_auto_mark_absent_enabled, false) = true
         OR (
           COALESCE(settings_row.student_auto_mark_absent_enabled, false) = false
           AND COALESCE(settings_row.staff_auto_mark_absent_enabled, false) = false
           AND COALESCE(settings_row.auto_mark_absent_enabled, false) = true
         )
       )
       AND settings_row.staff_cutoff_time IS NOT NULL
       AND local_time >= settings_row.staff_cutoff_time THEN
      staff_count := public.finalize_staff_absences_for_school(
        settings_row.school_id,
        local_date
      );
    END IF;

    IF student_count > 0 OR staff_count > 0 THEN
      school_id := settings_row.school_id;
      student_absent_marked := student_count;
      staff_absent_marked := staff_count;
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.run_attendance_cutoff_for_due_schools() IS
  'Runs backend attendance cutoff finalization for all schools with student/staff auto-mark-absent enabled.';

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron extension could not be enabled automatically. Attendance cutoff can still be run manually via run_attendance_cutoff_for_due_schools().';
END $$;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid
    INTO existing_job_id
    FROM cron.job
    WHERE jobname = 'attendance-cutoff-finalizer'
    LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;

    PERFORM cron.schedule(
      'attendance-cutoff-finalizer',
      '*/10 * * * *',
      'SELECT public.run_attendance_cutoff_for_due_schools();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unable to register attendance cutoff cron job automatically: %', SQLERRM;
END $$;
