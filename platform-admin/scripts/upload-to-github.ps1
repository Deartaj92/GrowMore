# Upload to GitHub - SchoolsAdminPanel
# Run this script from the platform-admin directory to push updates to GitHub

param(
    [string]$Message = ""
)

Write-Host ""
Write-Host "🚀 SchoolsAdminPanel - Upload to GitHub" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Ensure we're in the right directory
$currentDir = Get-Location
if (-not (Test-Path "$currentDir/package.json")) {
    Write-Host "❌ Please run this script from the platform-admin directory!" -ForegroundColor Red
    exit 1
}

# Get commit message
if (-not $Message) {
    $Message = Read-Host "Enter commit message (or press Enter for default)"
    if (-not $Message) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        $Message = "Update: $timestamp"
    }
}

Write-Host ""
Write-Host "📝 Commit message: $Message" -ForegroundColor Yellow
Write-Host ""

# Check git status
$status = git status --porcelain 2>&1
if (-not $status) {
    Write-Host "✅ Nothing to commit - working tree is clean." -ForegroundColor Green
    Write-Host ""
    exit 0
}

Write-Host "📦 Files to commit:" -ForegroundColor Cyan
git status --short
Write-Host ""

# Stage all changes
Write-Host "📥 Staging changes..." -ForegroundColor Cyan
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to stage changes!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Changes staged." -ForegroundColor Green

# Commit
Write-Host ""
Write-Host "💾 Committing..." -ForegroundColor Cyan
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Committed successfully." -ForegroundColor Green

# Push
Write-Host ""
Write-Host "☁️  Pushing to GitHub..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed! Check your token or internet connection." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Successfully pushed to GitHub!" -ForegroundColor Green
Write-Host "   Repo: https://github.com/Deartaj92/SchoolsAdminPanel" -ForegroundColor Gray
Write-Host ""
