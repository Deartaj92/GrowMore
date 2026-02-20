const fs = require('fs');
const path = require('path');

// Copy electron.js and preload.js from public to build folder
const publicDir = path.join(__dirname, '..', 'public');
const buildDir = path.join(__dirname, '..', 'build');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
    console.error('Build directory does not exist. Run "npm run build" first.');
    process.exit(1);
}

// Copy electron.js
const electronSrc = path.join(publicDir, 'electron.js');
const electronDest = path.join(buildDir, 'electron.js');

if (fs.existsSync(electronSrc)) {
    fs.copyFileSync(electronSrc, electronDest);
    console.log('✓ Copied electron.js to build folder');
} else {
    console.error('❌ electron.js not found in public folder');
    process.exit(1);
}

// Copy preload.js
const preloadSrc = path.join(publicDir, 'preload.js');
const preloadDest = path.join(buildDir, 'preload.js');

if (fs.existsSync(preloadSrc)) {
    fs.copyFileSync(preloadSrc, preloadDest);
    console.log('✓ Copied preload.js to build folder');
} else {
    console.error('❌ preload.js not found in public folder');
    process.exit(1);
}

console.log('✅ Electron files copied successfully');
