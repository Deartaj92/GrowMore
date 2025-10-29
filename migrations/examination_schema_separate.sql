-- Examination Management System - Enhanced Schema
-- This schema creates examination-related tables with enhanced features for:
-- - Marks entry and management
-- - DMC (Detailed Mark Certificate) generation
-- - Comprehensive analytics and reporting
-- - Grade calculation and assignment
-- - Performance tracking and insights
-- Run this after the main school schema is already in place

-- Drop existing tables if they exist (for re-runs)
DROP TABLE IF EXISTS exam_analytics CASCADE;
DROP TABLE IF EXISTS grade_scales CASCADE;
DROP TABLE IF EXISTS dmc_generated CASCADE;
DROP TABLE IF EXISTS dmc_templates CASCADE;
DROP TABLE IF EXISTS exam_master_sheets CASCADE;
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS exam_subjects CASCADE;
DROP TABLE IF EXISTS examinations CASCADE;


-- 1. EXAMINATIONS TABLE
-- Stores basic exam information
CREATE TABLE examinations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN ('Examination', 'Monthly Test', 'Quiz', 'Mid Term', 'Final', 'Custom')),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    passing_marks DECIMAL(5,2) DEFAULT 40.00, -- Default passing marks percentage
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    session_id INTEGER NOT NULL,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, session_id, school_id),
    CONSTRAINT check_end_date_after_start_date CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT check_passing_marks_range CHECK (passing_marks >= 0 AND passing_marks <= 100)
);

-- 2. EXAM_SUBJECTS TABLE
-- Defines which subjects are included in each exam and their marks allocation
CREATE TABLE exam_subjects (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    passing_marks DECIMAL(5,2) NOT NULL DEFAULT 33.00,
    is_compulsory BOOLEAN DEFAULT TRUE,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exam_id, subject_id, class_id, school_id)
);

-- 3. EXAM_RESULTS TABLE
-- Stores individual student marks for each subject in each exam
-- Enhanced for DMC generation and comprehensive analytics
CREATE TABLE exam_results (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    obtained_marks DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    max_marks DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN max_marks > 0 THEN (obtained_marks / max_marks) * 100 
            ELSE 0 
        END
    ) STORED,
    grade VARCHAR(5),
    remarks TEXT,
    entered_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    UNIQUE(exam_id, student_id, subject_id, school_id),
    -- Additional constraints for data integrity
    CONSTRAINT check_obtained_marks_positive CHECK (obtained_marks >= 0),
    CONSTRAINT check_max_marks_positive CHECK (max_marks > 0),
    CONSTRAINT check_obtained_marks_not_greater_than_max CHECK (obtained_marks <= max_marks)
);

-- 4. EXAM_MASTER_SHEETS TABLE
-- Consolidated results for each exam
CREATE TABLE exam_master_sheets (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    total_marks DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    obtained_marks DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    grade VARCHAR(5),
    position INTEGER,
    rank_in_class INTEGER,
    rank_in_section INTEGER,
    status VARCHAR(20) DEFAULT 'pass' CHECK (status IN ('pass', 'fail', 'absent')),
    attendance_percentage DECIMAL(5,2),
    class_teacher_remarks TEXT,
    principal_remarks TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    UNIQUE(exam_id, student_id, school_id)
);

-- 5. DMC_TEMPLATES TABLE
-- Templates for Detailed Marks Certificate generation
CREATE TABLE dmc_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) DEFAULT 'standard' CHECK (template_type IN ('standard', 'custom')),
    header_html TEXT,
    footer_html TEXT,
    body_html TEXT,
    css_styles TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. DMC_GENERATED TABLE
-- Track generated DMCs
CREATE TABLE dmc_generated (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    template_id INTEGER REFERENCES dmc_templates(id) ON DELETE SET NULL,
    file_path TEXT,
    file_size INTEGER,
    generated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    UNIQUE(exam_id, student_id, school_id)
);

-- 7. GRADE_SCALES TABLE
-- Configurable grading system
CREATE TABLE grade_scales (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    min_marks DECIMAL(5,2) NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL,
    grade VARCHAR(5) NOT NULL,
    gpa DECIMAL(3,2),
    remarks VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, school_id)
);

