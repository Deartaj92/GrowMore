-- Migration: Upgrade render_settings table to use JSONB
-- This migration converts the old column-based structure to JSONB for future extensibility
-- Run this if you already have the old render_settings table with individual columns

-- Step 1: Check if old structure exists and migrate data
DO $$
DECLARE
    old_col_exists BOOLEAN;
BEGIN
    -- Check if old column-based structure exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'render_settings' 
        AND column_name = 'teacher_mark_attendance'
    ) INTO old_col_exists;

    IF old_col_exists THEN
        -- Migrate existing data to JSONB structure
        UPDATE render_settings
        SET settings = jsonb_build_object(
            'teacher',
            jsonb_build_object(
                'mark_attendance', COALESCE(teacher_mark_attendance, true),
                'attendance_reports', COALESCE(teacher_attendance_reports, true),
                'reports', COALESCE(teacher_reports, true),
                'test_marks_entry', COALESCE(teacher_test_marks_entry, true),
                'test_records', COALESCE(teacher_test_records, true),
                'my_timetable', COALESCE(teacher_my_timetable, true),
                'assign_diary', COALESCE(teacher_assign_diary, true),
                'examination_marks_entry', COALESCE(teacher_examination_marks_entry, true)
            ),
            'student',
            jsonb_build_object(
                'profile_tab', COALESCE(student_profile_tab, true),
                'reports_tab', COALESCE(student_reports_tab, true),
                'examinations_tab', COALESCE(student_examinations_tab, true),
                'test_records_tab', COALESCE(student_test_records_tab, true),
                'attendance_tab', COALESCE(student_attendance_tab, true),
                'fines_tab', COALESCE(student_fines_tab, true)
            )
        )
        WHERE settings IS NULL OR settings = '{}'::jsonb;

        -- Drop old columns (after data migration)
        ALTER TABLE render_settings
        DROP COLUMN IF EXISTS teacher_mark_attendance,
        DROP COLUMN IF EXISTS teacher_attendance_reports,
        DROP COLUMN IF EXISTS teacher_reports,
        DROP COLUMN IF EXISTS teacher_test_marks_entry,
        DROP COLUMN IF EXISTS teacher_test_records,
        DROP COLUMN IF EXISTS teacher_my_timetable,
        DROP COLUMN IF EXISTS teacher_assign_diary,
        DROP COLUMN IF EXISTS teacher_examination_marks_entry,
        DROP COLUMN IF EXISTS student_profile_tab,
        DROP COLUMN IF EXISTS student_reports_tab,
        DROP COLUMN IF EXISTS student_examinations_tab,
        DROP COLUMN IF EXISTS student_test_records_tab,
        DROP COLUMN IF EXISTS student_attendance_tab,
        DROP COLUMN IF EXISTS student_fines_tab;

        RAISE NOTICE 'Migrated render_settings from column-based to JSONB structure';
    ELSE
        RAISE NOTICE 'render_settings table already uses JSONB structure or does not exist';
    END IF;
END $$;

-- Step 2: Ensure settings column exists and has default
ALTER TABLE render_settings
ALTER COLUMN settings SET DEFAULT '{"teacher": {}, "student": {}}'::jsonb;

-- Step 3: Create GIN index for JSONB queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_render_settings_settings_gin 
ON render_settings USING GIN (settings);

-- Step 4: Update comments
COMMENT ON TABLE render_settings IS 'Stores render settings for controlling visibility of menu items for teachers and students. Uses JSONB for flexible, schema-free configuration.';
COMMENT ON COLUMN render_settings.settings IS 'JSONB object containing visibility settings. Structure: {"teacher": {"card_key": true/false}, "student": {"tab_key": true/false}}. New cards/tabs can be added without schema changes.';


