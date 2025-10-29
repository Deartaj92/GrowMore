-- Migration script to add session_id column to exam_results table
-- This script adds session_id column and updates all existing records with session ID 4

-- Add session_id column to exam_results table
DO $$
BEGIN
    -- Check if exam_results table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_results') THEN
        
        -- Add session_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exam_results' AND column_name = 'session_id') THEN
            ALTER TABLE public.exam_results ADD COLUMN session_id bigint;
            
            -- Update all existing records with session_id = 4
            UPDATE public.exam_results 
            SET session_id = 4 
            WHERE session_id IS NULL;
            
            -- Add NOT NULL constraint
            ALTER TABLE public.exam_results ALTER COLUMN session_id SET NOT NULL;
            
            -- Add foreign key constraint to sessions table
            ALTER TABLE public.exam_results 
            ADD CONSTRAINT exam_results_session_id_fkey 
            FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
            
            -- Add index for better query performance
            CREATE INDEX IF NOT EXISTS idx_exam_results_session_id ON public.exam_results(session_id);
            
            RAISE NOTICE 'Successfully added session_id column to exam_results table and updated all existing records with session_id = 4';
        ELSE
            RAISE NOTICE 'session_id column already exists in exam_results table';
        END IF;
    ELSE
        RAISE NOTICE 'exam_results table does not exist';
    END IF;
END $$;

-- Verify the changes
DO $$
DECLARE
    record_count integer;
    session_count integer;
BEGIN
    -- Count total records in exam_results
    SELECT COUNT(*) INTO record_count FROM public.exam_results;
    
    -- Count records with session_id = 4
    SELECT COUNT(*) INTO session_count FROM public.exam_results WHERE session_id = 4;
    
    RAISE NOTICE 'Total exam_results records: %', record_count;
    RAISE NOTICE 'Records with session_id = 4: %', session_count;
    
    -- Verify all records have session_id
    IF record_count = session_count THEN
        RAISE NOTICE 'SUCCESS: All exam_results records have been updated with session_id = 4';
    ELSE
        RAISE NOTICE 'WARNING: Not all records have session_id = 4. Please check manually.';
    END IF;
END $$;







