-- Add roll_number column to students table for formatted student roll numbers
-- Format: S{school_custom_id}-{sequence_number}
-- Example: S1-1, S1-2, S2-1, etc.
-- The existing 'id' column remains INTEGER for database relationships

-- Step 1: Add roll_number column
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS roll_number VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);

-- Step 2: Function to get the next sequential student number for a school
CREATE OR REPLACE FUNCTION get_next_student_sequence(school_id_param BIGINT)
RETURNS INTEGER AS $$
DECLARE
  next_sequence INTEGER;
BEGIN
  -- Get the maximum sequence number for students in this school
  -- Extract the number after the last dash in roll_number
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(
          roll_number FROM '-(.+)$'
        ) AS INTEGER
      )
    ), 0
  ) + 1
  INTO next_sequence
  FROM public.students
  WHERE students.school_id = school_id_param
    AND roll_number IS NOT NULL
    AND roll_number ~ '^S[0-9]+-[0-9]+$';
  
  -- If no existing roll_number found, start from 1
  IF next_sequence IS NULL THEN
    next_sequence := 1;
  END IF;
  
  RETURN next_sequence;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Function to generate the next student roll_number
CREATE OR REPLACE FUNCTION get_next_student_roll_number(school_id_param BIGINT)
RETURNS VARCHAR(20) AS $$
DECLARE
  school_custom_id VARCHAR(10);
  next_sequence INTEGER;
  formatted_roll_number VARCHAR(20);
BEGIN
  -- Get the school's custom_id
  SELECT custom_id INTO school_custom_id
  FROM public.schools
  WHERE id = school_id_param;
  
  -- If school doesn't have a custom_id, use the school's numeric ID as fallback
  IF school_custom_id IS NULL THEN
    school_custom_id := 'S' || school_id_param::TEXT;
  END IF;
  
  -- Get the next sequence number for this school
  next_sequence := get_next_student_sequence(school_id_param);
  
  -- Format: S1-1, S1-2, S2-1, etc. (no padding)
  formatted_roll_number := school_custom_id || '-' || next_sequence::TEXT;
  
  RETURN formatted_roll_number;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Convert existing students to have roll_number
-- For each school, assign sequential numbers starting from 1
-- Use a subquery with DISTINCT to avoid duplicates
WITH numbered_students AS (
  SELECT 
    s.id,
    s.school_id,
    COALESCE(sch.custom_id, 'S' || s.school_id::TEXT) ||
    '-' || 
    ROW_NUMBER() OVER (
      PARTITION BY s.school_id 
      ORDER BY s.id
    )::TEXT AS new_roll_number
  FROM public.students s
  LEFT JOIN public.schools sch ON sch.id = s.school_id
  WHERE s.roll_number IS NULL
)
UPDATE public.students s
SET roll_number = ns.new_roll_number
FROM numbered_students ns
WHERE s.id = ns.id 
  AND s.school_id = ns.school_id
  AND s.roll_number IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.students s2 
    WHERE s2.roll_number = ns.new_roll_number 
    AND s2.id != s.id
  );

-- Step 5: Create trigger function to auto-generate roll_number on insert
CREATE OR REPLACE FUNCTION generate_student_roll_number()
RETURNS TRIGGER AS $$
DECLARE
  generated_roll_number VARCHAR(20);
  retry_count INTEGER := 0;
  max_retries INTEGER := 10;
BEGIN
  -- Only generate if roll_number is not provided
  IF NEW.roll_number IS NULL OR NEW.roll_number = '' THEN
    LOOP
      -- Generate roll number
      generated_roll_number := get_next_student_roll_number(NEW.school_id);
      
      -- Check if it already exists (race condition protection)
      IF NOT EXISTS (
        SELECT 1 FROM public.students 
        WHERE roll_number = generated_roll_number
      ) THEN
        NEW.roll_number := generated_roll_number;
        EXIT;
      END IF;
      
      -- Retry if duplicate found (shouldn't happen often)
      retry_count := retry_count + 1;
      IF retry_count >= max_retries THEN
        RAISE EXCEPTION 'Failed to generate unique roll_number after % attempts', max_retries;
      END IF;
      
      -- Small delay to avoid immediate retry with same sequence
      PERFORM pg_sleep(0.01);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to auto-generate roll_number before insert
DROP TRIGGER IF EXISTS trigger_generate_student_roll_number ON public.students;
CREATE TRIGGER trigger_generate_student_roll_number
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION generate_student_roll_number();
