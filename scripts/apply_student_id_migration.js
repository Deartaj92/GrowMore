const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - using the correct URL and anon key
const supabaseUrl = 'https://seeeczoigcxwvpazfydj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZWVjem9pZ2N4d3ZwYXpmeWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDQ0NTcsImV4cCI6MjA2NTYyMDQ1N30.r5IAvn9vGnIVsaxmHbyWsa7bMZ_Gju5QU2G3unvObqc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Starting migration to update students table for school-specific IDs...');
    
    // Step 1: Drop the existing primary key constraint
    console.log('Step 1: Dropping existing primary key constraint...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE students DROP CONSTRAINT students_pkey;'
    });
    
    if (error1) {
      console.error('Error dropping primary key:', error1);
      return;
    }
    
    // Step 2: Change the id column from SERIAL to INTEGER
    console.log('Step 2: Changing id column type...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE students ALTER COLUMN id TYPE INTEGER;'
    });
    
    if (error2) {
      console.error('Error changing column type:', error2);
      return;
    }
    
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE students ALTER COLUMN id DROP DEFAULT;'
    });
    
    if (error3) {
      console.error('Error dropping default:', error3);
      return;
    }
    
    // Step 3: Add the new primary key constraint
    console.log('Step 3: Adding new primary key constraint...');
    const { error: error4 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE students ADD CONSTRAINT students_pkey PRIMARY KEY (id, school_id);'
    });
    
    if (error4) {
      console.error('Error adding primary key:', error4);
      return;
    }
    
    // Step 4: Add unique constraint for school-specific student IDs
    console.log('Step 4: Adding unique constraint...');
    const { error: error5 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE students ADD CONSTRAINT students_id_school_unique UNIQUE(id, school_id);'
    });
    
    if (error5) {
      console.error('Error adding unique constraint:', error5);
      return;
    }
    
    // Step 5: Create function to get next student ID for a school
    console.log('Step 5: Creating get_next_student_id function...');
    const { error: error6 } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (error6) {
      console.error('Error creating function:', error6);
      return;
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

applyMigration(); 