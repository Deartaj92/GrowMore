-- Comprehensive script to make section_id nullable in exam_results table
-- This allows exam results to be saved for classes without sections

-- 1. First, check if the constraint exists and drop it if it does
DO $$ 
BEGIN
    -- Drop the NOT NULL constraint if it exists
    ALTER TABLE exam_results ALTER COLUMN section_id DROP NOT NULL;
    
    -- Log the change
    RAISE NOTICE 'Successfully made section_id nullable in exam_results table';
EXCEPTION
    WHEN OTHERS THEN
        -- Log any errors but don't fail the script
        RAISE NOTICE 'Error making section_id nullable: %', SQLERRM;
END $$;

-- 2. Verify the change
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'exam_results' 
AND column_name = 'section_id';

