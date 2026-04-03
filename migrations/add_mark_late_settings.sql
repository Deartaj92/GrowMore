ALTER TABLE attendance_settings
ADD COLUMN IF NOT EXISTS student_mark_late_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE attendance_settings
ADD COLUMN IF NOT EXISTS staff_mark_late_enabled BOOLEAN DEFAULT TRUE;
