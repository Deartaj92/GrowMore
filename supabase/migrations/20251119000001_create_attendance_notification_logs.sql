-- Migration: create_attendance_notification_logs
-- Date: 2025-11-19

-- Up -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_notification_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notification_date DATE NOT NULL,
  channel notification_channel NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'sent',
  message TEXT,
  msg_type TEXT CHECK (msg_type IN ('General', 'Attendance', 'Fee', 'Report')),
  sent_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_notification_logs_unique
  ON attendance_notification_logs (school_id, student_id, notification_date, channel);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_attendance_notification_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_notification_logs_updated_at ON attendance_notification_logs;
CREATE TRIGGER trg_attendance_notification_logs_updated_at
  BEFORE UPDATE ON attendance_notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_notification_logs_updated_at();

-- Down -----------------------------------------------------------
-- DROP TRIGGER IF EXISTS trg_attendance_notification_logs_updated_at ON attendance_notification_logs;
-- DROP FUNCTION IF EXISTS update_attendance_notification_logs_updated_at();
-- DROP TABLE IF EXISTS attendance_notification_logs;


