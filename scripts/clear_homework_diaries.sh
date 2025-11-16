#!/bin/bash

# Script to clear all existing homework diary entries
# This script uses the Supabase CLI or psql to execute SQL

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  WARNING: This will permanently delete all homework diary entries!${NC}"
echo -e "${RED}This operation cannot be undone!${NC}"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

# Check if SQL file exists
SQL_FILE="scripts/clear_homework_diaries.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Error: SQL file not found at $SQL_FILE${NC}"
    exit 1
fi

# Method 1: Using psql (if available)
if command -v psql &> /dev/null; then
    echo -e "${GREEN}Using psql...${NC}"
    
    # Check if .env file exists and source database URL
    if [ -f ".env" ]; then
        source .env
        if [ -n "$DATABASE_URL" ]; then
            psql "$DATABASE_URL" -f "$SQL_FILE"
        else
            echo -e "${YELLOW}DATABASE_URL not found in .env${NC}"
            echo "Please provide database connection string:"
            read -p "Database URL: " db_url
            psql "$db_url" -f "$SQL_FILE"
        fi
    else
        echo "Please provide database connection string:"
        read -p "Database URL: " db_url
        psql "$db_url" -f "$SQL_FILE"
    fi
    
# Method 2: Using Supabase CLI (if available)
elif command -v supabase &> /dev/null; then
    echo -e "${GREEN}Using Supabase CLI...${NC}"
    supabase db execute "$SQL_FILE"
    
else
    echo -e "${RED}Error: Neither psql nor supabase CLI found${NC}"
    echo "Please install PostgreSQL client (psql) or Supabase CLI"
    echo "Or use the Node.js script: node scripts/clear_homework_diaries.js"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Homework diaries cleared successfully!${NC}"
else
    echo -e "${RED}❌ Error occurred while clearing homework diaries${NC}"
    exit 1
fi

