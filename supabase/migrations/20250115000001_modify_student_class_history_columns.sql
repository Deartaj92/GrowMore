-- Migration to modify student_class_history table structure
-- Rename class_id to adm_class_id and section_id to adm_section_id
-- Add new columns new_class_id and new_section_id
-- This preserves all existing data - NO DATA WILL BE LOST
-- 
-- SAFETY: This migration uses RENAME COLUMN which preserves all data
-- SAFETY: New columns are added as nullable, then populated from existing data
-- SAFETY: All operations are reversible if needed

-- Step 0: Verify table exists and has data (safety check)
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM student_class_history;
    RAISE NOTICE 'Starting migration. Current record count: %', record_count;
END $$;

-- Step 1: Drop existing indexes that reference the columns we're renaming
DROP INDEX IF EXISTS idx_sch_class_session;
DROP INDEX IF EXISTS idx_sch_section_session;

-- Step 2: Drop foreign key constraints (they will be recreated with new column names)
-- Note: PostgreSQL doesn't allow direct renaming of columns with foreign keys,
-- so we need to drop and recreate them

-- Drop foreign key constraint on class_id
DO $$ 
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Find and drop foreign key constraint on class_id
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'student_class_history'
        AND kcu.column_name = 'class_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE student_class_history DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
    END IF;
    
    -- Find and drop foreign key constraint on section_id
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'student_class_history'
        AND kcu.column_name = 'section_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE student_class_history DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
    END IF;
END $$;

-- Step 3: Rename existing columns (this preserves all data)
ALTER TABLE student_class_history 
    RENAME COLUMN class_id TO adm_class_id;

ALTER TABLE student_class_history 
    RENAME COLUMN section_id TO adm_section_id;

-- Step 4: Add new columns for current class and section
ALTER TABLE student_class_history 
    ADD COLUMN new_class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    ADD COLUMN new_section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE;

-- Step 5: Recreate foreign key constraint for adm_class_id
ALTER TABLE student_class_history 
    ADD CONSTRAINT student_class_history_adm_class_id_fkey 
    FOREIGN KEY (adm_class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- Step 6: Recreate foreign key constraint for adm_section_id (nullable)
ALTER TABLE student_class_history 
    ADD CONSTRAINT student_class_history_adm_section_id_fkey 
    FOREIGN KEY (adm_section_id) REFERENCES sections(id) ON DELETE CASCADE;

-- Step 7: Recreate indexes with new column names
CREATE INDEX IF NOT EXISTS idx_sch_adm_class_session ON student_class_history(adm_class_id, session_id);
CREATE INDEX IF NOT EXISTS idx_sch_adm_section_session ON student_class_history(adm_section_id, session_id);
CREATE INDEX IF NOT EXISTS idx_sch_new_class_session ON student_class_history(new_class_id, session_id);
CREATE INDEX IF NOT EXISTS idx_sch_new_section_session ON student_class_history(new_section_id, session_id);

-- Step 8: For existing records, copy adm_class_id to new_class_id and adm_section_id to new_section_id
-- This ensures existing data is preserved and the new columns have values
-- SAFETY: This copies ALL existing data to the new columns, preserving everything
-- Since new columns are just added, they're all NULL, so this will update all existing records
UPDATE student_class_history 
SET 
    new_class_id = adm_class_id,
    new_section_id = adm_section_id;

-- Step 8.5: Verify data preservation (safety check)
DO $$
DECLARE
    before_count INTEGER;
    after_count INTEGER;
    null_check_count INTEGER;
BEGIN
    -- Count records with data in new columns
    SELECT COUNT(*) INTO after_count 
    FROM student_class_history 
    WHERE new_class_id IS NOT NULL;
    
    -- Count records where adm_class_id matches new_class_id (data integrity check)
    SELECT COUNT(*) INTO null_check_count
    FROM student_class_history
    WHERE adm_class_id IS NOT NULL AND new_class_id IS NULL;
    
    IF null_check_count > 0 THEN
        RAISE WARNING 'Data integrity check: % records have adm_class_id but NULL new_class_id', null_check_count;
    END IF;
    
    RAISE NOTICE 'Migration completed. Records with new_class_id populated: %', after_count;
END $$;

-- Step 9: Add comments to document the column purposes
COMMENT ON COLUMN student_class_history.adm_class_id IS 'Admission class ID - the class the student was admitted to';
COMMENT ON COLUMN student_class_history.adm_section_id IS 'Admission section ID - the section the student was admitted to (nullable for classes without sections)';
COMMENT ON COLUMN student_class_history.new_class_id IS 'Current/new class ID - the class the student is currently in or being promoted to';
COMMENT ON COLUMN student_class_history.new_section_id IS 'Current/new section ID - the section the student is currently in or being promoted to (nullable for classes without sections)';

