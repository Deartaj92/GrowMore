const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Add GitHub CLI to PATH for Windows
process.env.PATH += ';C:\\Program Files\\GitHub CLI';

console.log('📦 Uploading bundle to existing release...\n');

try {
  // Check if bundles directory exists, create if not
  const bundlesDir = path.join(__dirname, '..', 'bundles');
  if (!fs.existsSync(bundlesDir)) {
    fs.mkdirSync(bundlesDir, { recursive: true });
  }

  // 1. Build the app (if not already built)
  if (!fs.existsSync(path.join(__dirname, '..', 'build', 'index.html'))) {
    console.log('📦 Step 1: Building app...');
    execSync('npm run build', { stdio: 'inherit' });
  } else {
    console.log('✅ Build folder already exists, skipping build...');
  }
  
  // 2. Create bundle
  console.log('\n📦 Step 2: Creating bundle...');
  const bundlePath = path.join(__dirname, '..', 'bundles', 'latest.zip');
  const buildPath = path.join(__dirname, '..', 'build');
  
  // Remove old bundle if exists
  if (fs.existsSync(bundlePath)) {
    fs.unlinkSync(bundlePath);
  }
  
  execSync(`powershell -Command "Compress-Archive -Path '${buildPath}\\*' -DestinationPath '${bundlePath}' -Force"`, { stdio: 'inherit' });
  
  // Copy bundle with correct name for upload
  const uploadBundlePath = path.join(__dirname, '..', 'bundles', 'app-bundle.zip');
  if (fs.existsSync(uploadBundlePath)) {
    fs.unlinkSync(uploadBundlePath);
  }
  fs.copyFileSync(bundlePath, uploadBundlePath);
  
  // 3. Upload bundle to existing release v1.0.4
  console.log('\n📦 Step 3: Uploading bundle to release v1.0.4...');
  execSync(`gh release upload v1.0.4 bundles/app-bundle.zip --repo Deartaj92/GrowMore --clobber`, { stdio: 'inherit' });
  
  console.log('\n✅ Bundle uploaded successfully!');
  console.log(`\nView release: https://github.com/Deartaj92/GrowMore/releases/tag/v1.0.4`);
} catch (error) {
  console.error('\n❌ Error uploading bundle:', error.message);
  process.exit(1);
}
