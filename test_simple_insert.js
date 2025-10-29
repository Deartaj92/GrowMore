// Simple test to check if multiple subjects can be inserted
// Run this in the browser console

async function testSimpleInsert() {
  console.log('=== SIMPLE INSERT TEST ===');
  
  // Test data - two subjects for same teacher, same class, same period
  const testData = [
    {
      class_id: 3,
      period_index: 4,
      subject_id: 15,
      teacher_id: 3,
      session_id: 4,
      break_index: 5,
      school_id: 2,
      day_of_week: 1
    },
    {
      class_id: 3,
      period_index: 4,
      subject_id: 7,
      teacher_id: 3,
      session_id: 4,
      break_index: 5,
      school_id: 2,
      day_of_week: 1
    }
  ];
  
  console.log('Test data:', testData);
  
  try {
    // Clear any existing data first
    console.log('Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('timetable')
      .delete()
      .eq('class_id', 3)
      .eq('period_index', 4)
      .eq('day_of_week', 1)
      .eq('session_id', 4)
      .eq('school_id', 2);
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
    } else {
      console.log('Existing data cleared');
    }
    
    // Try to insert the data
    console.log('Inserting test data...');
    const { data, error } = await supabase
      .from('timetable')
      .insert(testData);
    
    if (error) {
      console.error('INSERT FAILED:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
    } else {
      console.log('INSERT SUCCESSFUL:', data);
      
      // Verify the data was inserted
      console.log('Verifying insertion...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('timetable')
        .select('*')
        .eq('class_id', 3)
        .eq('period_index', 4)
        .eq('day_of_week', 1)
        .eq('session_id', 4)
        .eq('school_id', 2);
      
      if (verifyError) {
        console.error('Verify error:', verifyError);
      } else {
        console.log('Verification successful:', verifyData);
        console.log('Number of records:', verifyData.length);
      }
    }
    
  } catch (err) {
    console.error('Test failed with exception:', err);
  }
}

// Run the test
testSimpleInsert();
