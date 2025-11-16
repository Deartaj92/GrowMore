const pkg = require('../package.json');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Add GitHub CLI to PATH for Windows
process.env.PATH += ';C:\\Program Files\\GitHub CLI';

console.log('🚀 Starting update deployment...\n');

try {
  // 1. Build the app
  console.log('📦 Step 1: Building app...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 2. Create bundle
  console.log('\n📦 Step 2: Creating bundle...');
  execSync('powershell -Command "Compress-Archive -Path build/* -DestinationPath bundles/app-bundle.zip -Force"', { stdio: 'inherit' });
  
  // 3. Create release
  console.log(`\n📦 Step 3: Creating release v${pkg.version}...`);
  
  // Read release notes from RELEASE_NOTES.md
  const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
  if (fs.existsSync(releaseNotesPath)) {
    try {
      const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8').trim();
      if (releaseNotes) {
        // Use --notes-file flag for better handling of multi-line text
        execSync(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes-file "${releaseNotesPath}" --draft`, { stdio: 'inherit' });
      } else {
        // Fallback if file is empty
        execSync(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes "App update release" --draft`, { stdio: 'inherit' });
      }
    } catch (err) {
      console.log(`⚠️  Could not read RELEASE_NOTES.md: ${err.message}. Using fallback.`);
      execSync(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes "App update release" --draft`, { stdio: 'inherit' });
    }
  } else {
    console.log(`⚠️  RELEASE_NOTES.md not found. Using fallback.`);
  execSync(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes "App update release" --draft`, { stdio: 'inherit' });
  }
  
  // 4. Upload bundle
  console.log('\n📦 Step 4: Uploading bundle...');
  execSync(`gh release upload v${pkg.version} bundles/app-bundle.zip --repo Deartaj92/GrowMore --clobber`, { stdio: 'inherit' });
  
  // 5. Publish release
  console.log('\n📦 Step 5: Publishing release...');
  execSync(`gh release edit v${pkg.version} --repo Deartaj92/GrowMore --draft=false`, { stdio: 'inherit' });
  
  console.log('\n✅ Update deployed successfully!');
  console.log(`\nView release: https://github.com/Deartaj92/GrowMore/releases/tag/v${pkg.version}`);
} catch (error) {
  console.error('\n❌ Error deploying update:', error.message);
  process.exit(1);
}
