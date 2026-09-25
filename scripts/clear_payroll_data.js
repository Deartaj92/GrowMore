/**
 * Clear All Payroll Data Script
 * 
 * This script clears all data from payroll-related tables to start fresh.
 * IMPORTANT: This will permanently delete all payroll data!
 * 
 * Usage: 
 *   node scripts/clear_payroll_data.js           (Interactive confirmation prompt)
 *   node scripts/clear_payroll_data.js --force   (Bypass interactive prompt)
 *   node scripts/clear_payroll_data.js --transactional-only  (Retain plans and settings)
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

// Active Supabase credentials from src/supabaseClient.ts
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://seeeczoigcxwvpazfydj.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZWVjem9pZ2N4d3ZwYXpmeWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDQ0NTcsImV4cCI6MjA2NTYyMDQ1N30.r5IAvn9vGnIVsaxmHbyWsa7bMZ_Gju5QU2G3unvObqc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearPayrollData(options = {}) {
    const isTransactionalOnly = options.transactionalOnly || false;

    console.log('=====================================================');
    console.log('CLEARING PAYROLL DATA...');
    console.log(`Mode: ${isTransactionalOnly ? 'Transactional Data Only' : 'Complete Payroll Wipe'}`);
    console.log('=====================================================');
    console.log('⚠️  WARNING: This will permanently delete payroll data!');
    console.log('=====================================================\n');

    // Define tables in strict dependency order (child tables first)
    const transactionalTables = [
        'payroll_payment_items',
        'payroll_payments',
        'payroll_generation_items',
        'payroll_generations',
        'payroll_adjustments',
        'payroll_advances',
        'payroll_audit_logs'
    ];

    const setupTables = [
        'employee_payroll_plans',
        'payroll_plan_items',
        'payroll_plans',
        'payroll_settings'
    ];

    const payrollTables = isTransactionalOnly
        ? transactionalTables
        : [...transactionalTables, ...setupTables];

    // Delete records from each table
    for (const table of payrollTables) {
        console.log(`Clearing table: ${table}...`);
        
        const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', 0); // Delete all records (id != 0 matches all serial IDs)
        
        if (error) {
            console.error(`  ❌ Error clearing ${table}:`, error.message);
        } else {
            console.log(`  ✅ ${table} cleared successfully`);
        }
    }

    // Verify all tables are empty
    console.log('\n=====================================================');
    console.log('VERIFYING PAYROLL DATA CLEARANCE...');
    console.log('=====================================================');
    let allCleared = true;
    
    for (const table of payrollTables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error(`  ❌ Error checking count for ${table}:`, error.message);
            allCleared = false;
        } else {
            console.log(`  ✅ ${table}: ${count} records remaining`);
            if (count > 0) allCleared = false;
        }
    }

    console.log('\n=====================================================');
    if (allCleared) {
        console.log('🎉 ALL PAYROLL DATA CLEARED SUCCESSFULLY!');
        console.log('All payroll tables are now empty (0 records).');
    } else {
        console.log('⚠️  PAYROLL DATA CLEARANCE COMPLETED WITH SOME REMAINING RECORDS!');
    }
    console.log('=====================================================');
}

// Confirmation prompt
function askConfirmation() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Are you sure you want to delete ALL payroll data? This cannot be undone! (yes/no): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const force = args.includes('--force') || args.includes('-y');
    const transactionalOnly = args.includes('--transactional-only');

    console.log('Payroll Data Clearance Tool');
    console.log('===========================\n');
    
    if (!force) {
        const confirmed = await askConfirmation();
        if (!confirmed) {
            console.log('Operation cancelled. No payroll data was deleted.');
            process.exit(0);
        }
    }
    
    await clearPayrollData({ transactionalOnly });
}

// Run script if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { clearPayrollData };
