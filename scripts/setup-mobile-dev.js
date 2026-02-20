const { execSync } = require('child_process');
const os = require('os');

// Get your computer's IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const port = 3000;

console.log('🚀 Setting up mobile development environment...');
console.log(`📱 Your computer's IP: ${localIP}`);
console.log(`🌐 Development server will run on: http://${localIP}:${port}`);

// Update capacitor.config.ts with live reload settings
const fs = require('fs');
const configPath = 'capacitor.config.ts';

let configContent = fs.readFileSync(configPath, 'utf8');

// Replace the commented live reload configuration
const newConfig = configContent.replace(
  /\/\/ url: 'http:\/\/192\.168\.1\.100:3000', \/\/ Replace with your computer's IP\n\s*\/\/ cleartext: true/,
  `url: 'http://${localIP}:${port}',
    cleartext: true`
);

fs.writeFileSync(configPath, newConfig);

console.log('✅ Updated capacitor.config.ts with live reload settings');
console.log('');
console.log('📋 Next steps:');
console.log('1. Run: npm run start:mobile');
console.log('2. In another terminal, run: npm run sync:android');
console.log('3. Run: npm run open:android');
console.log('4. Install the app on your device');
console.log('5. Make sure your phone and computer are on the same WiFi network');
console.log('');
console.log('🔄 Changes will now reload automatically on your mobile device!');
