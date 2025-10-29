-- Make section_id nullable in attendance_records table
-- This allows classes without sections to have attendance records

-- First, check if the column exists and has NOT NULL constraint
DO $$
BEGIN
    -- Check if section_id column exists and has NOT NULL constraint
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'attendance_records' 
        AND column_name = 'section_id' 
        AND is_nullable = 'NO'
    ) THEN
        -- Drop the NOT NULL constraint
        ALTER TABLE attendance_records 
        ALTER COLUMN section_id DROP NOT NULL;
        
        RAISE NOTICE 'Successfully made section_id nullable in attendance_records table';
    ELSE
        RAISE NOTICE 'section_id column in attendance_records table is already nullable or does not exist';
    END IF;
END $$;

-- Add a comment to document the change
COMMENT ON COLUMN attendance_records.section_id IS 'Section ID - nullable to support classes without sections';


