const { Client } = require('pg');

const connectionString = 'postgresql://postgres.dgtlbtpqhwizbgvienqb:Taaj7192!!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

const client = new Client({
  connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB successfully!');
    
    // Test query
    const res = await client.query('SELECT current_database();');
    console.log('Current DB:', res.rows[0]);
    
  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    await client.end();
  }
}

run();
