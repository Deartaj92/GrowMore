-- Script to clear all existing homework diary entries
-- This will delete all records from the homework_diary table
-- WARNING: This operation cannot be undone!

-- Option 1: Delete all homework diary entries (keeps table structure)
DELETE FROM homework_diary;

-- Option 2: If you want to reset the auto-increment sequence as well
-- ALTER SEQUENCE homework_diary_id_seq RESTART WITH 1;

-- Verify deletion
SELECT COUNT(*) as remaining_entries FROM homework_diary;

-- Optional: Show a message
DO $$
BEGIN
    RAISE NOTICE 'All homework diary entries have been cleared.';
END $$;

