ALTER TABLE public.attendance_settings
ADD COLUMN IF NOT EXISTS student_auto_mark_absent_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS staff_auto_mark_absent_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE public.attendance_settings
SET
  student_auto_mark_absent_enabled = COALESCE(student_auto_mark_absent_enabled, auto_mark_absent_enabled, false),
  staff_auto_mark_absent_enabled = COALESCE(staff_auto_mark_absent_enabled, auto_mark_absent_enabled, false),
  auto_mark_absent_enabled = COALESCE(
    auto_mark_absent_enabled,
    student_auto_mark_absent_enabled,
    staff_auto_mark_absent_enabled,
    false
  );

COMMENT ON COLUMN public.attendance_settings.auto_mark_absent_enabled IS
  'Legacy aggregate flag for backend auto-marking of absent attendance after cutoff times.';
COMMENT ON COLUMN public.attendance_settings.student_auto_mark_absent_enabled IS
  'Enables backend auto-marking of absent attendance for students after cutoff time.';
COMMENT ON COLUMN public.attendance_settings.staff_auto_mark_absent_enabled IS
  'Enables backend auto-marking of absent attendance for staff after cutoff time.';

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
