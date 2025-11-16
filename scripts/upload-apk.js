const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');

// Ensure execSync is available for ensure-latest-code

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
  // Ensure latest source code is used
  console.log('🔍 Ensuring latest source code...');
  try {
    execSync('node scripts/ensure-latest-code.js --no-pull', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Warning: Could not ensure latest code, continuing anyway...');
  }

  // Verify signing env vars exist to ensure a signed APK
  const missing = ['GM_KEYSTORE_PASSWORD', 'GM_KEY_ALIAS', 'GM_KEY_PASSWORD'].filter(k => !process.env[k]);
  if (missing.length) {
    console.log('⚠️  Missing signing environment variables:', missing.join(', '));
    console.log('   Set them before building to produce a signed release APK.');
  }
  console.log('📦 Building Android APK (release)...');
  run('npm run build');
  run('npx cap sync android');
  const androidDir = path.join(__dirname, '..', 'android');
  run(`powershell -Command "& { cd '${androidDir.replace(/\\/g, '/')}'; ./gradlew.bat assembleRelease }"`);

  const releaseDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release');
  if (!fs.existsSync(releaseDir)) {
    throw new Error('Release APK directory not found at ' + releaseDir);
  }

  // Find any .apk in the release output (handles names like app-release.apk, app-release-unsigned.apk, etc.)
  const candidates = fs.readdirSync(releaseDir)
    .filter(f => f.toLowerCase().endsWith('.apk'))
    .map(f => ({ name: f, full: path.join(releaseDir, f), size: fs.statSync(path.join(releaseDir, f)).size }));

  if (candidates.length === 0) {
    throw new Error('No APK files found in ' + releaseDir);
  }

  // Prefer signed release if present; otherwise pick the largest file
  const preferred = candidates.find(c => /app-release\.apk$/i.test(c.name))
    || candidates.find(c => /release\.apk$/i.test(c.name))
    || candidates.sort((a,b) => b.size - a.size)[0];

  const apkPath = preferred.full;
  console.log('Found APK:', preferred.name, Math.round(preferred.size/1024)+'KB');

  const targetName = `GrowMore-v${pkg.version}.apk`;
  
  // Copy APK to a temporary location with the correct name
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const renamedApkPath = path.join(tempDir, targetName);
  fs.copyFileSync(apkPath, renamedApkPath);
  console.log(`Renamed APK to: ${targetName}`);
  
  console.log(`\n🔎 Ensuring GitHub release v${pkg.version} exists...`);
  try {
    run(`gh release view v${pkg.version} --repo Deartaj92/GrowMore`);
  } catch (e) {
    console.log(`⚠️  Release v${pkg.version} not found. Creating it...`);
    
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
        console.log(`⚠️  Could not read RELEASE_NOTES.md: ${err.message}. Using fallback.`);
        run(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes "* Fixes and Improvements"`);
      }
    } else {
      console.log(`⚠️  RELEASE_NOTES.md not found. Using fallback.`);
    run(`gh release create v${pkg.version} --repo Deartaj92/GrowMore --title "Release ${pkg.version}" --notes "* Fixes and Improvements"`);
    }
  }

  console.log(`\n📤 Uploading APK to GitHub release as ${targetName} ...`);
  console.log('   This may take a while depending on your internet connection...');
  run(`gh release upload v${pkg.version} "${renamedApkPath}" --repo Deartaj92/GrowMore --clobber`, 5, 3000);
  
  // Clean up temporary file
  fs.unlinkSync(renamedApkPath);
  
  console.log('\n✅ APK uploaded. Release URL: https://github.com/Deartaj92/GrowMore/releases/tag/v' + pkg.version);
} catch (e) {
  console.error('❌ Failed:', e.message);
  process.exit(1);
}


