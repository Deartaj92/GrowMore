const express = require('express');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const upload = multer({ dest: 'scripts/backups/' });

app.use(cors());
app.use(express.json());

// Helper: Generate .env for scripts from supabase.config.json
function ensureEnvFile() {
  const configPath = path.resolve(__dirname, 'supabase.config.json');
  const envPath = path.resolve(__dirname, 'scripts/.env');
  if (!fs.existsSync(configPath)) throw new Error('supabase.config.json not found');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const url = new URL(config.postgres_url);
  const gdriveId = config.GDRIVE_FOLDER_ID || 'your_google_drive_folder_id';
  const envContent = [
    `PGHOST=${url.hostname}`,
    `PGPORT=${url.port}`,
    `PGUSER=${url.username}`,
    `PGPASSWORD=${config.password}`,
    `PGDATABASE=${url.pathname.replace('/', '')}`,
    `GDRIVE_FOLDER_ID=${gdriveId}`
  ].join('\n');
  fs.writeFileSync(envPath, envContent);
}

// POST /api/backup: Run backup.sh (use 'sh' for Windows compatibility)
app.post('/api/backup', async (req, res) => {
  try {
    ensureEnvFile();
    // Use 'sh' instead of 'bash' for better Windows compatibility
    exec('sh scripts/backup.sh', (error, stdout, stderr) => {
      if (error) return res.status(500).json({ error: stderr });
      res.json({ message: 'Backup completed', output: stdout });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/restore: Run restore.sh with uploaded file (use 'sh')
app.post('/api/restore', upload.single('backup'), async (req, res) => {
  try {
    ensureEnvFile();
    const filePath = req.file ? req.file.path : null;
    if (!filePath) return res.status(400).json({ error: 'No file uploaded' });
    exec(`sh scripts/restore.sh ${filePath}`, (error, stdout, stderr) => {
      if (error) return res.status(500).json({ error: stderr });
      res.json({ message: 'Restore completed', output: stdout });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(4000, () => console.log('API server running on port 4000')); 