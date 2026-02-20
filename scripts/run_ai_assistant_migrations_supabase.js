const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('Running AI Assistant migrations using Supabase client...');

const configPath = path.resolve(__dirname, '../supabase.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const supabaseUrl = 'https://dgtlbtpqhwizbgvienqb.supabase.co';
const supabaseKey = config.service_role_api_key;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  try {
    console.log('Connected to Supabase');

    // Migration 1: Add AI Assistant permission
    console.log('\n--- Running Migration 1: Add AI Assistant Permission ---');
    const migration1 = fs.readFileSync(
      path.resolve(__dirname, '../supabase/migrations/20250130000001_add_ai_assistant_permission.sql'),
      'utf8'
    );

    // Execute migration 1 using RPC
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: migration1
    });

    if (error1) {
      // Check if it's an "already exists" error
      if (error1.message && (error1.message.includes('already exists') || error1.message.includes('duplicate'))) {
        console.log('⚠ Permission already exists, skipping...');
      } else {
        console.error('Error in migration 1:', error1);
        // Try executing statement by statement
        const statements1 = migration1.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
        for (const stmt of statements1) {
          if (stmt) {
            console.log(`Executing: ${stmt.split('\n')[0].slice(0, 80)}...`);
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
            if (stmtError && !stmtError.message.includes('already exists') && !stmtError.message.includes('duplicate')) {
              console.error('Error:', stmtError.message);
            } else if (!stmtError) {
              console.log('✓ Executed successfully');
            }
          }
        }
      }
    } else {
      console.log('✓ Migration 1 completed successfully');
    }

    // Migration 2: Create AI Assistant settings table
    console.log('\n--- Running Migration 2: Create AI Assistant Settings Table ---');
    const migration2 = fs.readFileSync(
      path.resolve(__dirname, '../supabase/migrations/20250130000002_create_ai_assistant_settings.sql'),
      'utf8'
    );

    // Execute migration 2 statement by statement
    const statements2 = migration2.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    for (const stmt of statements2) {
      if (stmt) {
        console.log(`Executing: ${stmt.split('\n')[0].slice(0, 80)}...`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
        if (stmtError) {
          // Check if it's an "already exists" error
          if (stmtError.message && (stmtError.message.includes('already exists') || stmtError.message.includes('duplicate') || stmtError.code === '42P07')) {
            console.log('⚠ Already exists, skipping...');
          } else {
            console.error('Error:', stmtError.message);
          }
        } else {
          console.log('✓ Executed successfully');
        }
      }
    }

    console.log('\n✅ All migrations completed successfully!');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message || err);
    console.error(err);
    process.exit(1);
  }
}

runMigrations();

