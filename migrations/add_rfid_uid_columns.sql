-- ============================================================
-- RFID Attendance System Migration
-- Run this in Supabase SQL Editor to enable RFID scanning
-- ============================================================

-- 1. Add rfid_uid column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS rfid_uid TEXT;

-- 2. Add rfid_uid column to staff table  
ALTER TABLE staff ADD COLUMN IF NOT EXISTS rfid_uid TEXT;

-- 3. Create unique indexes (scoped per school to allow same UID across schools)
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_rfid_school 
  ON students(rfid_uid, school_id) 
  WHERE rfid_uid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_rfid_school 
  ON staff(rfid_uid, school_id) 
  WHERE rfid_uid IS NOT NULL;

-- 4. Add 'source' column to attendance_records to track RFID vs manual
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- 5. Add 'source' column to staff_attendance_records
ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- 6. Add 'check_in_time' to track the actual time of scan
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;
ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;

-- Verification
SELECT 
  'students' as table_name,
  COUNT(*) FILTER (WHERE rfid_uid IS NOT NULL) as assigned_cards,
  COUNT(*) as total
FROM students
UNION ALL
SELECT 
  'staff' as table_name,
  COUNT(*) FILTER (WHERE rfid_uid IS NOT NULL) as assigned_cards,
  COUNT(*) as total
FROM staff;
