ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS attendance_mode TEXT;

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS attendance_mode TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND constraint_name = 'students_attendance_mode_check'
  ) THEN
    ALTER TABLE public.students
    ADD CONSTRAINT students_attendance_mode_check
    CHECK (attendance_mode IN ('rfid_required', 'manual_only', 'hybrid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND constraint_name = 'staff_attendance_mode_check'
  ) THEN
    ALTER TABLE public.staff
    ADD CONSTRAINT staff_attendance_mode_check
    CHECK (attendance_mode IN ('rfid_required', 'manual_only', 'hybrid'));
  END IF;
END $$;

UPDATE public.students
SET attendance_mode = CASE
  WHEN COALESCE(NULLIF(BTRIM(rfid_uid), ''), '') = '' THEN 'manual_only'
  ELSE 'rfid_required'
END
WHERE attendance_mode IS NULL;

UPDATE public.staff
SET attendance_mode = CASE
  WHEN COALESCE(NULLIF(BTRIM(rfid_uid), ''), '') = '' THEN 'manual_only'
  ELSE 'rfid_required'
END
WHERE attendance_mode IS NULL;

ALTER TABLE public.students
ALTER COLUMN attendance_mode SET DEFAULT 'manual_only';

ALTER TABLE public.staff
ALTER COLUMN attendance_mode SET DEFAULT 'manual_only';

COMMENT ON COLUMN public.students.attendance_mode IS
  'Attendance capture policy: rfid_required, manual_only, or hybrid.';
COMMENT ON COLUMN public.staff.attendance_mode IS
  'Attendance capture policy: rfid_required, manual_only, or hybrid.';

CREATE TABLE IF NOT EXISTS public.attendance_automation_logs (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_id BIGINT,
  local_date DATE NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_status TEXT NOT NULL DEFAULT 'completed',
  student_auto_enabled BOOLEAN NOT NULL DEFAULT false,
  staff_auto_enabled BOOLEAN NOT NULL DEFAULT false,
  student_absent_marked INTEGER NOT NULL DEFAULT 0,
  staff_absent_marked INTEGER NOT NULL DEFAULT 0,
  student_leave_marked INTEGER NOT NULL DEFAULT 0,
  staff_leave_marked INTEGER NOT NULL DEFAULT 0,
  student_manual_skipped INTEGER NOT NULL DEFAULT 0,
  staff_manual_skipped INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_attendance_automation_logs_school_date
ON public.attendance_automation_logs(school_id, local_date DESC, run_at DESC);

CREATE OR REPLACE FUNCTION public.get_effective_attendance_mode(
  p_attendance_mode TEXT,
  p_rfid_uid TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(BTRIM(p_attendance_mode), ''),
    CASE
      WHEN COALESCE(NULLIF(BTRIM(p_rfid_uid), ''), '') = '' THEN 'manual_only'
      ELSE 'rfid_required'
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.is_cutoff_reached(
  p_target_date DATE,
  p_cutoff_time TIME,
  p_timezone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  local_now TIMESTAMP WITHOUT TIME ZONE;
BEGIN
  IF p_target_date IS NULL OR p_cutoff_time IS NULL THEN
    RETURN false;
  END IF;

  local_now := timezone(COALESCE(NULLIF(p_timezone, ''), 'Asia/Karachi'), now());

  IF p_target_date < local_now::date THEN
    RETURN true;
  END IF;

  IF p_target_date > local_now::date THEN
    RETURN false;
  END IF;

  RETURN local_now::time >= p_cutoff_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_student_leave_date(
  p_school_id BIGINT,
  p_session_id BIGINT,
  p_student_id BIGINT,
  p_target_date DATE,
  p_approved BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_row RECORD;
  settings_row RECORD;
BEGIN
  IF EXTRACT(DOW FROM p_target_date) = 0 THEN
    RETURN;
  END IF;

  SELECT
    st.id,
    st.rfid_uid,
    st.attendance_mode,
    sch.new_class_id AS class_id,
    sch.new_section_id AS section_id
  INTO student_row
  FROM public.students st
  LEFT JOIN public.student_class_history sch
    ON sch.student_id = st.id
   AND sch.school_id = st.school_id
   AND sch.session_id = p_session_id
  WHERE st.id = p_student_id
    AND st.school_id = p_school_id
    AND COALESCE(st.status, 'active') = 'active'
  LIMIT 1;

  IF student_row.id IS NULL THEN
    RETURN;
  END IF;

  IF public.is_student_holiday(
    p_school_id,
    p_session_id,
    p_target_date,
    student_row.class_id,
    student_row.section_id
  ) THEN
    RETURN;
  END IF;

  SELECT *
  INTO settings_row
  FROM public.attendance_settings
  WHERE school_id = p_school_id
  LIMIT 1;

  IF p_approved THEN
    UPDATE public.attendance_records
    SET
      status = 'leave',
      source = 'auto-leave',
      check_in_time = NULL,
      check_out_time = NULL
    WHERE school_id = p_school_id
      AND student_id = p_student_id
      AND date = p_target_date
      AND status IN ('absent', 'leave')
      AND source IN ('auto-cutoff', 'auto-leave');

    IF NOT EXISTS (
      SELECT 1
      FROM public.attendance_records
      WHERE school_id = p_school_id
        AND student_id = p_student_id
        AND date = p_target_date
    ) THEN
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
      VALUES (
        p_student_id,
        p_school_id,
        p_session_id,
        student_row.class_id,
        student_row.section_id,
        p_target_date,
        'leave',
        'auto-leave',
        NULL
      );
    END IF;
  ELSE
    DELETE FROM public.attendance_records
    WHERE school_id = p_school_id
      AND student_id = p_student_id
      AND date = p_target_date
      AND status = 'leave'
      AND source = 'auto-leave';

    IF public.is_cutoff_reached(
      p_target_date,
      settings_row.student_cutoff_time,
      settings_row.timezone
    )
    AND public.get_effective_attendance_mode(student_row.attendance_mode, student_row.rfid_uid) IN ('rfid_required', 'hybrid')
    AND NOT EXISTS (
      SELECT 1
      FROM public.leave_requests lr
      WHERE lr.school_id = p_school_id
        AND lr.session_id = p_session_id
        AND lr.student_id = p_student_id
        AND lr.status = 'approved'
        AND p_target_date BETWEEN lr.start_date AND lr.end_date
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.attendance_records
      WHERE school_id = p_school_id
        AND student_id = p_student_id
        AND date = p_target_date
    ) THEN
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
      VALUES (
        p_student_id,
        p_school_id,
        p_session_id,
        student_row.class_id,
        student_row.section_id,
        p_target_date,
        'absent',
        'auto-cutoff',
        NULL
      );
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_staff_leave_date(
  p_school_id BIGINT,
  p_session_id BIGINT,
  p_staff_id BIGINT,
  p_target_date DATE,
  p_approved BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  staff_row RECORD;
  settings_row RECORD;
  has_first_half_leave BOOLEAN := false;
BEGIN
  IF EXTRACT(DOW FROM p_target_date) = 0 THEN
    RETURN;
  END IF;

  SELECT
    st.id,
    st.rfid_uid,
    st.attendance_mode
  INTO staff_row
  FROM public.staff st
  WHERE st.id = p_staff_id
    AND st.school_id = p_school_id
    AND COALESCE(st.status, 'active') = 'active'
  LIMIT 1;

  IF staff_row.id IS NULL THEN
    RETURN;
  END IF;

  IF public.is_staff_holiday(
    p_school_id,
    p_session_id,
    p_target_date,
    p_staff_id
  ) THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.half_leaves hl
    WHERE hl.school_id = p_school_id
      AND hl.session_id = p_session_id
      AND hl.person_type = 'staff'
      AND hl.person_id = p_staff_id
      AND hl.date = p_target_date
      AND hl.leave_type = 'first_half'
  ) INTO has_first_half_leave;

  SELECT *
  INTO settings_row
  FROM public.attendance_settings
  WHERE school_id = p_school_id
  LIMIT 1;

  IF p_approved THEN
    UPDATE public.staff_attendance_records
    SET
      status = 'leave',
      source = 'auto-leave',
      check_in_time = NULL,
      check_out_time = NULL
    WHERE school_id = p_school_id
      AND staff_id = p_staff_id
      AND date = p_target_date
      AND status IN ('absent', 'leave')
      AND source IN ('auto-cutoff', 'auto-leave', 'auto-half-leave');

    IF NOT EXISTS (
      SELECT 1
      FROM public.staff_attendance_records
      WHERE school_id = p_school_id
        AND staff_id = p_staff_id
        AND date = p_target_date
    ) THEN
      INSERT INTO public.staff_attendance_records (
        staff_id,
        school_id,
        session_id,
        date,
        status,
        source,
        check_in_time
      )
      VALUES (
        p_staff_id,
        p_school_id,
        p_session_id,
        p_target_date,
        'leave',
        'auto-leave',
        NULL
      );
    END IF;
  ELSE
    DELETE FROM public.staff_attendance_records
    WHERE school_id = p_school_id
      AND staff_id = p_staff_id
      AND date = p_target_date
      AND status = 'leave'
      AND source IN ('auto-leave', 'auto-half-leave');

    IF public.is_cutoff_reached(
      p_target_date,
      settings_row.staff_cutoff_time,
      settings_row.timezone
    )
    AND public.get_effective_attendance_mode(staff_row.attendance_mode, staff_row.rfid_uid) IN ('rfid_required', 'hybrid')
    AND has_first_half_leave = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.leave_requests lr
      WHERE lr.school_id = p_school_id
        AND lr.session_id = p_session_id
        AND lr.staff_id = p_staff_id
        AND lr.status = 'approved'
        AND p_target_date BETWEEN lr.start_date AND lr.end_date
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.staff_attendance_records
      WHERE school_id = p_school_id
        AND staff_id = p_staff_id
        AND date = p_target_date
    ) THEN
      INSERT INTO public.staff_attendance_records (
        staff_id,
        school_id,
        session_id,
        date,
        status,
        source,
        check_in_time
      )
      VALUES (
        p_staff_id,
        p_school_id,
        p_session_id,
        p_target_date,
        'absent',
        'auto-cutoff',
        NULL
      );
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_leave_request_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  loop_date DATE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' THEN
      FOR loop_date IN
        SELECT generate_series(NEW.start_date, NEW.end_date, interval '1 day')::date
      LOOP
        IF NEW.student_id IS NOT NULL THEN
          PERFORM public.reconcile_student_leave_date(NEW.school_id, NEW.session_id, NEW.student_id, loop_date, true);
        ELSIF NEW.staff_id IS NOT NULL THEN
          PERFORM public.reconcile_staff_leave_date(NEW.school_id, NEW.session_id, NEW.staff_id, loop_date, true);
        END IF;
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'approved' THEN
      FOR loop_date IN
        SELECT generate_series(OLD.start_date, OLD.end_date, interval '1 day')::date
      LOOP
        IF OLD.student_id IS NOT NULL THEN
          PERFORM public.reconcile_student_leave_date(OLD.school_id, OLD.session_id, OLD.student_id, loop_date, false);
        ELSIF OLD.staff_id IS NOT NULL THEN
          PERFORM public.reconcile_staff_leave_date(OLD.school_id, OLD.session_id, OLD.staff_id, loop_date, false);
        END IF;
      END LOOP;
    END IF;

    IF NEW.status = 'approved' THEN
      FOR loop_date IN
        SELECT generate_series(NEW.start_date, NEW.end_date, interval '1 day')::date
      LOOP
        IF NEW.student_id IS NOT NULL THEN
          PERFORM public.reconcile_student_leave_date(NEW.school_id, NEW.session_id, NEW.student_id, loop_date, true);
        ELSIF NEW.staff_id IS NOT NULL THEN
          PERFORM public.reconcile_staff_leave_date(NEW.school_id, NEW.session_id, NEW.staff_id, loop_date, true);
        END IF;
      END LOOP;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reconcile_leave_request_attendance ON public.leave_requests;
CREATE TRIGGER trigger_reconcile_leave_request_attendance
  AFTER INSERT OR UPDATE OF status, start_date, end_date, student_id, staff_id ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.reconcile_leave_request_attendance();

CREATE OR REPLACE FUNCTION public.finalize_student_absences_for_school(
  p_school_id BIGINT,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  absent_marked INTEGER,
  leave_marked INTEGER,
  manual_skipped INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id BIGINT;
BEGIN
  absent_marked := 0;
  leave_marked := 0;
  manual_skipped := 0;

  IF EXTRACT(DOW FROM p_target_date) = 0 THEN
    RETURN;
  END IF;

  SELECT s.id
  INTO v_session_id
  FROM public.sessions s
  WHERE s.school_id = p_school_id
    AND s.is_active = true
  ORDER BY s.id DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN;
  END IF;

  WITH current_students AS (
    SELECT
      sch.student_id,
      MAX(sch.new_class_id) AS class_id,
      MAX(sch.new_section_id) AS section_id,
      MAX(st.rfid_uid) AS rfid_uid,
      MAX(st.attendance_mode) AS attendance_mode
    FROM public.student_class_history sch
    INNER JOIN public.students st
      ON st.id = sch.student_id
     AND st.school_id = sch.school_id
    WHERE sch.school_id = p_school_id
      AND sch.session_id = v_session_id
      AND COALESCE(st.status, 'active') = 'active'
    GROUP BY sch.student_id
  ),
  eligible_students AS (
    SELECT
      cs.*,
      public.get_effective_attendance_mode(cs.attendance_mode, cs.rfid_uid) AS effective_mode
    FROM current_students cs
    WHERE NOT public.is_student_holiday(
      p_school_id,
      v_session_id,
      p_target_date,
      cs.class_id,
      cs.section_id
    )
  ),
  leave_rows AS (
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
      es.student_id,
      p_school_id,
      v_session_id,
      es.class_id,
      es.section_id,
      p_target_date,
      'leave',
      'auto-leave',
      NULL
    FROM eligible_students es
    WHERE EXISTS (
      SELECT 1
      FROM public.leave_requests lr
      WHERE lr.school_id = p_school_id
        AND lr.session_id = v_session_id
        AND lr.student_id = es.student_id
        AND lr.status = 'approved'
        AND p_target_date BETWEEN lr.start_date AND lr.end_date
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.attendance_records ar
        WHERE ar.school_id = p_school_id
          AND ar.student_id = es.student_id
          AND ar.date = p_target_date
      )
    RETURNING 1
  ),
  absent_rows AS (
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
      es.student_id,
      p_school_id,
      v_session_id,
      es.class_id,
      es.section_id,
      p_target_date,
      'absent',
      'auto-cutoff',
      NULL
    FROM eligible_students es
    WHERE es.effective_mode IN ('rfid_required', 'hybrid')
      AND NOT EXISTS (
        SELECT 1
        FROM public.leave_requests lr
        WHERE lr.school_id = p_school_id
          AND lr.session_id = v_session_id
          AND lr.student_id = es.student_id
          AND lr.status = 'approved'
          AND p_target_date BETWEEN lr.start_date AND lr.end_date
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.attendance_records ar
        WHERE ar.school_id = p_school_id
          AND ar.student_id = es.student_id
          AND ar.date = p_target_date
      )
    RETURNING 1
  )
  SELECT
    COALESCE((SELECT COUNT(*) FROM absent_rows), 0),
    COALESCE((SELECT COUNT(*) FROM leave_rows), 0),
    COALESCE((
      SELECT COUNT(*)
      FROM eligible_students es
      WHERE es.effective_mode = 'manual_only'
        AND NOT EXISTS (
          SELECT 1
          FROM public.leave_requests lr
          WHERE lr.school_id = p_school_id
            AND lr.session_id = v_session_id
            AND lr.student_id = es.student_id
            AND lr.status = 'approved'
            AND p_target_date BETWEEN lr.start_date AND lr.end_date
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.attendance_records ar
          WHERE ar.school_id = p_school_id
            AND ar.student_id = es.student_id
            AND ar.date = p_target_date
        )
    ), 0)
  INTO absent_marked, leave_marked, manual_skipped;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_staff_absences_for_school(
  p_school_id BIGINT,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  absent_marked INTEGER,
  leave_marked INTEGER,
  manual_skipped INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id BIGINT;
BEGIN
  absent_marked := 0;
  leave_marked := 0;
  manual_skipped := 0;

  IF EXTRACT(DOW FROM p_target_date) = 0 THEN
    RETURN;
  END IF;

  SELECT s.id
  INTO v_session_id
  FROM public.sessions s
  WHERE s.school_id = p_school_id
    AND s.is_active = true
  ORDER BY s.id DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN;
  END IF;

  WITH current_staff AS (
    SELECT
      st.id AS staff_id,
      st.rfid_uid,
      st.attendance_mode
    FROM public.staff st
    WHERE st.school_id = p_school_id
      AND COALESCE(st.status, 'active') = 'active'
  ),
  eligible_staff AS (
    SELECT
      cs.*,
      public.get_effective_attendance_mode(cs.attendance_mode, cs.rfid_uid) AS effective_mode,
      EXISTS (
        SELECT 1
        FROM public.half_leaves hl
        WHERE hl.school_id = p_school_id
          AND hl.session_id = v_session_id
          AND hl.person_type = 'staff'
          AND hl.person_id = cs.staff_id
          AND hl.date = p_target_date
          AND hl.leave_type = 'first_half'
      ) AS has_first_half_leave
    FROM current_staff cs
    WHERE NOT public.is_staff_holiday(
      p_school_id,
      v_session_id,
      p_target_date,
      cs.staff_id
    )
  ),
  leave_rows AS (
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
      es.staff_id,
      p_school_id,
      v_session_id,
      p_target_date,
      'leave',
      CASE WHEN es.has_first_half_leave THEN 'auto-half-leave' ELSE 'auto-leave' END,
      NULL
    FROM eligible_staff es
    WHERE (
        es.has_first_half_leave = true
        OR EXISTS (
          SELECT 1
          FROM public.leave_requests lr
          WHERE lr.school_id = p_school_id
            AND lr.session_id = v_session_id
            AND lr.staff_id = es.staff_id
            AND lr.status = 'approved'
            AND p_target_date BETWEEN lr.start_date AND lr.end_date
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.staff_attendance_records sar
        WHERE sar.school_id = p_school_id
          AND sar.staff_id = es.staff_id
          AND sar.date = p_target_date
      )
    RETURNING 1
  ),
  absent_rows AS (
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
      es.staff_id,
      p_school_id,
      v_session_id,
      p_target_date,
      'absent',
      'auto-cutoff',
      NULL
    FROM eligible_staff es
    WHERE es.effective_mode IN ('rfid_required', 'hybrid')
      AND es.has_first_half_leave = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.leave_requests lr
        WHERE lr.school_id = p_school_id
          AND lr.session_id = v_session_id
          AND lr.staff_id = es.staff_id
          AND lr.status = 'approved'
          AND p_target_date BETWEEN lr.start_date AND lr.end_date
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.staff_attendance_records sar
        WHERE sar.school_id = p_school_id
          AND sar.staff_id = es.staff_id
          AND sar.date = p_target_date
      )
    RETURNING 1
  )
  SELECT
    COALESCE((SELECT COUNT(*) FROM absent_rows), 0),
    COALESCE((SELECT COUNT(*) FROM leave_rows), 0),
    COALESCE((
      SELECT COUNT(*)
      FROM eligible_staff es
      WHERE es.effective_mode = 'manual_only'
        AND es.has_first_half_leave = false
        AND NOT EXISTS (
          SELECT 1
          FROM public.leave_requests lr
          WHERE lr.school_id = p_school_id
            AND lr.session_id = v_session_id
            AND lr.staff_id = es.staff_id
            AND lr.status = 'approved'
            AND p_target_date BETWEEN lr.start_date AND lr.end_date
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.staff_attendance_records sar
          WHERE sar.school_id = p_school_id
            AND sar.staff_id = es.staff_id
            AND sar.date = p_target_date
        )
    ), 0)
  INTO absent_marked, leave_marked, manual_skipped;

  RETURN NEXT;
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
  active_session_id BIGINT;
  student_result RECORD;
  staff_result RECORD;
  student_enabled BOOLEAN;
  staff_enabled BOOLEAN;
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

    student_enabled := (
      COALESCE(settings_row.student_auto_mark_absent_enabled, false) = true
      OR (
        COALESCE(settings_row.student_auto_mark_absent_enabled, false) = false
        AND COALESCE(settings_row.staff_auto_mark_absent_enabled, false) = false
        AND COALESCE(settings_row.auto_mark_absent_enabled, false) = true
      )
    );

    staff_enabled := (
      COALESCE(settings_row.staff_auto_mark_absent_enabled, false) = true
      OR (
        COALESCE(settings_row.student_auto_mark_absent_enabled, false) = false
        AND COALESCE(settings_row.staff_auto_mark_absent_enabled, false) = false
        AND COALESCE(settings_row.auto_mark_absent_enabled, false) = true
      )
    );

    SELECT s.id
    INTO active_session_id
    FROM public.sessions s
    WHERE s.school_id = settings_row.school_id
      AND s.is_active = true
    ORDER BY s.id DESC
    LIMIT 1;

    student_absent_marked := 0;
    staff_absent_marked := 0;
    student_result := NULL;
    staff_result := NULL;
    school_id := settings_row.school_id;

    IF student_enabled
       AND settings_row.student_cutoff_time IS NOT NULL
       AND local_time >= settings_row.student_cutoff_time THEN
      SELECT * INTO student_result
      FROM public.finalize_student_absences_for_school(settings_row.school_id, local_date);
      student_absent_marked := COALESCE(student_result.absent_marked, 0);
    END IF;

    IF staff_enabled
       AND settings_row.staff_cutoff_time IS NOT NULL
       AND local_time >= settings_row.staff_cutoff_time THEN
      SELECT * INTO staff_result
      FROM public.finalize_staff_absences_for_school(settings_row.school_id, local_date);
      staff_absent_marked := COALESCE(staff_result.absent_marked, 0);
    END IF;

    INSERT INTO public.attendance_automation_logs (
      school_id,
      session_id,
      local_date,
      run_at,
      run_status,
      student_auto_enabled,
      staff_auto_enabled,
      student_absent_marked,
      staff_absent_marked,
      student_leave_marked,
      staff_leave_marked,
      student_manual_skipped,
      staff_manual_skipped
    )
    VALUES (
      settings_row.school_id,
      active_session_id,
      local_date,
      now(),
      'completed',
      student_enabled,
      staff_enabled,
      COALESCE(student_result.absent_marked, 0),
      COALESCE(staff_result.absent_marked, 0),
      COALESCE(student_result.leave_marked, 0),
      COALESCE(staff_result.leave_marked, 0),
      COALESCE(student_result.manual_skipped, 0),
      COALESCE(staff_result.manual_skipped, 0)
    );

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_attendance_automation_status(
  p_school_id BIGINT
)
RETURNS TABLE (
  local_date DATE,
  last_run_at TIMESTAMPTZ,
  student_auto_enabled BOOLEAN,
  staff_auto_enabled BOOLEAN,
  last_student_absent_marked INTEGER,
  last_staff_absent_marked INTEGER,
  last_student_leave_marked INTEGER,
  last_staff_leave_marked INTEGER,
  last_student_manual_skipped INTEGER,
  last_staff_manual_skipped INTEGER,
  today_manual_only_students INTEGER,
  today_manual_only_staff INTEGER,
  today_approved_student_leaves INTEGER,
  today_approved_staff_leaves INTEGER,
  today_staff_first_half_leaves INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_row RECORD;
  latest_log RECORD;
  active_session_id BIGINT;
BEGIN
  SELECT *
  INTO settings_row
  FROM public.attendance_settings
  WHERE school_id = p_school_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  local_date := timezone(COALESCE(NULLIF(settings_row.timezone, ''), 'Asia/Karachi'), now())::date;

  SELECT s.id
  INTO active_session_id
  FROM public.sessions s
  WHERE s.school_id = p_school_id
    AND s.is_active = true
  ORDER BY s.id DESC
  LIMIT 1;

  SELECT *
  INTO latest_log
  FROM public.attendance_automation_logs
  WHERE school_id = p_school_id
  ORDER BY run_at DESC
  LIMIT 1;

  last_run_at := latest_log.run_at;
  student_auto_enabled := (
    COALESCE(settings_row.student_auto_mark_absent_enabled, false) = true
    OR (
      COALESCE(settings_row.student_auto_mark_absent_enabled, false) = false
      AND COALESCE(settings_row.staff_auto_mark_absent_enabled, false) = false
      AND COALESCE(settings_row.auto_mark_absent_enabled, false) = true
    )
  );
  staff_auto_enabled := (
    COALESCE(settings_row.staff_auto_mark_absent_enabled, false) = true
    OR (
      COALESCE(settings_row.student_auto_mark_absent_enabled, false) = false
      AND COALESCE(settings_row.staff_auto_mark_absent_enabled, false) = false
      AND COALESCE(settings_row.auto_mark_absent_enabled, false) = true
    )
  );
  last_student_absent_marked := COALESCE(latest_log.student_absent_marked, 0);
  last_staff_absent_marked := COALESCE(latest_log.staff_absent_marked, 0);
  last_student_leave_marked := COALESCE(latest_log.student_leave_marked, 0);
  last_staff_leave_marked := COALESCE(latest_log.staff_leave_marked, 0);
  last_student_manual_skipped := COALESCE(latest_log.student_manual_skipped, 0);
  last_staff_manual_skipped := COALESCE(latest_log.staff_manual_skipped, 0);

  SELECT COUNT(*)
  INTO today_manual_only_students
  FROM public.student_class_history sch
  JOIN public.students st
    ON st.id = sch.student_id
   AND st.school_id = sch.school_id
  WHERE sch.school_id = p_school_id
    AND sch.session_id = active_session_id
    AND COALESCE(st.status, 'active') = 'active'
    AND public.get_effective_attendance_mode(st.attendance_mode, st.rfid_uid) = 'manual_only'
    AND NOT public.is_student_holiday(
      p_school_id,
      active_session_id,
      local_date,
      sch.new_class_id,
      sch.new_section_id
    );

  SELECT COUNT(*)
  INTO today_manual_only_staff
  FROM public.staff st
  WHERE st.school_id = p_school_id
    AND COALESCE(st.status, 'active') = 'active'
    AND public.get_effective_attendance_mode(st.attendance_mode, st.rfid_uid) = 'manual_only'
    AND NOT public.is_staff_holiday(
      p_school_id,
      active_session_id,
      local_date,
      st.id
    );

  SELECT COUNT(*)
  INTO today_approved_student_leaves
  FROM public.leave_requests lr
  WHERE lr.school_id = p_school_id
    AND lr.session_id = active_session_id
    AND lr.student_id IS NOT NULL
    AND lr.status = 'approved'
    AND local_date BETWEEN lr.start_date AND lr.end_date;

  SELECT COUNT(*)
  INTO today_approved_staff_leaves
  FROM public.leave_requests lr
  WHERE lr.school_id = p_school_id
    AND lr.session_id = active_session_id
    AND lr.staff_id IS NOT NULL
    AND lr.status = 'approved'
    AND local_date BETWEEN lr.start_date AND lr.end_date;

  SELECT COUNT(*)
  INTO today_staff_first_half_leaves
  FROM public.half_leaves hl
  WHERE hl.school_id = p_school_id
    AND hl.session_id = active_session_id
    AND hl.person_type = 'staff'
    AND hl.leave_type = 'first_half'
    AND hl.date = local_date;

  RETURN NEXT;
END;
$$;
