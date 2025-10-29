-- DESTROY QUERY: Clean up any test record management schema changes
-- This script safely removes all test-related objects (if they exist)

-- Drop all test-related tables (in correct order due to foreign key constraints)
-- Using IF EXISTS to avoid errors if tables don't exist
DROP TABLE IF EXISTS test_analytics CASCADE;
DROP TABLE IF EXISTS test_questions CASCADE;
DROP TABLE IF EXISTS test_results CASCADE;
DROP TABLE IF EXISTS test_sessions CASCADE;
DROP TABLE IF EXISTS test_records CASCADE;

-- Drop any test-related functions (if they exist)
DROP FUNCTION IF EXISTS auto_grade_test_session(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_test_analytics(INTEGER, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS calculate_grade(DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS update_test_result_grade() CASCADE;

-- Drop any test-related indexes (if they exist)
DROP INDEX IF EXISTS idx_test_records_school CASCADE;
DROP INDEX IF EXISTS idx_test_records_class CASCADE;
DROP INDEX IF EXISTS idx_test_records_date CASCADE;
DROP INDEX IF EXISTS idx_test_sessions_school CASCADE;
DROP INDEX IF EXISTS idx_test_sessions_test CASCADE;
DROP INDEX IF EXISTS idx_test_sessions_student CASCADE;
DROP INDEX IF EXISTS idx_test_results_school CASCADE;
DROP INDEX IF EXISTS idx_test_results_test CASCADE;
DROP INDEX IF EXISTS idx_test_results_student CASCADE;
DROP INDEX IF EXISTS idx_test_questions_school CASCADE;
DROP INDEX IF EXISTS idx_test_questions_test CASCADE;
DROP INDEX IF EXISTS idx_test_analytics_school CASCADE;
DROP INDEX IF EXISTS idx_test_analytics_test CASCADE;

-- Drop any test-related sequences (if they exist)
DROP SEQUENCE IF EXISTS test_records_id_seq CASCADE;
DROP SEQUENCE IF EXISTS test_sessions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS test_results_id_seq CASCADE;
DROP SEQUENCE IF EXISTS test_questions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS test_analytics_id_seq CASCADE;

-- Drop any test-related types (if any were created)
DROP TYPE IF EXISTS test_type_enum CASCADE;
DROP TYPE IF EXISTS test_status_enum CASCADE;
DROP TYPE IF EXISTS difficulty_level_enum CASCADE;
DROP TYPE IF EXISTS question_type_enum CASCADE;

-- Success message
SELECT 'Test schema cleanup completed successfully - no test tables were found in the database' as status;
