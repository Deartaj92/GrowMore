/**
 * Script to clear all existing homework diary entries from the database
 * 
 * Usage:
 *   node scripts/clear_homework_diaries.js
 * 
 * WARNING: This will permanently delete all homework diary entries!
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL or Key not found in environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearHomeworkDiaries() {
  try {
    console.log('🔄 Fetching current homework diary count...');
    
    // First, get the count
    const { count, error: countError } = await supabase
      .from('homework_diary')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    
    console.log(`📊 Current entries: ${count || 0}`);
    
    if (count === 0) {
      console.log('✅ No entries to delete. Database is already empty.');
      return;
    }
    
    // Ask for confirmation (in production, you might want to add a prompt)
    console.log('⚠️  WARNING: This will permanently delete all homework diary entries!');
    console.log('🚨 Proceeding with deletion in 3 seconds...');
    console.log('   (Press Ctrl+C to cancel)');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete all entries
    console.log('🗑️  Deleting all homework diary entries...');
    const { error: deleteError } = await supabase
      .from('homework_diary')
      .delete()
      .neq('id', 0); // Delete all (this condition is always true for valid IDs)
    
    if (deleteError) {
      throw deleteError;
    }
    
    // Verify deletion
    const { count: remainingCount, error: verifyError } = await supabase
      .from('homework_diary')
      .select('*', { count: 'exact', head: true });
    
    if (verifyError) {
      throw verifyError;
    }
    
    console.log(`✅ Success! Deleted ${count} entries.`);
    console.log(`📊 Remaining entries: ${remainingCount || 0}`);
    
    // Optional: Reset sequence (uncomment if needed)
    // console.log('🔄 Resetting auto-increment sequence...');
    // const { error: seqError } = await supabase.rpc('reset_homework_diary_sequence');
    // if (seqError) {
    //   console.warn('⚠️  Could not reset sequence:', seqError.message);
    // }
    
  } catch (error) {
    console.error('❌ Error clearing homework diaries:', error.message);
    process.exit(1);
  }
}

// Run the script
clearHomeworkDiaries()
  .then(() => {
    console.log('✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

