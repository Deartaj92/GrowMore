console.log('--- Supabase Migration Script Starting ---');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('Loading config...');
const configPath = path.resolve(__dirname, '../supabase.config.json');
const schemaPath = path.resolve(__dirname, '../supabase_school_schema.sql');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
console.log('Config loaded:', configPath);
const sql = fs.readFileSync(schemaPath, 'utf-8');
console.log('SQL loaded:', schemaPath);

console.log('Creating pg client...');
const client = new Client({
  connectionString: config.postgres_url,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Connecting to Supabase Postgres...');
    await client.connect();
    console.log('Connected to Supabase Postgres');
    // Split SQL into statements and run one by one
    const statements = sql.split(/;\s*\n/).map((s: string) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try {
        if (stmt) {
          console.log('Executing:', stmt.split('\n')[0].slice(0, 80) + '...');
          await client.query(stmt);
          console.log('Executed successfully.');
        }
      } catch (err) {
        console.error('Error executing statement:', stmt.split('\n')[0]);
        console.error((err as Error).message);
      }
    }
    console.log('Schema migration applied!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

migrate();

export {}; 