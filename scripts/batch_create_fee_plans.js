/**
 * Batch Create Fee Plans for All Students
 * 
 * This script creates fee plans for all students in the active session,
 * similar to how they are created manually in the Fee Plans page.
 * 
 * Usage:
 *   node scripts/batch_create_fee_plans.js [school_id] [user_id] [--skip-existing] [--effective-from=YYYY-MM-DD] [--use-service-role]
 * 
 * Options:
 *   --skip-existing: Skip students who already have fee plans
 *   --effective-from: Set the effective from date (default: today)
 *   --use-service-role: Use service role API key instead of anon key (for elevated permissions)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Supabase configuration
const supabaseConfig = require('../supabase.config.json');

// Try to get URL from app's supabaseClient.ts first (most reliable)
let supabaseUrl, supabaseKey;

try {
  const supabaseClientPath = path.join(__dirname, '../src/supabaseClient.ts');
  if (fs.existsSync(supabaseClientPath)) {
    const supabaseClientContent = fs.readFileSync(supabaseClientPath, 'utf-8');
    const urlMatch = supabaseClientContent.match(/const supabaseUrl = ['"]([^'"]+)['"]/);
    const keyMatch = supabaseClientContent.match(/const supabaseAnonKey = ['"]([^'"]+)['"]/);
    
    if (urlMatch && keyMatch) {
      supabaseUrl = urlMatch[1];
      supabaseKey = keyMatch[1];
      console.log('Using Supabase URL and key from src/supabaseClient.ts');
      console.log(`URL: ${supabaseUrl}`);
    }
  }
} catch (error) {
  console.log('Could not read from supabaseClient.ts, trying config file...');
}

// Fallback to config file if not found in supabaseClient.ts
if (!supabaseUrl || !supabaseKey) {
  if (supabaseConfig.url && supabaseConfig.anonKey) {
    // Use direct config fields if available
    supabaseUrl = supabaseConfig.url;
    supabaseKey = supabaseConfig.anonKey;
    console.log('Using direct config fields (url, anonKey)');
  } else {
    // Extract from postgres_url if direct fields not available
    const postgresUrl = supabaseConfig.postgres_url || '';
    
    // Extract project ref from username part: postgres.PROJECT_REF
    // Format: postgresql://postgres.dgtlbtpqhwizbgvienqb:pass@host:port/db
    const usernameMatch = postgresUrl.match(/postgresql:\/\/postgres\.([^:]+):/);
    if (usernameMatch) {
      const projectRef = usernameMatch[1];
      supabaseUrl = `https://${projectRef}.supabase.co`;
      console.log(`Extracted project ref from postgres_url: ${projectRef}`);
      console.log(`Using Supabase URL: ${supabaseUrl}`);
    } else {
      // Fallback: try environment variable
      require('dotenv').config();
      supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    }
    
    supabaseKey = supabaseConfig.anon_api_key || supabaseConfig.anonKey || process.env.REACT_APP_SUPABASE_ANON_KEY;
  }
}

if (!supabaseKey) {
  console.error('Error: Missing Supabase anon key');
  console.error('Config keys available:', Object.keys(supabaseConfig));
  process.exit(1);
}

if (!supabaseUrl) {
  console.error('Error: Missing Supabase URL');
  process.exit(1);
}

console.log(`Connecting to Supabase at: ${supabaseUrl}`);
console.log(`Using API key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET'}`);

// Try service role key if anon key doesn't work (has more permissions)
const useServiceRole = process.argv.includes('--use-service-role');
if (useServiceRole && supabaseConfig.service_role_api_key) {
  console.log('Using service role key for elevated permissions');
  supabaseKey = supabaseConfig.service_role_api_key;
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase.from('sessions').select('id').limit(1);
    if (error) throw error;
    console.log('✓ Successfully connected to Supabase\n');
    return true;
  } catch (error) {
    console.error('✗ Failed to connect to Supabase:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your internet connection');
    console.error('2. Verify the Supabase project is active (not paused)');
    console.error('3. Try adding "url" and "anonKey" fields directly to supabase.config.json:');
    console.error('   {');
    console.error('     "url": "https://YOUR_PROJECT_REF.supabase.co",');
    console.error('     "anonKey": "YOUR_ANON_KEY"');
    console.error('   }');
    console.error('4. Or set REACT_APP_SUPABASE_URL environment variable');
    throw error;
  }
}

// Helper to fetch all rows with pagination
async function fetchAllRows(queryFn) {
  const allRows = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await queryFn(from, from + pageSize - 1);
    if (error) throw error;
    
    if (!data || data.length === 0) break;
    allRows.push(...data);
    
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allRows;
}

// Get active session
async function getActiveSession(schoolId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error) throw error;
  if (!data) {
    throw new Error('No active session found');
  }
  
  return data;
}

// Get all students with their class and section info
async function getAllStudents(schoolId, sessionId) {
  // Get all student class history entries for the active session
  const classHistory = await fetchAllRows(async (from, to) => {
    return await supabase
      .from('student_class_history')
      .select('student_id, new_class_id, new_section_id')
      .eq('school_id', schoolId)
      .eq('session_id', sessionId)
      .range(from, to);
  });
  
  if (classHistory.length === 0) {
    return [];
  }
  
  // Get unique student IDs
  const studentIds = [...new Set(classHistory.map(ch => ch.student_id))];
  
  // Fetch students in chunks
  const students = [];
  const chunkSize = 1000;
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('students')
      .select('id, name, roll_number')
      .eq('school_id', schoolId)
      .in('id', chunk);
    
    if (error) throw error;
    if (data) students.push(...data);
  }
  
  // Merge student data with class history
  const studentsWithClass = students.map(student => {
    const history = classHistory.find(ch => ch.student_id === student.id);
    return {
      id: student.id,
      name: student.name,
      rollNumber: student.roll_number,
      classId: history?.new_class_id,
      sectionId: history?.new_section_id
    };
  }).filter(s => s.classId); // Only include students with a class
  
  return studentsWithClass;
}

// Get all fee heads
async function getFeeHeads(schoolId) {
  return await fetchAllRows(async (from, to) => {
    return await supabase
      .from('fee_heads')
      .select('*')
      .eq('school_id', schoolId)
      .range(from, to);
  });
}

// Get fee structures for a class
async function getFeeStructures(schoolId, classId) {
  return await fetchAllRows(async (from, to) => {
    return await supabase
      .from('fee_structures')
      .select('*')
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .range(from, to);
  });
}

// Check if student already has a fee plan
async function hasFeePlan(schoolId, studentId) {
  const { data, error } = await supabase
    .from('fee_plans')
    .select('id')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

// Create fee plan for a student
async function createFeePlan(schoolId, studentId, classId, feeHeads, feeStructures, effectiveFrom, userId) {
  // Filter fee heads to only those that have a fee structure for this class
  const applicableFeeHeadIds = new Set(feeStructures.map(s => s.fee_head_id));
  const filteredFeeHeads = feeHeads.filter(fh => applicableFeeHeadIds.has(fh.id));
  
  // Create fee plan items only for fee heads that are applicable to this class
  const items = filteredFeeHeads.map(feeHead => {
    const structure = feeStructures.find(s => s.fee_head_id === feeHead.id);
    const amount = structure?.amount || feeHead.default_amount || 0;
    
    return {
      feeHeadId: feeHead.id,
      actualFee: amount,
      discountAmount: 0,
      discountPercent: 0,
      feeAfterDiscount: amount,
      discountType: undefined,
      discountReason: undefined
    };
  });
  
  // Create the fee plan
  const planData = {
    effectiveFrom,
    notes: undefined,
    items
  };
  
  // Check if fee plan exists
  const existing = await hasFeePlan(schoolId, studentId);
  
  let feePlanId;
  
  if (existing) {
    // Update existing plan
    const { data: updatedPlan, error: updateError } = await supabase
      .from('fee_plans')
      .update({
        effective_from: planData.effectiveFrom,
        notes: planData.notes || null,
        updated_by: userId || null,
      })
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .select('id')
      .single();
    
    if (updateError) throw updateError;
    feePlanId = updatedPlan.id;
    
    // Delete existing items
    const { error: deleteError } = await supabase
      .from('fee_plan_items')
      .delete()
      .eq('fee_plan_id', feePlanId)
      .eq('school_id', schoolId);
    
    if (deleteError) throw deleteError;
  } else {
    // Create new plan
    const { data: newPlan, error: createError } = await supabase
      .from('fee_plans')
      .insert({
        school_id: schoolId,
        student_id: studentId,
        effective_from: planData.effectiveFrom,
        notes: planData.notes || null,
        created_by: userId || null,
      })
      .select('id')
      .single();
    
    if (createError) throw createError;
    feePlanId = newPlan.id;
  }
  
  // Insert fee plan items
  if (items.length > 0) {
    const itemsToInsert = items.map(item => ({
      fee_plan_id: feePlanId,
      school_id: schoolId,
      fee_head_id: item.feeHeadId,
      arrears: 0,
      actual_fee: item.actualFee || 0,
      discount_amount: item.discountAmount || 0,
      discount_percent: item.discountPercent || 0,
      fee_after_discount: item.feeAfterDiscount || 0,
      discount_type: item.discountType || null,
      discount_reason: item.discountReason || null,
    }));
    
    const { error: itemsError } = await supabase
      .from('fee_plan_items')
      .insert(itemsToInsert);
    
    if (itemsError) throw itemsError;
  }
  
  return feePlanId;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const schoolId = parseInt(args[0]);
  const userId = args[1] ? parseInt(args[1]) : null;
  const skipExisting = args.includes('--skip-existing');
  const effectiveFromArg = args.find(arg => arg.startsWith('--effective-from='));
  const effectiveFrom = effectiveFromArg 
    ? effectiveFromArg.split('=')[1] 
    : new Date().toISOString().split('T')[0];
  
  if (!schoolId || isNaN(schoolId)) {
    console.error('Error: Invalid school_id');
    console.error('Usage: node scripts/batch_create_fee_plans.js <school_id> [user_id] [--skip-existing] [--effective-from=YYYY-MM-DD]');
    process.exit(1);
  }
  
  console.log('Starting batch fee plan creation...');
  console.log(`School ID: ${schoolId}`);
  console.log(`User ID: ${userId || 'Not specified'}`);
  console.log(`Skip existing: ${skipExisting}`);
  console.log(`Effective from: ${effectiveFrom}`);
  console.log('');
  
  try {
    // Test connection first
    await testConnection();
    
    // Get active session
    console.log('Fetching active session...');
    const session = await getActiveSession(schoolId);
    console.log(`Active session: ${session.name} (ID: ${session.id})`);
    console.log('');
    
    // Get all students
    console.log('Fetching all students...');
    const students = await getAllStudents(schoolId, session.id);
    console.log(`Found ${students.length} students`);
    console.log('');
    
    if (students.length === 0) {
      console.log('No students found. Exiting.');
      process.exit(0);
    }
    
    // Get all fee heads
    console.log('Fetching fee heads...');
    const feeHeads = await getFeeHeads(schoolId);
    console.log(`Found ${feeHeads.length} fee heads`);
    console.log('');
    
    if (feeHeads.length === 0) {
      console.log('No fee heads found. Please add fee heads first.');
      process.exit(1);
    }
    
    // Group students by class for efficient fee structure fetching
    const studentsByClass = {};
    students.forEach(student => {
      if (!studentsByClass[student.classId]) {
        studentsByClass[student.classId] = [];
      }
      studentsByClass[student.classId].push(student);
    });
    
    console.log(`Processing ${Object.keys(studentsByClass).length} classes...`);
    console.log('');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each class
    for (const [classId, classStudents] of Object.entries(studentsByClass)) {
      console.log(`Processing class ${classId} (${classStudents.length} students)...`);
      
      // Get fee structures for this class
      const feeStructures = await getFeeStructures(schoolId, parseInt(classId));
      
      // Filter fee heads to only those that have a fee structure for this class
      const applicableFeeHeadIds = new Set(feeStructures.map(s => s.fee_head_id));
      const filteredFeeHeads = feeHeads.filter(fh => applicableFeeHeadIds.has(fh.id));
      
      console.log(`  Found ${feeStructures.length} fee structures, ${filteredFeeHeads.length} applicable fee heads`);
      
      // Process each student in this class
      for (const student of classStudents) {
        try {
          // Check if student already has a fee plan
          if (skipExisting && await hasFeePlan(schoolId, student.id)) {
            console.log(`  Skipping ${student.name} (ID: ${student.id}) - already has fee plan`);
            skipCount++;
            continue;
          }
          
          // Create fee plan with filtered fee heads
          await createFeePlan(
            schoolId,
            student.id,
            student.classId,
            filteredFeeHeads,
            feeStructures,
            effectiveFrom,
            userId
          );
          
          console.log(`  ✓ Created fee plan for ${student.name} (ID: ${student.id}) with ${filteredFeeHeads.length} fee head(s)`);
          successCount++;
        } catch (error) {
          console.error(`  ✗ Error creating fee plan for ${student.name} (ID: ${student.id}):`, error.message);
          errors.push({ student: student.name, id: student.id, error: error.message });
          errorCount++;
        }
      }
      
      console.log('');
    }
    
    // Summary
    console.log('='.repeat(50));
    console.log('Summary:');
    console.log(`  Success: ${successCount}`);
    console.log(`  Skipped: ${skipCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('='.repeat(50));
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(({ student, id, error }) => {
        console.log(`  - ${student} (ID: ${id}): ${error}`);
      });
    }
    
    console.log('\nBatch fee plan creation completed!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();


