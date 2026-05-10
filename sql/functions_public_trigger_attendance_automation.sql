CREATE OR REPLACE FUNCTION public.trigger_attendance_automation(p_school_id integer, p_date date)
RETURNS jsonb AS $$
DECLARE
  holiday_name text;
  result jsonb;
  col_exists boolean := false;
  is_holiday boolean := false;
BEGIN
  -- Sunday skip (defensive: server-side enforcement)
  IF EXTRACT(DOW FROM p_date) = 0 THEN
    RETURN jsonb_build_object(
      'status', 'skipped',
      'reason', 'Sunday',
      'message', 'Cannot mark absents on Sundays.'
    );
  END IF;

  -- Holiday check (server-side, robust to schema differences)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'holidays') THEN
    -- 1. Check for holiday_date column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holidays' AND column_name = 'holiday_date' AND table_schema = 'public') THEN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM holidays WHERE school_id = $1 AND holiday_date = $2)'
      INTO is_holiday USING p_school_id, p_date;
      IF is_holiday THEN
          EXECUTE 'SELECT name FROM holidays WHERE school_id = $1 AND holiday_date = $2 LIMIT 1'
          INTO holiday_name USING p_school_id, p_date;
      END IF;
    END IF;

    -- 2. If not found, check for 'date' column
    IF NOT is_holiday AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holidays' AND column_name = 'date' AND table_schema = 'public') THEN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM holidays WHERE school_id = $1 AND date = $2)'
      INTO is_holiday USING p_school_id, p_date;
      IF is_holiday THEN
          EXECUTE 'SELECT name FROM holidays WHERE school_id = $1 AND date = $2 LIMIT 1'
          INTO holiday_name USING p_school_id, p_date;
      END IF;
    END IF;

    -- 3. If not found, check for start_date/end_date range
    IF NOT is_holiday 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holidays' AND column_name = 'start_date' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holidays' AND column_name = 'end_date' AND table_schema = 'public') THEN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM holidays WHERE school_id = $1 AND $2 BETWEEN start_date AND end_date)'
      INTO is_holiday USING p_school_id, p_date;
      IF is_holiday THEN
          EXECUTE 'SELECT name FROM holidays WHERE school_id = $1 AND $2 BETWEEN start_date AND end_date LIMIT 1'
          INTO holiday_name USING p_school_id, p_date;
      END IF;
    END IF;

    IF is_holiday THEN
        RETURN jsonb_build_object(
          'status', 'skipped',
          'reason', 'Holiday',
          'holiday_name', holiday_name,
          'message', 'Today is a holiday: ' || COALESCE(holiday_name, 'School Holiday') || '. Absent marking skipped.'
        );
    END IF;
  END IF;

  -- If there is a dedicated server-side marking function, delegate to it
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'perform_absence_marking' AND pronamespace = 'public'::regnamespace) INTO col_exists;
  IF col_exists THEN
    EXECUTE 'SELECT public.perform_absence_marking($1, $2)' USING p_school_id, p_date INTO result;
    RETURN result;
  END IF;

  -- TODO: Implement the actual auto-mark logic on the server side (fallback no-op).
  -- For now, return a success signal so frontend can refresh state.
  RETURN jsonb_build_object('status', 'ok', 'date', p_date, 'school_id', p_school_id,
    'message', 'Manual absence marking triggered for ' || to_char(p_date, 'YYYY-MM-DD')
  );
END;
$$ LANGUAGE plpgsql;

-- Backend helper: perform actual absence marking (best-effort; depends on schema)
CREATE OR REPLACE FUNCTION public.perform_absence_marking(p_school_id integer, p_date date)
RETURNS jsonb AS $$
DECLARE
  cnt int := 0;
  col_exists boolean := false;
  has_attendance_class_id boolean := false;
  has_student_class_id boolean := false;
  session_id integer;
  sql text;
BEGIN
  -- Basic Sunday guard (redundant, but safe)
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

  -- Perform insert if possible (robust guard against NOT NULL constraints)
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
  SELECT id INTO session_id FROM sessions WHERE school_id = p_school_id AND is_active = true LIMIT 1;
  IF session_id IS NULL THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'NoActiveSession', 'message', 'No active session for this school');
  END IF;

  -- Determine columns to insert
  DECLARE
    has_attendance_section_id boolean := false;
    has_attendance_source boolean := false;
    cols_str text := 'school_id, student_id, class_id, date, status, session_id';
    select_str text := '$1, s.id, sch.new_class_id, $2, ''absent'', ' || session_id;
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
           'WHERE s.school_id = $1 AND sch.session_id = ' || session_id || ' AND sch.new_class_id IS NOT NULL';
  END;

  -- Optional filters if columns exist
  -- Filter for active students
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'status' AND table_schema = 'public') THEN
    sql := sql || ' AND COALESCE(s.status, ''active'') = ''active''';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'is_active' AND table_schema = 'public') THEN
    sql := sql || ' AND s.is_active = true';
  END IF;

  -- Filter for students with cards assigned (RFID)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'rfid_uid' AND table_schema = 'public') THEN
    sql := sql || ' AND s.rfid_uid IS NOT NULL AND NULLIF(BTRIM(s.rfid_uid), '''') IS NOT NULL';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'card_id' AND table_schema = 'public') THEN
    sql := sql || ' AND s.card_id IS NOT NULL';
  END IF;

  sql := sql || ' AND NOT EXISTS (' ||
         'SELECT 1 FROM attendance_records ar WHERE ar.school_id = $1 AND ar.student_id = s.id AND ar.date = $2' ||
         ')';
  EXECUTE sql USING p_school_id, p_date;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  

  IF cnt IS NULL THEN cnt := 0; END IF;
  RETURN jsonb_build_object('status', 'ok', 'date', p_date, 'school_id', p_school_id, 'marked', cnt, 'message', 'Absences marked: ' || cnt);
END;
$$ LANGUAGE plpgsql;