-- 8. EXAM_ANALYTICS TABLE
-- Store pre-calculated analytics for performance
CREATE TABLE exam_analytics (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES public.sections(id) ON DELETE CASCADE,
    total_students INTEGER NOT NULL DEFAULT 0,
    appeared_students INTEGER NOT NULL DEFAULT 0,
    passed_students INTEGER NOT NULL DEFAULT 0,
    failed_students INTEGER NOT NULL DEFAULT 0,
    average_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    highest_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    lowest_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    pass_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exam_id, class_id, section_id, school_id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_examinations_session ON examinations(session_id);
CREATE INDEX idx_examinations_school ON examinations(school_id);
CREATE INDEX idx_examinations_status ON examinations(status);
CREATE INDEX idx_examinations_dates ON examinations(start_date, end_date);

CREATE INDEX idx_exam_subjects_exam ON exam_subjects(exam_id);
CREATE INDEX idx_exam_subjects_subject ON exam_subjects(subject_id);
CREATE INDEX idx_exam_subjects_class ON exam_subjects(class_id);
CREATE INDEX idx_exam_subjects_school ON exam_subjects(school_id);

CREATE INDEX idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX idx_exam_results_student ON exam_results(student_id);
CREATE INDEX idx_exam_results_subject ON exam_results(subject_id);
CREATE INDEX idx_exam_results_class_section ON exam_results(class_id, section_id);
CREATE INDEX idx_exam_results_school ON exam_results(school_id);
CREATE INDEX idx_exam_results_student_school ON exam_results(student_id, school_id);
-- Enhanced indexes for DMC generation and analytics
CREATE INDEX idx_exam_results_percentage ON exam_results(percentage);
CREATE INDEX idx_exam_results_grade ON exam_results(grade);
CREATE INDEX idx_exam_results_entered_by ON exam_results(entered_by);
CREATE INDEX idx_exam_results_entered_at ON exam_results(entered_at);
CREATE INDEX idx_exam_results_obtained_marks ON exam_results(obtained_marks);
CREATE INDEX idx_exam_results_max_marks ON exam_results(max_marks);

CREATE INDEX idx_exam_master_sheets_exam ON exam_master_sheets(exam_id);
CREATE INDEX idx_exam_master_sheets_student ON exam_master_sheets(student_id);
CREATE INDEX idx_exam_master_sheets_class_section ON exam_master_sheets(class_id, section_id);
CREATE INDEX idx_exam_master_sheets_school ON exam_master_sheets(school_id);
CREATE INDEX idx_exam_master_sheets_student_school ON exam_master_sheets(student_id, school_id);
CREATE INDEX idx_exam_master_sheets_position ON exam_master_sheets(position);

CREATE INDEX idx_dmc_templates_school ON dmc_templates(school_id);
CREATE INDEX idx_dmc_templates_active ON dmc_templates(is_active);

CREATE INDEX idx_dmc_generated_exam ON dmc_generated(exam_id);
CREATE INDEX idx_dmc_generated_student ON dmc_generated(student_id);
CREATE INDEX idx_dmc_generated_school ON dmc_generated(school_id);
CREATE INDEX idx_dmc_generated_student_school ON dmc_generated(student_id, school_id);

CREATE INDEX idx_grade_scales_school ON grade_scales(school_id);
CREATE INDEX idx_grade_scales_active ON grade_scales(is_active);
CREATE INDEX idx_grade_scales_marks ON grade_scales(min_marks, max_marks);

CREATE INDEX idx_exam_analytics_exam ON exam_analytics(exam_id);
CREATE INDEX idx_exam_analytics_class ON exam_analytics(class_id);
CREATE INDEX idx_exam_analytics_section ON exam_analytics(section_id);
CREATE INDEX idx_exam_analytics_school ON exam_analytics(school_id);

-- TRIGGERS FOR UPDATED_AT
CREATE TRIGGER update_examinations_updated_at
    BEFORE UPDATE ON examinations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_subjects_updated_at
    BEFORE UPDATE ON exam_subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_results_updated_at
    BEFORE UPDATE ON exam_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_master_sheets_updated_at
    BEFORE UPDATE ON exam_master_sheets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dmc_templates_updated_at
    BEFORE UPDATE ON dmc_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grade_scales_updated_at
    BEFORE UPDATE ON grade_scales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- FUNCTIONS FOR EXAMINATION LOGIC

-- Function to calculate student position in class
CREATE OR REPLACE FUNCTION calculate_student_position(
    p_exam_id INTEGER,
    p_student_id INTEGER,
    p_class_id INTEGER,
    p_section_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    position INTEGER;
BEGIN
    IF p_section_id IS NOT NULL THEN
        -- Calculate position within section
        SELECT COUNT(*) + 1 INTO position
        FROM exam_master_sheets ems1
        WHERE ems1.exam_id = p_exam_id
        AND ems1.class_id = p_class_id
        AND ems1.section_id = p_section_id
        AND ems1.percentage > (
            SELECT ems2.percentage
            FROM exam_master_sheets ems2
            WHERE ems2.exam_id = p_exam_id
            AND ems2.student_id = p_student_id
            AND ems2.class_id = p_class_id
            AND ems2.section_id = p_section_id
        );
    ELSE
        -- Calculate position within class
        SELECT COUNT(*) + 1 INTO position
        FROM exam_master_sheets ems1
        WHERE ems1.exam_id = p_exam_id
        AND ems1.class_id = p_class_id
        AND ems1.percentage > (
            SELECT ems2.percentage
            FROM exam_master_sheets ems2
            WHERE ems2.exam_id = p_exam_id
            AND ems2.student_id = p_student_id
            AND ems2.class_id = p_class_id
        );
    END IF;
    
    RETURN COALESCE(position, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to assign grade based on percentage
CREATE OR REPLACE FUNCTION assign_grade(
    p_percentage DECIMAL,
    p_school_id BIGINT
) RETURNS VARCHAR(5) AS $$
DECLARE
    grade VARCHAR(5);
BEGIN
    SELECT gs.grade INTO grade
    FROM grade_scales gs
    WHERE gs.school_id = p_school_id
    AND gs.is_active = TRUE
    AND p_percentage >= gs.min_marks
    AND p_percentage <= gs.max_marks
    ORDER BY gs.min_marks DESC
    LIMIT 1;
    
    RETURN COALESCE(grade, 'F');
END;
$$ LANGUAGE plpgsql;

-- Function to generate master sheet for an exam
CREATE OR REPLACE FUNCTION generate_exam_master_sheet(
    p_exam_id INTEGER,
    p_class_id INTEGER,
    p_section_id INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    student_record RECORD;
    total_marks DECIMAL(8,2);
    obtained_marks DECIMAL(8,2);
    percentage DECIMAL(5,2);
    grade VARCHAR(5);
    position INTEGER;
BEGIN
    -- Delete existing master sheet entries for this exam/class/section
    DELETE FROM exam_master_sheets 
    WHERE exam_id = p_exam_id 
    AND class_id = p_class_id 
    AND (p_section_id IS NULL OR section_id = p_section_id);
    
    -- Generate master sheet for each student
    FOR student_record IN 
        SELECT DISTINCT er.student_id, er.class_id, er.section_id
        FROM exam_results er
        WHERE er.exam_id = p_exam_id
        AND er.class_id = p_class_id
        AND (p_section_id IS NULL OR er.section_id = p_section_id)
    LOOP
        -- Calculate total and obtained marks
        SELECT 
            COALESCE(SUM(er.max_marks), 0),
            COALESCE(SUM(er.obtained_marks), 0)
        INTO total_marks, obtained_marks
        FROM exam_results er
        WHERE er.exam_id = p_exam_id
        AND er.student_id = student_record.student_id
        AND er.class_id = student_record.class_id
        AND er.section_id = student_record.section_id;
        
        -- Calculate percentage
        percentage := CASE 
            WHEN total_marks > 0 THEN (obtained_marks / total_marks) * 100 
            ELSE 0 
        END;
        
        -- Assign grade
        grade := assign_grade(percentage, (SELECT school_id FROM examinations WHERE id = p_exam_id));
        
        -- Calculate position
        position := calculate_student_position(p_exam_id, student_record.student_id, student_record.class_id, student_record.section_id);
        
        -- Insert master sheet record
        INSERT INTO exam_master_sheets (
            exam_id, student_id, class_id, section_id,
            total_marks, obtained_marks, percentage, grade, position,
            rank_in_class, rank_in_section, status, school_id
        ) VALUES (
            p_exam_id, student_record.student_id, student_record.class_id, student_record.section_id,
            total_marks, obtained_marks, percentage, grade, position,
            position, position, 
            CASE WHEN percentage >= (SELECT passing_marks FROM examinations WHERE id = p_exam_id) THEN 'pass' ELSE 'fail' END,
            (SELECT school_id FROM examinations WHERE id = p_exam_id)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant execute permissions on examination functions
GRANT EXECUTE ON FUNCTION calculate_student_position(INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_grade(DECIMAL, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_exam_master_sheet(INTEGER, INTEGER, INTEGER) TO authenticated;

-- Disable RLS on examination tables
ALTER TABLE examinations DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_master_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE dmc_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE dmc_generated DISABLE ROW LEVEL SECURITY;
ALTER TABLE grade_scales DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_analytics DISABLE ROW LEVEL SECURITY;

-- Reset search path
RESET search_path;
