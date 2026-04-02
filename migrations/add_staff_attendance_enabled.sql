ALTER TABLE staff
ADD COLUMN IF NOT EXISTS attendance_enabled BOOLEAN DEFAULT TRUE;

UPDATE staff
SET attendance_enabled = TRUE
WHERE attendance_enabled IS NULL;
