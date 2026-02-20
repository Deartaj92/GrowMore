const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');

process.env.PATH += ';C\\Program Files\\GitHub CLI';

function run(cmd, retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      execSync(cmd, { 
        stdio: 'inherit',
        timeout: 300000 // 5 minutes timeout
      });
      return; // Success
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const isNetworkError = error.message && (
        error.message.includes('TLS handshake timeout') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT')
      );
      
      if (isNetworkError && !isLastAttempt) {
        const waitTime = delay * attempt; // Exponential backoff
        console.log(`\n⚠️  Network error (attempt ${attempt}/${retries}). Retrying in ${waitTime/1000}s...`);
        console.log(`   Error: ${error.message}`);
        // Blocking sleep using child_process
        try {
          execSync(`timeout /t ${Math.ceil(waitTime/1000)} /nobreak >nul 2>&1`, { shell: true });
        } catch {
          // Fallback: use Node's setTimeout in a blocking way
          const start = Date.now();
          while (Date.now() - start < waitTime) {
            // Busy wait (not ideal but works synchronously)
          }
        }
        continue;
      }
      
      // If it's the last attempt or not a network error, throw
      throw error;
    }
  }
}

try {
  const distDir = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distDir)) {
    throw new Error('Dist directory not found. Please build the installer first using: npm run electron-pack-win-fix');
  }

  // Find the installer file (Grow More Setup X.X.X.exe)
  const installerFiles = fs.readdirSync(distDir)
    .filter(f => f.toLowerCase().endsWith('.exe') && f.includes('Setup'))
    .map(f => ({ 
      name: f, 
      full: path.join(distDir, f), 
      size: fs.statSync(path.join(distDir, f)).size 
    }));

  if (installerFiles.length === 0) {
    throw new Error('No installer .exe files found in dist directory.\n\nPlease build the installer first:\nnpm run electron-pack-win-fix');
  }

  // Use the largest .exe file (should be the installer)
  const installerFile = installerFiles.sort((a, b) => b.size - a.size)[0];
  const targetName = `GrowMore-Setup-v${pkg.version}.exe`;
  
  console.log('📦 Found installer:', installerFile.name);
  console.log('   Size:', Math.round(installerFile.size / 1024 / 1024) + 'MB');
  console.log('   Will be uploaded as:', targetName);
  
  // Copy installer to a temporary location with the correct name
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const renamedInstallerPath = path.join(tempDir, targetName);
  
  console.log('\n📋 Copying installer to temporary location...');
  fs.copyFileSync(installerFile.full, renamedInstallerPath);
  console.log(`   Copied to: ${renamedInstallerPath}`);
  
  console.log(`\n🔎 Ensuring GitHub release v${pkg.version} exists...`);
  try {
    run(`gh release view v${pkg.version} --repo Deartaj92/GrowMore`);
    console.log('   ✓ Release already exists.');
  } catch (e) {
    console.log(`   ⚠️  Release v${pkg.version} not found. Creating it...`);
    
    // Read release notes from RELEASE_NOTES.md
    const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
    if (fs.existsSync(releaseNotesPath)) {
      try {
        const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8').trim();
        if (releaseNotes) {
          // Use --notes-file flag for better handling of multi-line text
          run(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes-file "${releaseNotesPath}"`);
        } else {
          // Fallback if file is empty
          run(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes "* Fixes and Improvements"`);
        }
      } catch (err) {
        console.log(`   ⚠️  Could not read RELEASE_NOTES.md: ${err.message}. Using fallback.`);
        run(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes "* Fixes and Improvements"`);
      }
    } else {
      console.log(`   ⚠️  RELEASE_NOTES.md not found. Using fallback.`);
      run(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes "* Fixes and Improvements"`);
    }
    console.log('   ✓ Release created.');
  }

  console.log(`\n📤 Uploading installer to GitHub release as ${targetName}...`);
  console.log('   This may take a while depending on your internet connection...');
  run(`gh release upload v${pkg.version} "${renamedInstallerPath}" --repo Deartaj92/GrowMore --clobber`, 5, 3000);
  
  // Clean up temporary file
  fs.unlinkSync(renamedInstallerPath);
  console.log('   ✓ Temporary file cleaned up.');
  
  console.log('\n✅ Installer uploaded successfully!');
  console.log('   Release URL: https://github.com/Deartaj92/GrowMore/releases/tag/v' + pkg.version);
  console.log('\n💡 Desktop users will be notified of this update automatically.');
} catch (e) {
  console.error('\n❌ Failed:', e.message);
  if (e.message.includes('dist directory not found') || e.message.includes('No installer')) {
    console.error('\n💡 Tip: Build the installer first with: npm run electron-pack-win-fix');
  }
  process.exit(1);
}

