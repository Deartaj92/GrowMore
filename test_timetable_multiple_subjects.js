// Test script to check if multiple subjects per period work
// Run this in the browser console after applying the migration

// Test data for multiple subjects in the same period
const testData = [
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

console.log('Testing multiple subjects per period...');
console.log('Test data:', testData);

// Test if we can insert multiple subjects for the same class/period/teacher
async function testMultipleSubjects() {
  try {
    // First, delete any existing test data
    const { error: deleteError } = await supabase
      .from('timetable')
      .delete()
      .eq('class_id', 1)
      .eq('period_index', 0)
      .eq('day_of_week', 1)
      .eq('session_id', 1)
      .eq('school_id', 1);
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
      return;
    }
    
    console.log('Deleted existing test data');
    
    // Try to insert multiple subjects
    const { data, error } = await supabase
      .from('timetable')
      .insert(testData);
    
    if (error) {
      console.error('Insert error:', error);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
    } else {
      console.log('Successfully inserted multiple subjects:', data);
    }
    
    // Verify the data was inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from('timetable')
      .select('*')
      .eq('class_id', 1)
      .eq('period_index', 0)
      .eq('day_of_week', 1)
      .eq('session_id', 1)
      .eq('school_id', 1);
    
    if (verifyError) {
      console.error('Verify error:', verifyError);
    } else {
      console.log('Verified data:', verifyData);
      console.log('Number of records found:', verifyData.length);
    }
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

// Run the test
testMultipleSubjects();
