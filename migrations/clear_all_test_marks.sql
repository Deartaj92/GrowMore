-- Clear All Test Marks and Records
-- This script removes all existing test marks and test records from the database
-- WARNING: This will permanently delete all test data!

-- Step 1: Delete all test results (student marks)
DELETE FROM test_results;

-- Step 2: Delete all test records (test definitions)
DELETE FROM test_records;

-- Optional: Reset the sequence counters to start from 1 again
-- Uncomment the following lines if you want to reset the ID sequences
-- ALTER SEQUENCE test_records_id_seq RESTART WITH 1;
-- ALTER SEQUENCE test_results_id_seq RESTART WITH 1;

-- Verify the cleanup
SELECT 'test_records' as table_name, COUNT(*) as remaining_records FROM test_records
UNION ALL
SELECT 'test_results' as table_name, COUNT(*) as remaining_records FROM test_results;

-- Show completion message
SELECT 'All test marks and records have been cleared successfully!' as status;
