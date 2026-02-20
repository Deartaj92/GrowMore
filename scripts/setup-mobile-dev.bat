@echo off
echo 🚀 Setting up mobile development environment...
echo.

echo 📱 Running mobile setup script...
npm run setup:mobile

echo.
echo 🔄 Starting development server...
echo 📱 Make sure your phone and computer are on the same WiFi network!
echo.

start "React Dev Server" cmd /k "npm run start:mobile"

echo.
echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak > nul

echo.
echo 📱 Syncing with Android...
start "Capacitor Sync" cmd /k "npm run sync:android"

echo.
echo ✅ Setup complete! 
echo 📱 Open Android Studio when ready and install the app on your device.
echo 🔄 Changes will reload automatically!
echo.
pause
