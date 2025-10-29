# Supabase PostgreSQL Backup & Restore Scripts

## Overview
These scripts help you create offline backups of your Supabase PostgreSQL database and store them on Google Drive. They are designed to be future-proof and easy to automate.

## Prerequisites
- [PostgreSQL tools](https://www.postgresql.org/download/) (`pg_dump`, `pg_restore`)
- [`gdrive` CLI tool](https://github.com/prasmussen/gdrive) for Google Drive uploads/downloads
- Bash shell (Linux, macOS, or Windows with WSL/Git Bash)

## Setup
1. **Install PostgreSQL tools**
2. **Install `gdrive` CLI** and authenticate it with your Google account
3. **Create a `.env` file in the `scripts/` directory:**

```
PGHOST=your_host.supabase.co
PGPORT=5432
PGUSER=your_user
PGPASSWORD=your_password
PGDATABASE=your_db
GDRIVE_FOLDER_ID=your_google_drive_folder_id
```
- Replace values with your actual Supabase credentials and Google Drive folder ID (from the folder's URL).

## Usage

### Backup
Run from the `scripts/` directory:
```sh
bash backup.sh
```
- This creates a timestamped backup in `scripts/backups/` and uploads it to Google Drive.

### Restore
Run from the `scripts/` directory:
```sh
bash restore.sh <backup_file_path_or_gdrive_file_id>
```
- You can provide a local backup file path or a Google Drive file ID. If a file ID is given, the script downloads it first.

## Notes
- The scripts check for required tools and handle errors gracefully.
- You can automate backups with a cron job or Windows Task Scheduler.
- Keep your `.env` file secure and **never commit it to version control**.

## Updating
- If Google Drive or Supabase changes their APIs, update the scripts as needed.
- For advanced automation, consider using the [Google Drive API](https://developers.google.com/drive/api/guides/upload-files) directly. 