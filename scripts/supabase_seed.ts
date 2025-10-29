const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('--- Supabase Seed Script Starting ---');
const configPath = path.resolve(__dirname, '../supabase.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const client = new Client({
  connectionString: config.postgres_url,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres');

    // Insert sessions
    const sessions = [
      { name: '2022-2023', start_date: '2022-04-01', end_date: '2023-03-31', is_active: false },
      { name: '2023-2024', start_date: '2023-04-01', end_date: '2024-03-31', is_active: true }
    ];
    for (const s of sessions) {
      try {
        const res = await client.query(
          `INSERT INTO sessions (name, start_date, end_date, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING RETURNING *`,
          [s.name, s.start_date, s.end_date, s.is_active]
        );
        if (res.rowCount > 0) {
          console.log('Inserted session:', s.name);
        } else {
          console.log('Session already exists:', s.name);
        }
      } catch (err) {
        console.error('Error inserting session:', s.name, err.message);
      }
    }

    // Insert classes
    const classes = [
      { name: 'Nursery', description: 'Nursery class' },
      { name: '1st', description: 'First grade' },
      { name: '2nd', description: 'Second grade' },
      { name: '10th', description: 'Tenth grade' }
    ];
    for (const c of classes) {
      try {
        const res = await client.query(
          `INSERT INTO classes (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING *`,
          [c.name, c.description]
        );
        if (res.rowCount > 0) {
          console.log('Inserted class:', c.name);
        } else {
          console.log('Class already exists:', c.name);
        }
      } catch (err) {
        console.error('Error inserting class:', c.name, err.message);
      }
    }

    // Insert sections for each class in the active session
    const { rows: sessionRows } = await client.query(`SELECT id FROM sessions WHERE is_active = true LIMIT 1`);
    const { rows: classRows } = await client.query(`SELECT id, name FROM classes`);
    const sections = ['A', 'B', 'C'];
    for (const classRow of classRows) {
      for (const sectionName of sections) {
        try {
          const res = await client.query(
            `INSERT INTO sections (name, class_id, session_id) VALUES ($1, $2, $3) ON CONFLICT (name, class_id, session_id) DO NOTHING RETURNING *`,
            [sectionName, classRow.id, sessionRows[0].id]
          );
          if (res.rowCount > 0) {
            console.log(`Inserted section ${sectionName} for class ${classRow.name}`);
          } else {
            console.log(`Section ${sectionName} for class ${classRow.name} already exists`);
          }
        } catch (err) {
          console.error(`Error inserting section ${sectionName} for class ${classRow.name}:`, err.message);
        }
      }
    }

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

seed();

export {}; 