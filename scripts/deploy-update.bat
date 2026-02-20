@echo off
REM GitHub Update Deployment Script for Windows
REM This script builds your app and creates a GitHub release with the bundle

setlocal enabledelayedexpansion

REM Configuration
set REPO_OWNER=Deartaj92
set REPO_NAME=GrowMore
set BUNDLE_NAME=app-bundle.zip

echo Starting deployment process...

REM Check if GitHub CLI is installed
where gh >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: GitHub CLI (gh) is not installed. Please install it first.
    echo Visit: https://cli.github.com/
    pause
    exit /b 1
)

REM Check if user is authenticated with GitHub
gh auth status >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Not authenticated with GitHub. Please run 'gh auth login' first.
    pause
    exit /b 1
)

echo GitHub CLI found and authenticated!

REM Get version from package.json
for /f "tokens=2 delims=:" %%a in ('findstr /r /c:"\"version\":" package.json') do (
    for /f "delims=\" %%b in ("%%a") do (
        set VERSION=%%b
    )
)
set VERSION=%VERSION: =%
set VERSION=%VERSION:,=%
set VERSION=%VERSION:"=%

set RELEASE_TAG=v%VERSION%
set RELEASE_NAME=Release %VERSION%
set RELEASE_BODY=Automated release for version %VERSION%. See changelog for details.

echo Deploying update for %REPO_OWNER%/%REPO_NAME% - Version: %VERSION%

REM 1. Build the React app
echo Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: React build failed!
    exit /b 1
)

REM 2. Create Capacitor Live Update bundle
echo Creating Capacitor Live Update bundle...
call npx cap live-updates bundle
if %errorlevel% neq 0 (
    echo ERROR: Capacitor bundle creation failed!
    exit /b 1
)

REM Ensure the bundle exists
set BUNDLE_PATH=bundles\latest.zip
if not exist "%BUNDLE_PATH%" (
    echo ERROR: Bundle file not found at %BUNDLE_PATH%. Check 'capacitor.config.ts' bundlePath.
    exit /b 1
)

REM 3. Create a GitHub Release
echo Creating GitHub Release '%RELEASE_TAG%'...
REM Check if release already exists
for /f "tokens=*" %%a in ('gh api repos/%REPO_OWNER%/%REPO_NAME%/releases/tags/%RELEASE_TAG% --jq ".tag_name" 2^>nul') do (
    set EXISTING_RELEASE=%%a
)

if "%EXISTING_RELEASE%"=="%RELEASE_TAG%" (
    echo WARNING: Release %RELEASE_TAG% already exists. Deleting existing release to create a new one.
    call gh api --method DELETE "repos/%REPO_OWNER%/%REPO_NAME%/releases/tags/%RELEASE_TAG%"
    if %errorlevel% neq 0 (
        echo ERROR: Failed to delete existing release!
        exit /b 1
    )
)

for /f "tokens=*" %%a in ('gh release create "%RELEASE_TAG%" ^
  --repo "%REPO_OWNER%/%REPO_NAME%" ^
  --title "%RELEASE_NAME%" ^
  --notes "%RELEASE_BODY%" ^
  --target main ^
  --draft ^
  --json id ^
  --jq ".id"') do (
    set RELEASE_ID=%%a
)
if "%RELEASE_ID%"=="" (
    echo ERROR: Failed to create GitHub Release!
    exit /b 1
)
echo SUCCESS: Release created with ID: %RELEASE_ID%

REM 4. Upload the bundle as a release asset
echo Uploading bundle '%BUNDLE_NAME%' to release...
call gh release upload "%RELEASE_TAG%" "%BUNDLE_PATH%#%BUNDLE_NAME%" ^
  --repo "%REPO_OWNER%/%REPO_NAME%" ^
  --clobber
if %errorlevel% neq 0 (
    echo ERROR: Failed to upload bundle asset!
    exit /b 1
)
echo SUCCESS: Bundle uploaded successfully!

REM 5. Publish the release (remove draft status)
echo Publishing release...
call gh api --method PATCH "repos/%REPO_OWNER%/%REPO_NAME%/releases/%RELEASE_ID%" ^
  -f draft=false
if %errorlevel% neq 0 (
    echo ERROR: Failed to publish release!
    exit /b 1
)

echo SUCCESS: Update deployed successfully to GitHub Releases!
echo View release: https://github.com/%REPO_OWNER%/%REPO_NAME%/releases/tag/%RELEASE_TAG%

endlocal
exit /b 0