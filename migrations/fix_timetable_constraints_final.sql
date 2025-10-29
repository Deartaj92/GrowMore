-- Final migration to fix timetable constraints
-- This will remove the old constraint and add the new one

-- First, let's see what constraints exist
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'timetable'
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- Drop ALL possible constraint names that might exist
ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_class_id_period_index_day_of_week_session_id_school_id_key;
ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_class_id_period_index_day_of_week_session_id_school_id_unique;
ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_unique_subject_teacher_period;

-- Now add the new constraint that allows multiple subjects per period
ALTER TABLE timetable ADD CONSTRAINT timetable_unique_subject_teacher_period 
UNIQUE (class_id, period_index, day_of_week, session_id, school_id, subject_id, teacher_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timetable_class_period_subject_teacher 
ON timetable(class_id, period_index, day_of_week, session_id, school_id, subject_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_timetable_class_period_day_session 
ON timetable(class_id, period_index, day_of_week, session_id, school_id);

-- Verify the new constraint exists
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'timetable'
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name, kcu.ordinal_position;
