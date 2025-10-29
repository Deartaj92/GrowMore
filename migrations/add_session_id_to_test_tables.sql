-- Migration script to add session_id to existing test_records and test_results tables
-- Run this if the tables already exist but don't have session_id column

-- Check if test_records table exists and add session_id if missing
DO $$
BEGIN
    -- Add session_id column to test_records if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_records') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_records' AND column_name = 'session_id') THEN
            ALTER TABLE test_records ADD COLUMN session_id INTEGER;
            
            -- Add foreign key constraint for session_id
            ALTER TABLE test_records 
            ADD CONSTRAINT fk_test_records_session 
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
            
            -- Create index for session_id
            CREATE INDEX IF NOT EXISTS idx_test_records_session ON test_records(session_id);
            
            RAISE NOTICE 'Added session_id column to test_records table';
        ELSE
            RAISE NOTICE 'session_id column already exists in test_records table';
        END IF;
    ELSE
        RAISE NOTICE 'test_records table does not exist';
    END IF;
END $$;

-- Check if test_results table exists and add session_id if missing
DO $$
BEGIN
    -- Add session_id column to test_results if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_results') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_results' AND column_name = 'session_id') THEN
            ALTER TABLE test_results ADD COLUMN session_id INTEGER;
            
            -- Add foreign key constraint for session_id
            ALTER TABLE test_results 
            ADD CONSTRAINT fk_test_results_session 
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
            
            -- Create index for session_id
            CREATE INDEX IF NOT EXISTS idx_test_results_session ON test_results(session_id);
            
            RAISE NOTICE 'Added session_id column to test_results table';
        ELSE
            RAISE NOTICE 'session_id column already exists in test_results table';
        END IF;
    ELSE
        RAISE NOTICE 'test_results table does not exist';
    END IF;
END $$;

-- Update existing records to use the current active session
-- This is a one-time migration for existing data
DO $$
DECLARE
    active_session_id INTEGER;
BEGIN
    -- Get the current active session ID
    SELECT id INTO active_session_id 
    FROM sessions 
    WHERE is_active = true 
    LIMIT 1;
    
    IF active_session_id IS NOT NULL THEN
        -- Update test_records with null session_id to use active session
        UPDATE test_records 
        SET session_id = active_session_id 
        WHERE session_id IS NULL;
        
        -- Update test_results with null session_id to use active session
        UPDATE test_results 
        SET session_id = active_session_id 
        WHERE session_id IS NULL;
        
        RAISE NOTICE 'Updated existing records to use active session ID: %', active_session_id;
    ELSE
        RAISE NOTICE 'No active session found. Please set an active session before running this migration.';
    END IF;
END $$;

-- Make session_id NOT NULL after updating existing records
DO $$
BEGIN
    -- Make session_id NOT NULL in test_records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_records') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_records' AND column_name = 'session_id' AND is_nullable = 'YES') THEN
            ALTER TABLE test_records ALTER COLUMN session_id SET NOT NULL;
            RAISE NOTICE 'Made session_id NOT NULL in test_records';
        END IF;
    END IF;
    
    -- Make session_id NOT NULL in test_results
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_results') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_results' AND column_name = 'session_id' AND is_nullable = 'YES') THEN
            ALTER TABLE test_results ALTER COLUMN session_id SET NOT NULL;
            RAISE NOTICE 'Made session_id NOT NULL in test_results';
        END IF;
    END IF;
END $$;







