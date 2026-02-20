import { supabase } from '../supabaseClient';

const clearAllData = async () => {
  try {
    console.log('Starting to clear all data...');

    // Tables to clear in order (respecting foreign key constraints)
    const tables = [
      // First clear all dependent tables
      'student_status_history',
      'attendance_records',
      'student_class_history',
      'fine_payments',
      'family_members',
      'fines',
      'holidays',
      
      // Then clear main tables
      'students',
      'sections',
      'classes',
      'families',
      
      // Finally clear configuration tables
      'sessions',
      'institute_profile'
    ];

    // Clear each table
    for (const table of tables) {
      try {
        console.log(`Clearing table: ${table}...`);
        
        // Delete all records without any conditions
        const { error } = await supabase
          .from(table)
          .delete();
        
        if (error) {
          console.warn(`Warning: Could not clear table ${table}:`, error.message);
          continue; // Continue with next table even if this one fails
        }

        console.log(`Successfully cleared table: ${table}`);
      } catch (tableError) {
        console.warn(`Warning: Error processing table ${table}:`, tableError);
        continue; // Continue with next table even if this one fails
      }
    }

    console.log('Data clearing process completed');
    console.log('Note: Some tables may have failed to clear due to foreign key constraints or other issues.');
    console.log('Please check the warnings above for details.');
  } catch (error) {
    console.error('Fatal error during data clearing:', error);
    process.exit(1);
  }
};

// Execute the function
clearAllData(); 