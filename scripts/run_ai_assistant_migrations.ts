const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../supabase.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const postgresUrl = config.postgres_url;

console.log('Running AI Assistant migrations...');

const client = new Client({
  connectionString: postgresUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  try {
    console.log('Connecting to Supabase Postgres...');
    await client.connect();
    console.log('Connected successfully!');

    // Migration 1: Add AI Assistant permission
    console.log('\n--- Running Migration 1: Add AI Assistant Permission ---');
    const migration1 = fs.readFileSync(
      path.resolve(__dirname, '../supabase/migrations/20250130000001_add_ai_assistant_permission.sql'),
      'utf8'
    );
    
    const statements1 = migration1
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(Boolean);
    
    for (const stmt of statements1) {
      if (stmt) {
        console.log(`Executing: ${stmt.split('\n')[0].slice(0, 80)}...`);
        try {
          await client.query(stmt);
          console.log('✓ Executed successfully');
        } catch (err: any) {
          // Ignore "already exists" errors
          if (err.message && (err.message.includes('already exists') || err.code === '23505')) {
            console.log('⚠ Already exists, skipping...');
          } else {
            throw err;
          }
        }
      }
    }

    // Migration 2: Create AI Assistant settings table
    console.log('\n--- Running Migration 2: Create AI Assistant Settings Table ---');
    const migration2 = fs.readFileSync(
      path.resolve(__dirname, '../supabase/migrations/20250130000002_create_ai_assistant_settings.sql'),
      'utf8'
    );
    
    const statements2 = migration2
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(Boolean);
    
    for (const stmt of statements2) {
      if (stmt) {
        console.log(`Executing: ${stmt.split('\n')[0].slice(0, 80)}...`);
        try {
          await client.query(stmt);
          console.log('✓ Executed successfully');
        } catch (err: any) {
          // Ignore "already exists" errors
          if (err.message && (err.message.includes('already exists') || err.code === '42P07')) {
            console.log('⚠ Already exists, skipping...');
          } else {
            throw err;
          }
        }
      }
    }

    console.log('\n✅ All migrations completed successfully!');
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message || err);
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nConnection closed.');
  }
}

runMigrations();

