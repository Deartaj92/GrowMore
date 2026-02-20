// Debug script to check timetable constraints and test multiple subjects
// Run this in the browser console

async function debugTimetableConstraints() {
  try {
    console.log('=== DEBUGGING TIMETABLE CONSTRAINTS ===');
    
    // 1. Check current constraints on timetable table
    console.log('1. Checking timetable constraints...');
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'timetable' });
    
    if (constraintError) {
      console.log('Could not get constraints via RPC, trying direct query...');
      // Alternative: check if we can query the information_schema
      const { data: constraintData, error: schemaError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_name', 'timetable');
      
      if (schemaError) {
        console.log('Schema query error:', schemaError);
      } else {
        console.log('Table constraints:', constraintData);
      }
    } else {
      console.log('Table constraints:', constraints);
    }
    
    // 2. Test inserting single subject
    console.log('\n2. Testing single subject insert...');
    const singleSubjectData = [{
      class_id: 1,
      period_index: 0,
      subject_id: 1,
      teacher_id: 1,
      session_id: 1,
      break_index: 5,
      school_id: 1,
      day_of_week: 1
    }];
    
    // Clear any existing test data
    await supabase
      .from('timetable')
      .delete()
      .eq('class_id', 1)
      .eq('period_index', 0)
      .eq('day_of_week', 1)
      .eq('session_id', 1)
      .eq('school_id', 1);
    
    const { data: singleInsert, error: singleError } = await supabase
      .from('timetable')
      .insert(singleSubjectData);
    
    if (singleError) {
      console.error('Single subject insert failed:', singleError);
    } else {
      console.log('Single subject insert successful:', singleInsert);
    }
    
    // 3. Test inserting multiple subjects for same teacher/period
    console.log('\n3. Testing multiple subjects insert...');
    const multipleSubjectsData = [
      {
        class_id: 1,
        period_index: 0,
        subject_id: 1,
        teacher_id: 1,
        session_id: 1,
        break_index: 5,
        school_id: 1,
        day_of_week: 1
      },
      {
        class_id: 1,
        period_index: 0,
        subject_id: 2,
        teacher_id: 1,
        session_id: 1,
        break_index: 5,
        school_id: 1,
        day_of_week: 1
      }
    ];
    
    const { data: multipleInsert, error: multipleError } = await supabase
      .from('timetable')
      .insert(multipleSubjectsData);
    
    if (multipleError) {
      console.error('Multiple subjects insert failed:', multipleError);
      console.error('Error details:', multipleError.details);
      console.error('Error hint:', multipleError.hint);
      console.error('Error code:', multipleError.code);
    } else {
      console.log('Multiple subjects insert successful:', multipleInsert);
    }
    
    // 4. Check what's actually in the database
    console.log('\n4. Checking current timetable data...');
    const { data: currentData, error: currentError } = await supabase
      .from('timetable')
      .select('*')
      .eq('class_id', 1)
      .eq('period_index', 0)
      .eq('day_of_week', 1)
      .eq('session_id', 1)
      .eq('school_id', 1);
    
    if (currentError) {
      console.error('Error fetching current data:', currentError);
    } else {
      console.log('Current timetable data:', currentData);
      console.log('Number of records:', currentData.length);
    }
    
    // 5. Test the exact data structure that the app uses
    console.log('\n5. Testing app data structure...');
    const appData = [
      {
        class_id: 1,
        period_index: 0,
        subject_id: 1,
        teacher_id: 1,
        session_id: 1,
        break_index: 5,
        school_id: 1,
        day_of_week: 1
      },
      {
        class_id: 1,
        period_index: 0,
        subject_id: 2,
        teacher_id: 1,
        session_id: 1,
        break_index: 5,
        school_id: 1,
        day_of_week: 1
      }
    ];
    
    // Clear and insert app data
    await supabase
      .from('timetable')
      .delete()
      .eq('class_id', 1)
      .eq('period_index', 0)
      .eq('day_of_week', 1)
      .eq('session_id', 1)
      .eq('school_id', 1);
    
    const { data: appInsert, error: appError } = await supabase
      .from('timetable')
      .insert(appData);
    
    if (appError) {
      console.error('App data insert failed:', appError);
    } else {
      console.log('App data insert successful:', appInsert);
    }
    
  } catch (err) {
    console.error('Debug failed:', err);
  }
}

// Run the debug function
debugTimetableConstraints();
