-- Solution for Multi-Tenant Student IDs
-- Each school should have students starting from ID 1

-- Option 1: Use a composite primary key (school_id, student_number)
-- This allows each school to have student numbers 1, 2, 3, etc.

-- First, let's see the current structure
-- The current 'id' column is a global primary key
-- We need to change this to allow school-specific numbering

-- Step 1: Add a new column for school-specific student numbers
ALTER TABLE students 
ADD COLUMN student_number INTEGER;

-- Step 2: Add a new column for school-specific student numbers to history table
ALTER TABLE student_class_history 
ADD COLUMN student_number INTEGER;

-- Step 3: Create a composite unique constraint instead of relying on global 'id'
-- This allows each school to have student_number 1, 2, 3, etc.
ALTER TABLE students 
ADD CONSTRAINT students_school_student_number_unique 
UNIQUE (school_id, student_number);

-- Step 4: Update existing data to populate student_number
-- This will assign sequential numbers to existing students per school
WITH numbered_students AS (
  SELECT 
    id,
    school_id,
    ROW_NUMBER() OVER (PARTITION BY school_id ORDER BY id) as student_number
  FROM students
)
UPDATE students 
SET student_number = numbered_students.student_number
FROM numbered_students 
WHERE students.id = numbered_students.id;

-- Step 5: Update history table
WITH numbered_history AS (
  SELECT 
    id,
    school_id,
    ROW_NUMBER() OVER (PARTITION BY school_id ORDER BY id) as student_number
  FROM student_class_history
)
UPDATE student_class_history 
SET student_number = numbered_history.student_number
FROM numbered_history 
WHERE student_class_history.id = numbered_history.id;

-- Step 6: Make student_number NOT NULL after populating
ALTER TABLE students 
ALTER COLUMN student_number SET NOT NULL;

ALTER TABLE student_class_history 
ALTER COLUMN student_number SET NOT NULL;

-- Now each school can have:
-- School 1: student_number 1, 2, 3, 4...
-- School 2: student_number 1, 2, 3, 4...
-- School 3: student_number 1, 2, 3, 4...
-- etc.

-- The 'id' column can remain as a global unique identifier for technical purposes
-- But 'student_number' will be the user-facing sequential number per school


