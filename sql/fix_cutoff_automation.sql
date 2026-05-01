-- Update automated student absence marking to strictly follow the "active + has card" rule
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

  -- Sunday skip
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
      -- HARD ENFORCEMENT: Must have card assigned
      AND es.rfid_uid IS NOT NULL AND NULLIF(BTRIM(es.rfid_uid), '') IS NOT NULL
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
      WHERE (es.effective_mode = 'manual_only' OR es.rfid_uid IS NULL OR NULLIF(BTRIM(es.rfid_uid), '') IS NULL)
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

-- Update automated staff absence marking to strictly follow the "active + has card" rule
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

  -- Sunday skip
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
      -- HARD ENFORCEMENT: Must have card assigned
      AND es.rfid_uid IS NOT NULL AND NULLIF(BTRIM(es.rfid_uid), '') IS NOT NULL
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
      WHERE (es.effective_mode = 'manual_only' OR es.rfid_uid IS NULL OR NULLIF(BTRIM(es.rfid_uid), '') IS NULL)
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
