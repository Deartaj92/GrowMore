const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to check if running as administrator
function isAdmin() {
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// Function to enable developer mode (allows symbolic links without admin)
function enableDeveloperMode() {
  try {
    console.log('Attempting to enable Developer Mode for symbolic links...');
    execSync('reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock" /t REG_DWORD /f /v "AllowDevelopmentWithoutDevLicense" /d "1"', { stdio: 'ignore' });
    console.log('Developer Mode enabled successfully');
    return true;
  } catch (e) {
    console.log('Could not enable Developer Mode automatically');
    return false;
  }
}

// Function to clear electron-builder cache
function clearCache() {
  try {
    const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache');
    if (fs.existsSync(cacheDir)) {
      console.log('Clearing electron-builder cache...');
      execSync(`rmdir /s /q "${cacheDir}"`, { stdio: 'ignore' });
      console.log('Cache cleared successfully');
    }
  } catch (e) {
    console.log('Could not clear cache:', e.message);
  }
}

// Main build function
function buildElectron() {
  console.log('Starting Electron build process...');
  
  // Check if running as admin
  if (!isAdmin()) {
    console.log('Not running as administrator. Attempting to enable Developer Mode...');
    if (!enableDeveloperMode()) {
      console.log('Please run this script as Administrator or enable Developer Mode manually:');
      console.log('1. Go to Settings > Update & Security > For developers');
      console.log('2. Turn on "Developer Mode"');
      console.log('3. Restart your computer');
      console.log('4. Run the build again');
      process.exit(1);
    }
  } else {
    console.log('Running as administrator - proceeding with build');
  }
  
  // Clear cache to avoid corrupted downloads
  clearCache();
  
  try {
    console.log('Building React app...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('Generating asset manifest...');
    execSync('node scripts/generate-asset-manifest.js', { stdio: 'inherit' });
    
    console.log('Building Electron app...');
    // Set environment variables to skip code signing
    const env = {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      ELECTRON_BUILDER_CACHE: 'false'
    };
    execSync('electron-builder --win', { stdio: 'inherit', env });
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildElectron();


