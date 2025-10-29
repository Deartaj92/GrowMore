# GitHub Updates Setup Script for Windows
# This script helps you configure GitHub for app updates

Write-Host ""
Write-Host "🚀 GitHub Updates Setup" -ForegroundColor Cyan
Write-Host ""

# Get GitHub repository information
$username = Read-Host "Enter your GitHub username"
$repoName = Read-Host "Enter your repository name"

if (-not $username -or -not $repoName) {
    Write-Host "❌ Username and repository name are required!" -ForegroundColor Red
    exit 1
}

$repoPath = "$username/$repoName"

Write-Host ""
Write-Host "📦 Repository: $repoPath" -ForegroundColor Yellow
Write-Host ""

# Function to update file content
function Update-File {
    param(
        [string]$FilePath,
        [string]$SearchPattern,
        [string]$Replacement,
        [string]$Description
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "⚠️  File not found: $FilePath" -ForegroundColor Yellow
        return $false
    }
    
    $content = Get-Content $FilePath -Raw
    
    if ($content -match $SearchPattern -or $content -match "YOUR_USERNAME" -or $content -match "YOUR_REPO") {
        $content = $content -replace $SearchPattern, $Replacement
        Set-Content -Path $FilePath -Value $content -NoNewline
        Write-Host "✅ Updated: $FilePath" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✓  Already configured: $FilePath" -ForegroundColor Gray
        return $false
    }
}

Write-Host "📝 Updating configuration files..." -ForegroundColor Cyan
Write-Host ""

$updatedCount = 0

# Update capacitor.config.ts
if (Update-File -FilePath "capacitor.config.ts" -SearchPattern "YOUR_USERNAME/YOUR_REPO" -Replacement $repoPath -Description "Capacitor configuration") {
    $updatedCount++
}

# Update updateService.ts
if (Update-File -FilePath "src/services/updateService.ts" -SearchPattern "YOUR_USERNAME/YOUR_REPO" -Replacement $repoPath -Description "Update service") {
    $updatedCount++
}

# Update deploy-update.bat
if (Update-File -FilePath "scripts/deploy-update.bat" -SearchPattern "set REPO_OWNER=YOUR_USERNAME" -Replacement "set REPO_OWNER=$username" -Description "Windows deployment script") {
    $updatedCount++
}
if (Update-File -FilePath "scripts/deploy-update.bat" -SearchPattern "set REPO_NAME=YOUR_REPO" -Replacement "set REPO_NAME=$repoName" -Description "Windows deployment script") {
    $updatedCount++
}

# Update deploy-update.sh
if (Update-File -FilePath "scripts/deploy-update.sh" -SearchPattern 'REPO_OWNER="YOUR_USERNAME"' -Replacement "REPO_OWNER=`"$username`"" -Description "Linux/Mac deployment script") {
    $updatedCount++
}
if (Update-File -FilePath "scripts/deploy-update.sh" -SearchPattern 'REPO_NAME="YOUR_REPO"' -Replacement "REPO_NAME=`"$repoName`"" -Description "Linux/Mac deployment script") {
    $updatedCount++
}

Write-Host ""
Write-Host "✨ Configuration complete! Updated $updatedCount file(s)." -ForegroundColor Green
Write-Host ""

# Check GitHub CLI
$hasGH = Read-Host "Do you have GitHub CLI (gh) installed? (y/n)"

if ($hasGH -eq "n" -or $hasGH -eq "no") {
    Write-Host ""
    Write-Host "📥 Installing GitHub CLI..." -ForegroundColor Yellow
    Write-Host "Visit: https://cli.github.com/" -ForegroundColor Cyan
    Write-Host "Or run: winget install GitHub.cli" -ForegroundColor Cyan
    Write-Host ""
    
    $installNow = Read-Host "Have you installed it? (y/n)"
    if ($installNow -eq "n" -or $installNow -eq "no") {
        Write-Host ""
        Write-Host "⚠️  Please install GitHub CLI before continuing." -ForegroundColor Yellow
        exit 0
    }
}

# Authenticate GitHub CLI
Write-Host ""
Write-Host "🔐 Authenticating with GitHub..." -ForegroundColor Cyan
$message = "If you haven't authenticated yet, run: gh auth login"
Write-Host $message -ForegroundColor Yellow
Write-Host ""

try {
    $null = gh auth status 2>&1
    Write-Host "✅ GitHub CLI is authenticated!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️  GitHub CLI not authenticated. Please run: gh auth login" -ForegroundColor Yellow
    Write-Host ""
}

# Verify repository exists
Write-Host "🔍 Verifying repository exists: $repoPath..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoPath" -ErrorAction Stop
    Write-Host "✅ Repository found: $($response.full_name)" -ForegroundColor Green
    Write-Host "   Description: $($response.description)" -ForegroundColor Gray
    Write-Host "   URL: $($response.html_url)" -ForegroundColor Gray
    Write-Host ""
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "⚠️  Repository not found: $repoPath" -ForegroundColor Yellow
        Write-Host "   Make sure the repository exists and is accessible." -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "⚠️  Could not verify repository. Make sure you have internet connection." -ForegroundColor Yellow
        Write-Host ""
    }
}

# Final instructions
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Make sure your repository is initialized: git init"
Write-Host "2. Add remote: git remote add origin https://github.com/$repoPath.git"
Write-Host "3. Push your code: git push -u origin main"
Write-Host "4. To deploy an update, run: npm run deploy:update"
Write-Host ""
Write-Host "📖 For more information, see: GITHUB_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
