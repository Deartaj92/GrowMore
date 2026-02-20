-- Update custom_id format for schools: 001 -> S1, 002 -> S2, etc.
-- Update roll_number format for students: S001-1 -> S1-1, S002-1 -> S2-1, etc.

-- Step 1: Update schools custom_id format
-- Convert numeric custom_id (001, 002) to S1, S2 format
UPDATE public.schools
SET custom_id = 'S' || CAST(CAST(custom_id AS INTEGER) AS TEXT)
WHERE custom_id IS NOT NULL 
  AND custom_id ~ '^[0-9]+$'
  AND custom_id NOT LIKE 'S%';

-- For schools without custom_id, generate based on school_id
UPDATE public.schools
SET custom_id = 'S' || id::TEXT
WHERE custom_id IS NULL;

-- Step 2: Update students roll_number format
-- First clear existing roll_numbers that have old format (S001-1, S002-1, etc.)
UPDATE public.students
SET roll_number = NULL
WHERE roll_number ~ '^S[0-9]{3,}-[0-9]+$';

-- Convert S001-1 to S1-1 format (3+ digit school numbers)
UPDATE public.students s
SET roll_number = (
  SELECT 
    COALESCE(sch.custom_id, 'S' || s.school_id::TEXT) ||
    '-' || 
    SUBSTRING(s.roll_number FROM '-(.+)$')
  FROM public.schools sch
  WHERE sch.id = s.school_id
  AND s.roll_number ~ '^S[0-9]{3,}-[0-9]+$'
)
WHERE roll_number IS NOT NULL
  AND roll_number ~ '^S[0-9]{3,}-[0-9]+$';

-- For students without roll_number or with NULL, regenerate based on school's custom_id
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

-- Step 3: Update function to generate S1, S2 format for schools
CREATE OR REPLACE FUNCTION get_next_school_custom_id()
RETURNS VARCHAR(10) AS $$
DECLARE
  next_id INTEGER;
  formatted_id VARCHAR(10);
BEGIN
  -- Get the maximum custom_id number (extract number from S1, S2, etc.)
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(custom_id FROM '^S([0-9]+)$') AS INTEGER
      )
    ), 0
  ) + 1
  INTO next_id
  FROM public.schools
  WHERE custom_id IS NOT NULL 
    AND custom_id ~ '^S[0-9]+$';
  
  -- Format as S1, S2, S3, etc. (no padding)
  formatted_id := 'S' || next_id::TEXT;
  
  RETURN formatted_id;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update function to generate roll_number in S1-1 format
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

