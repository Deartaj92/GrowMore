@echo off
echo Starting Electron build process...

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as administrator - proceeding with build
) else (
    echo Not running as administrator. Attempting to enable Developer Mode...
    
    REM Try to enable Developer Mode
    reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /t REG_DWORD /f /v "AllowDevelopmentWithoutDevLicense" /d "1" >nul 2>&1
    if %errorLevel% == 0 (
        echo Developer Mode enabled successfully
    ) else (
        echo Could not enable Developer Mode automatically
        echo Please run this script as Administrator or enable Developer Mode manually:
        echo 1. Go to Settings ^> Update ^& Security ^> For developers
        echo 2. Turn on "Developer Mode"
        echo 3. Restart your computer
        echo 4. Run the build again
        pause
        exit /b 1
    )
)

REM Clear electron-builder cache
if exist "%LOCALAPPDATA%\electron-builder\Cache" (
    echo Clearing electron-builder cache...
    rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache"
    echo Cache cleared successfully
)

REM Build the application
echo Building React app...
call npm run build
if %errorLevel% neq 0 (
    echo React build failed
    pause
    exit /b 1
)

echo Building Electron app...
set CSC_IDENTITY_AUTO_DISCOVERY=false
set ELECTRON_BUILDER_CACHE=false
call electron-builder --win
if %errorLevel% neq 0 (
    echo Electron build failed
    pause
    exit /b 1
)

echo Build completed successfully!
pause


