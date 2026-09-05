-- Migration to update perform_absence_marking and trigger_attendance_automation
-- Ensures that clicking the manual absence mark ("A") button marks ALL students with no attendance,
-- regardless of whether they have a card / rfid_uid assigned.

CREATE OR REPLACE FUNCTION public.perform_absence_marking(p_school_id integer, p_date date)
RETURNS jsonb AS $$
DECLARE
  cnt int := 0;
  col_exists boolean := false;
  has_attendance_class_id boolean := false;
  has_student_class_id boolean := false;
  v_session_id integer;
  sql text;
BEGIN
  -- Basic Sunday guard
  IF EXTRACT(DOW FROM p_date) = 0 THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'Sunday', 'message', 'Cannot mark absents on Sundays.');
  END IF;

  -- Ensure required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
    RETURN jsonb_build_object('status', 'ok', 'date', p_date, 'school_id', p_school_id, 'message', 'Students table missing; no action taken');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_records') THEN
    RETURN jsonb_build_object('status', 'ok', 'date', p_date, 'school_id', p_school_id, 'message', 'Attendance records table missing; no action taken');
  END IF;

  -- Perform insert if possible
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'class_id' AND table_schema = 'public'
  ) INTO has_attendance_class_id;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'class_id' AND table_schema = 'public'
  ) INTO has_student_class_id;
  IF NOT (has_attendance_class_id AND has_student_class_id) THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'MissingColumn', 'message', 'Missing required class_id column');
  END IF;

  -- Determine active session for the school
  SELECT id INTO v_session_id FROM sessions WHERE school_id = p_school_id AND is_active = true LIMIT 1;
  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'NoActiveSession', 'message', 'No active session for this school');
  END IF;

  -- Determine columns to insert
  DECLARE
    has_attendance_section_id boolean := false;
    has_attendance_source boolean := false;
    cols_str text := 'school_id, student_id, class_id, date, status, session_id';
    select_str text := '$1, s.id, sch.new_class_id, $2, ''absent'', $3';
  BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'section_id' AND table_schema = 'public') INTO has_attendance_section_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'source' AND table_schema = 'public') INTO has_attendance_source;

    IF has_attendance_section_id THEN
      cols_str := cols_str || ', section_id';
      select_str := select_str || ', sch.new_section_id';
    END IF;

    IF has_attendance_source THEN
      cols_str := cols_str || ', source';
      select_str := select_str || ', ''manual-trigger''';
    END IF;

    sql := 'INSERT INTO attendance_records (' || cols_str || ') ' ||
           'SELECT ' || select_str || ' FROM students s ' ||
           'INNER JOIN student_class_history sch ON s.id = sch.student_id AND s.school_id = sch.school_id ' ||
           'WHERE s.school_id = $1 AND sch.session_id = $3 AND sch.new_class_id IS NOT NULL';
  END;

  -- Filter for active students
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'status' AND table_schema = 'public') THEN
    sql := sql || ' AND COALESCE(s.status, ''active'') = ''active''';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'is_active' AND table_schema = 'public') THEN
    sql := sql || ' AND s.is_active = true';
  END IF;

  -- Mark all students who do not already have attendance for the date (no card requirement)
  sql := sql || ' AND NOT EXISTS (' ||
         'SELECT 1 FROM attendance_records ar WHERE ar.school_id = $1 AND ar.student_id = s.id AND ar.date = $2' ||
         ')';

  EXECUTE sql USING p_school_id, p_date, v_session_id;
  GET DIAGNOSTICS cnt = ROW_COUNT;

  IF cnt IS NULL THEN cnt := 0; END IF;
  RETURN jsonb_build_object('status', 'ok', 'date', p_date, 'school_id', p_school_id, 'marked', cnt, 'message', 'Absences marked: ' || cnt);
END;
$$ LANGUAGE plpgsql;
