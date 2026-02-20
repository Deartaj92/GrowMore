-- Migration to make section_id nullable in students and student_class_history tables
-- This allows classes without sections to have null section_id values

-- Make section_id nullable in students table
ALTER TABLE students 
ALTER COLUMN section_id DROP NOT NULL;

-- Make section_id nullable in student_class_history table  
ALTER TABLE student_class_history 
ALTER COLUMN section_id DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN students.section_id IS 'Section ID - nullable for classes without sections';
COMMENT ON COLUMN student_class_history.section_id IS 'Section ID - nullable for classes without sections';


