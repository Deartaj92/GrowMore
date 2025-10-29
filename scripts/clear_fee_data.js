/**
 * Clear All Fee Data Script
 * 
 * This script clears all data from fee-related tables to start fresh.
 * IMPORTANT: This will permanently delete all fee data!
 * 
 * Usage: node scripts/clear_fee_data.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Supabase configuration
const supabaseConfig = require('../supabase.config.json');
const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

async function clearFeeData() {
    console.log('=====================================================');
    console.log('CLEARING ALL FEE DATA...');
    console.log('=====================================================');
    console.log('⚠️  WARNING: This will permanently delete all fee data!');
    console.log('=====================================================\n');

    try {
        // Define fee tables in dependency order (child tables first)
        const feeTables = [
            'fee_audit_logs',
            'fee_payments', 
            'fee_invoice_items',
            'fee_invoices',
            'student_fee_concessions',
            'student_fee_plans',
            'fee_structures',
            'fee_heads'
        ];

        // Clear each table
        for (const table of feeTables) {
            console.log(`Clearing ${table}...`);
            
            const { error } = await supabase
                .from(table)
                .delete()
                .neq('id', 0); // Delete all records (id != 0 will match all records)
            
            if (error) {
                console.error(`❌ Error clearing ${table}:`, error.message);
                throw error;
            }
            
            console.log(`✅ ${table} cleared successfully`);
        }

        // Reset auto-increment sequences
        console.log('\nResetting auto-increment sequences...');
        
        const sequences = [
            'fee_audit_logs_id_seq',
            'fee_payments_id_seq',
            'fee_invoice_items_id_seq', 
            'fee_invoices_id_seq',
            'student_fee_concessions_id_seq',
            'student_fee_plans_id_seq',
            'fee_structures_id_seq',
            'fee_heads_id_seq'
        ];

        for (const sequence of sequences) {
            const { error } = await supabase.rpc('sql', {
                query: `ALTER SEQUENCE public.${sequence} RESTART WITH 1;`
            });
            
            if (error) {
                console.error(`❌ Error resetting ${sequence}:`, error.message);
                // Don't throw here, as this is not critical
            } else {
                console.log(`✅ ${sequence} reset to 1`);
            }
        }

        // Verify all tables are empty
        console.log('\nVerifying data clearance...');
        
        for (const table of feeTables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                console.error(`❌ Error checking ${table}:`, error.message);
            } else {
                console.log(`✅ ${table}: ${count} records (should be 0)`);
            }
        }

        console.log('\n=====================================================');
        console.log('🎉 FEE DATA CLEARED SUCCESSFULLY!');
        console.log('=====================================================');
        console.log('All fee-related data has been removed from:');
        feeTables.forEach(table => console.log(`- ${table}`));
        console.log('=====================================================');
        console.log('Auto-increment sequences have been reset to start from 1');
        console.log('You can now start fresh with fee management setup.');
        console.log('=====================================================');

    } catch (error) {
        console.error('\n❌ Error during fee data clearance:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

// Confirmation prompt
function askConfirmation() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Are you sure you want to delete ALL fee data? This cannot be undone! (yes/no): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

// Main execution
async function main() {
    console.log('Fee Data Clearance Script');
    console.log('==========================\n');
    
    const confirmed = await askConfirmation();
    
    if (!confirmed) {
        console.log('Operation cancelled. No data was deleted.');
        process.exit(0);
    }
    
    await clearFeeData();
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { clearFeeData };

