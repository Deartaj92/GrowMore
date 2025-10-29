Write-Host "Setting up mobile development environment..." -ForegroundColor Green
Write-Host ""

Write-Host "Running mobile setup script..." -ForegroundColor Yellow
npm run setup:mobile

Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Cyan
Write-Host "Make sure your phone and computer are on the same WiFi network!" -ForegroundColor Yellow
Write-Host ""

# Start React dev server in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"

Write-Host ""
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Syncing with Android..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run sync:android"

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Open Android Studio when ready and install the app on your device." -ForegroundColor Cyan
Write-Host "Changes will reload automatically!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"
