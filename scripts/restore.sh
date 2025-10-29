#!/bin/bash
set -e

# Load environment variables
if [ -f "$(dirname "$0")/.env" ]; then
  source "$(dirname "$0")/.env"
else
  echo ".env file not found in $(dirname "$0"). Please create it with your DB credentials."
  exit 1
fi

# Check for required tools
command -v pg_restore >/dev/null 2>&1 || { echo >&2 "pg_restore is required but not installed. Aborting."; exit 1; }
command -v gdrive >/dev/null 2>&1 || { echo >&2 "gdrive CLI is required but not installed. Aborting."; exit 1; }

# Usage
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file_path_or_gdrive_file_id>"
  exit 1
fi

INPUT="$1"
BACKUP_DIR="$(dirname "$0")/backups"
mkdir -p "$BACKUP_DIR"

# If the input is a file, use it directly. If it's not a file, treat it as a Google Drive file ID.
if [ -f "$INPUT" ]; then
  BACKUP_FILE="$INPUT"
else
  echo "Assuming $INPUT is a Google Drive file ID. Downloading..."
  gdrive files download --path "$BACKUP_DIR" "$INPUT"
  # Find the most recent file in the backup directory
  BACKUP_FILE=$(ls -t "$BACKUP_DIR" | head -n1)
  BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

# Restore the backup
pg_restore --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" --dbname="$PGDATABASE" --clean --no-owner "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Restore completed from: $BACKUP_FILE"
else
  echo "Restore failed."
  exit 1
fi 