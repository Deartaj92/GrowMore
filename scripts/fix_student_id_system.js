const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://seeeczoigcxwvpazfydj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZWVjem9pZ2N4d3ZwYXpmeWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDQ0NTcsImV4cCI6MjA2NTYyMDQ1N30.r5IAvn9vGnIVsaxmHbyWsa7bMZ_Gju5QU2G3unvObqc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStudentIdSystem() {
  try {
    console.log('Starting to fix student ID system...');
    
    // First, let's check the current structure
    console.log('Checking current students table structure...');
    const { data: students, error: checkError } = await supabase
      .from('students')
      .select('id, school_id')
      .limit(5);
    
    if (checkError) {
      console.error('Error checking students table:', checkError);
      return;
    }
    
    console.log('Current students sample:', students);
    
    // Check if we have any existing students with conflicting IDs
    const { data: conflicts, error: conflictError } = await supabase
      .from('students')
      .select('id, school_id, name')
      .order('id');
    
    if (conflictError) {
      console.error('Error checking for conflicts:', conflictError);
      return;
    }
    
    console.log('All students:', conflicts);
    
    // For now, let's just create the function to get next student ID
    console.log('Creating get_next_student_id function...');
    
    // We'll need to handle this manually since we can't execute DDL directly
    console.log('Please run the following SQL commands manually in your database:');
    console.log('');
    console.log('-- 1. Drop the existing primary key constraint');
    console.log('ALTER TABLE students DROP CONSTRAINT students_pkey;');
    console.log('');
    console.log('-- 2. Change the id column from SERIAL to INTEGER');
    console.log('ALTER TABLE students ALTER COLUMN id TYPE INTEGER;');
    console.log('ALTER TABLE students ALTER COLUMN id DROP DEFAULT;');
    console.log('');
    console.log('-- 3. Add the new primary key constraint');
    console.log('ALTER TABLE students ADD CONSTRAINT students_pkey PRIMARY KEY (id, school_id);');
    console.log('');
    console.log('-- 4. Add unique constraint for school-specific student IDs');
    console.log('ALTER TABLE students ADD CONSTRAINT students_id_school_unique UNIQUE(id, school_id);');
    console.log('');
    console.log('-- 5. Create function to get next student ID for a school');
    console.log(`
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
    `);
    
  } catch (error) {
    console.error('Script failed:', error);
  }
}

fixStudentIdSystem(); 