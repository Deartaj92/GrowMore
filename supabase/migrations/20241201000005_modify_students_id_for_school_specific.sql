-- Modify students table to allow manual ID insertion for school-specific student IDs
-- First, create a new sequence for each school
CREATE OR REPLACE FUNCTION create_school_student_sequence(school_id BIGINT)
RETURNS void AS $$
BEGIN
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS students_school_%s_seq START 1', school_id);
END;
$$ LANGUAGE plpgsql;

-- Create sequences for existing schools
SELECT create_school_student_sequence(id) FROM schools;

-- Create a function to get the next student ID for a school
CREATE OR REPLACE FUNCTION get_next_student_id(school_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the highest existing student ID for this school
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id
  FROM students 
  WHERE students.school_id = get_next_student_id.school_id;
  
  RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Add a unique constraint on (id, school_id) to ensure IDs are unique within each school
ALTER TABLE students ADD CONSTRAINT students_id_school_unique UNIQUE(id, school_id); 