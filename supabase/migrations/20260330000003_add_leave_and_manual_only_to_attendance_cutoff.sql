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
      MAX(sch.new_section_id) AS section_id,
      MAX(st.rfid_uid) AS rfid_uid
    FROM public.student_class_history sch
    INNER JOIN public.students st
      ON st.id = sch.student_id
     AND st.school_id = sch.school_id
    WHERE sch.school_id = p_school_id
      AND sch.session_id = v_session_id
      AND COALESCE(st.status, 'active') = 'active'
    GROUP BY sch.student_id
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
      cs.student_id,
      p_school_id,
      v_session_id,
      cs.class_id,
      cs.section_id,
      p_target_date,
      'leave',
      'auto-leave',
      NULL
    FROM current_students cs
    WHERE NOT public.is_student_holiday(
      p_school_id,
      v_session_id,
      p_target_date,
      cs.class_id,
      cs.section_id
    )
      AND EXISTS (
        SELECT 1
        FROM public.leave_requests lr
        WHERE lr.school_id = p_school_id
          AND lr.session_id = v_session_id
          AND lr.student_id = cs.student_id
          AND lr.status = 'approved'
          AND p_target_date BETWEEN lr.start_date AND lr.end_date
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.attendance_records ar
        WHERE ar.school_id = p_school_id
          AND ar.student_id = cs.student_id
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
    WHERE COALESCE(NULLIF(BTRIM(cs.rfid_uid), ''), '') <> ''
      AND NOT public.is_student_holiday(
        p_school_id,
        v_session_id,
        p_target_date,
        cs.class_id,
        cs.section_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.leave_requests lr
        WHERE lr.school_id = p_school_id
          AND lr.session_id = v_session_id
          AND lr.student_id = cs.student_id
          AND lr.status = 'approved'
          AND p_target_date BETWEEN lr.start_date AND lr.end_date
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
  SELECT COALESCE((SELECT COUNT(*) FROM leave_rows), 0) + COALESCE((SELECT COUNT(*) FROM absent_rows), 0)
  INTO v_inserted_count;

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
    SELECT
      st.id AS staff_id,
      st.rfid_uid
    FROM public.staff st
    WHERE st.school_id = p_school_id
      AND COALESCE(st.status, 'active') = 'active'
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
      cs.staff_id,
      p_school_id,
      v_session_id,
      p_target_date,
      'leave',
      'auto-leave',
      NULL
    FROM current_staff cs
    WHERE NOT public.is_staff_holiday(
      p_school_id,
      v_session_id,
      p_target_date,
      cs.staff_id
    )
      AND EXISTS (
        SELECT 1
        FROM public.leave_requests lr
        WHERE lr.school_id = p_school_id
          AND lr.session_id = v_session_id
          AND lr.staff_id = cs.staff_id
          AND lr.status = 'approved'
          AND p_target_date BETWEEN lr.start_date AND lr.end_date
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.staff_attendance_records sar
        WHERE sar.school_id = p_school_id
          AND sar.staff_id = cs.staff_id
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
      cs.staff_id,
      p_school_id,
      v_session_id,
      p_target_date,
      'absent',
      'auto-cutoff',
      NULL
    FROM current_staff cs
    WHERE COALESCE(NULLIF(BTRIM(cs.rfid_uid), ''), '') <> ''
      AND NOT public.is_staff_holiday(
        p_school_id,
        v_session_id,
        p_target_date,
        cs.staff_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.leave_requests lr
        WHERE lr.school_id = p_school_id
          AND lr.session_id = v_session_id
          AND lr.staff_id = cs.staff_id
          AND lr.status = 'approved'
          AND p_target_date BETWEEN lr.start_date AND lr.end_date
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
  SELECT COALESCE((SELECT COUNT(*) FROM leave_rows), 0) + COALESCE((SELECT COUNT(*) FROM absent_rows), 0)
  INTO v_inserted_count;

  RETURN COALESCE(v_inserted_count, 0);
END;
$$;
