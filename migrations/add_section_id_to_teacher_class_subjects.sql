-- Add section_id column to teacher_class_subjects table
-- This migration adds section support to teacher class-subject assignments

-- Add the section_id column with default value null
ALTER TABLE teacher_class_subjects 
ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE;

-- Add a comment to document the column purpose
COMMENT ON COLUMN teacher_class_subjects.section_id IS 'Optional section ID for section-specific teacher assignments. NULL means assignment applies to entire class.';

-- Create index for better performance
CREATE INDEX idx_teacher_class_subjects_section ON teacher_class_subjects(section_id);

-- Update the unique constraint to include section_id
-- First, drop the existing unique constraint
ALTER TABLE teacher_class_subjects 
DROP CONSTRAINT IF EXISTS teacher_class_subjects_teacher_id_class_subject_id_school_id_key;

-- Add new unique constraint that includes section_id
ALTER TABLE teacher_class_subjects 
ADD CONSTRAINT teacher_class_subjects_unique 
UNIQUE (teacher_id, class_subject_id, section_id, school_id);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'teacher_class_subjects' 
AND column_name = 'section_id';
