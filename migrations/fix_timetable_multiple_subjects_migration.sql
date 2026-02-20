-- Migration to fix timetable table to support multiple subjects per period per class
-- This removes the unique constraint that prevents multiple subjects in the same period

-- First, drop the existing unique constraint (try different possible constraint names)
ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_class_id_period_index_day_of_week_session_id_school_id_key;
ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_class_id_period_index_day_of_week_session_id_school_id_unique;

-- Drop the new constraint if it already exists (in case of partial migration)
ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_unique_subject_teacher_period;

-- Add a new unique constraint that allows multiple subjects per period
-- but prevents duplicate subject-teacher pairs in the same period
ALTER TABLE timetable ADD CONSTRAINT timetable_unique_subject_teacher_period 
UNIQUE (class_id, period_index, day_of_week, session_id, school_id, subject_id, teacher_id);

-- Add an index for better performance when querying by class and period
CREATE INDEX IF NOT EXISTS idx_timetable_class_period_subject_teacher 
ON timetable(class_id, period_index, day_of_week, session_id, school_id, subject_id, teacher_id);

-- Add a composite index for better performance when loading timetable data
CREATE INDEX IF NOT EXISTS idx_timetable_class_period_day_session 
ON timetable(class_id, period_index, day_of_week, session_id, school_id);
