-- Better Solution: Allow duplicate IDs across different schools
-- This keeps all existing code working while allowing each school to have students 1, 2, 3...

-- Step 1: Drop the existing primary key constraint on 'id' alone
ALTER TABLE students 
DROP CONSTRAINT IF EXISTS students_pkey;

-- Step 2: Create a composite primary key (school_id, id)
-- This allows each school to have student IDs 1, 2, 3, etc.
ALTER TABLE students 
ADD CONSTRAINT students_pkey PRIMARY KEY (school_id, id);

-- Now each school can have:
-- School 1: id 1, 2, 3, 4...
-- School 2: id 1, 2, 3, 4...
-- School 3: id 1, 2, 3, 4...

-- Step 3: Update foreign key constraints in related tables
-- We need to update any foreign keys that reference students(id) to also include school_id

-- For student_class_history
ALTER TABLE student_class_history 
DROP CONSTRAINT IF EXISTS student_class_history_student_id_fkey;

ALTER TABLE student_class_history 
ADD CONSTRAINT student_class_history_student_id_fkey 
FOREIGN KEY (school_id, student_id) 
REFERENCES students(school_id, id) 
ON DELETE CASCADE;

-- For exam_results (if it exists)
ALTER TABLE exam_results 
DROP CONSTRAINT IF EXISTS exam_results_student_id_fkey;

ALTER TABLE exam_results 
ADD CONSTRAINT exam_results_student_id_fkey 
FOREIGN KEY (school_id, student_id) 
REFERENCES students(school_id, id) 
ON DELETE CASCADE;

-- For fee_invoices (if it exists)
ALTER TABLE fee_invoices 
DROP CONSTRAINT IF EXISTS fee_invoices_student_id_fkey;

ALTER TABLE fee_invoices 
ADD CONSTRAINT fee_invoices_student_id_fkey 
FOREIGN KEY (school_id, student_id) 
REFERENCES students(school_id, id) 
ON DELETE CASCADE;

-- For attendance (if it exists)
ALTER TABLE attendance 
DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;

ALTER TABLE attendance 
ADD CONSTRAINT attendance_student_id_fkey 
FOREIGN KEY (school_id, student_id) 
REFERENCES students(school_id, id) 
ON DELETE CASCADE;

-- Add similar constraints for any other tables that reference students

-- Note: All your existing queries will continue to work because:
-- 1. You're already filtering by school_id in all queries
-- 2. The id column still exists and works the same way
-- 3. Each school now has independent ID sequences


