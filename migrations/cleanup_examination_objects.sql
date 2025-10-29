-- Cleanup Examination Objects from Public Schema
-- This script removes any examination-related objects from the public schema

-- Drop examination tables if they exist
DROP TABLE IF EXISTS exam_analytics CASCADE;
DROP TABLE IF EXISTS grade_scales CASCADE;
DROP TABLE IF EXISTS dmc_generated CASCADE;
DROP TABLE IF EXISTS dmc_templates CASCADE;
DROP TABLE IF EXISTS exam_master_sheets CASCADE;
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS exam_subjects CASCADE;
DROP TABLE IF EXISTS examinations CASCADE;

-- Drop examination functions if they exist
DROP FUNCTION IF EXISTS calculate_student_position(INTEGER, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS assign_grade(DECIMAL, BIGINT);
DROP FUNCTION IF EXISTS generate_exam_master_sheet(INTEGER, INTEGER, INTEGER);

-- Drop examination triggers if they exist
DROP TRIGGER IF EXISTS update_examinations_updated_at ON examinations;
DROP TRIGGER IF EXISTS update_exam_subjects_updated_at ON exam_subjects;
DROP TRIGGER IF EXISTS update_exam_results_updated_at ON exam_results;
DROP TRIGGER IF EXISTS update_exam_master_sheets_updated_at ON exam_master_sheets;
DROP TRIGGER IF EXISTS update_dmc_templates_updated_at ON dmc_templates;
DROP TRIGGER IF EXISTS update_grade_scales_updated_at ON grade_scales;

-- Verify cleanup
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'examinations', 'exam_subjects', 'exam_results', 'exam_master_sheets',
    'dmc_templates', 'dmc_generated', 'grade_scales', 'exam_analytics'
);
