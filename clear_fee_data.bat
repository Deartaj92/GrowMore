@echo off
REM Clear Fee Data Batch Script
REM This script provides an easy way to clear all fee data

echo =====================================================
echo Clear Fee Data Script
echo =====================================================
echo.
echo This script will help you clear all fee data from your database.
echo.
echo ⚠️  WARNING: This will permanently delete ALL fee data!
echo Make sure to backup your data before proceeding.
echo.
echo =====================================================
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Node.js detected. Running JavaScript version...
    echo.
    node scripts/clear_fee_data.js
    goto :end
)

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo PowerShell detected. You can run the PowerShell script manually:
    echo.
    echo .\clear_fee_data.ps1 -SupabaseUrl "your-url" -SupabaseKey "your-key"
    echo.
    echo Or you can run the SQL script directly in your database client.
    goto :end
)

echo Neither Node.js nor PowerShell found.
echo Please run one of the following manually:
echo.
echo 1. Node.js script: node scripts/clear_fee_data.js
echo 2. PowerShell script: .\clear_fee_data.ps1 -SupabaseUrl "your-url" -SupabaseKey "your-key"
echo 3. SQL script: Run clear_fee_data.sql in your database client
echo.

:end
pause

