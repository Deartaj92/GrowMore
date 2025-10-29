@echo off
REM GitHub Update Deployment Script for Windows
REM This script builds your app and creates a GitHub release with the bundle

setlocal enabledelayedexpansion

REM Configuration
set REPO_OWNER=Deartaj92
set REPO_NAME=DearTaj
set BUNDLE_NAME=app-bundle.zip

echo 🚀 Starting deployment process...

REM Check if GitHub CLI is installed
where gh >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ GitHub CLI (gh) is not installed. Please install it first.
    echo Visit: https://cli.github.com/
    pause
    exit /b 1
)

REM Check if user is authenticated with GitHub
gh auth status >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Not authenticated with GitHub. Please run 'gh auth login' first.
    pause
    exit /b 1
)

REM Get version from package.json
for /f "tokens=2 delims=:" %%a in ('node -p "require('./package.json').version"') do set VERSION=%%a
set VERSION=%VERSION:"=%
set VERSION=%VERSION: =%
echo 📦 Building version: %VERSION%

REM Build the React app
echo 🔨 Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

REM Create bundle directory if it doesn't exist
if not exist bundles mkdir bundles

REM Create the bundle
echo 📦 Creating update bundle...
cd build
powershell -command "Compress-Archive -Path * -DestinationPath ..\bundles\%BUNDLE_NAME% -Force"
cd ..

REM Check if bundle was created
if not exist "bundles\%BUNDLE_NAME%" (
    echo ❌ Bundle creation failed!
    pause
    exit /b 1
)

echo ✅ Bundle created successfully

REM Create GitHub release
echo 📝 Creating GitHub release...

REM Create release notes
echo ## What's New in v%VERSION% > release_notes.md
echo. >> release_notes.md
echo - Bug fixes and improvements >> release_notes.md
echo - Performance optimizations >> release_notes.md
echo - UI/UX enhancements >> release_notes.md
echo. >> release_notes.md
echo ## Installation >> release_notes.md
echo This update will be automatically downloaded and installed when you restart the app. >> release_notes.md

REM Create the release
gh release create "v%VERSION%" "bundles\%BUNDLE_NAME%" --title "Release v%VERSION%" --notes-file release_notes.md --latest

if %errorlevel% neq 0 (
    echo ❌ Release creation failed!
    pause
    exit /b 1
)

echo 🎉 Release v%VERSION% created successfully!
echo 📱 Users will now be notified of the update.

REM Clean up
echo 🧹 Cleaning up...
del release_notes.md
rmdir /s /q bundles

echo ✨ Deployment complete!
pause
