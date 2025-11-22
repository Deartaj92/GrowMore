const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to read GitHub token from .github_token.txt
function getGitHubToken() {
  try {
    const tokenPath = path.join(__dirname, '..', '.github_token.txt');
    if (fs.existsSync(tokenPath)) {
      const token = fs.readFileSync(tokenPath, 'utf8').trim();
      if (token) {
        return token;
      }
    }
  } catch (e) {
    console.log('Could not read GitHub token file:', e.message);
  }
  return null;
}

// Read package.json version
const pkg = require('../package.json');

// Prepare build environment
const githubToken = getGitHubToken();
const buildEnv = {
  ...process.env,
  REACT_APP_VERSION: pkg.version,
  PUBLIC_URL: '.'
};

// Add GitHub token if available
if (githubToken) {
  buildEnv.REACT_APP_GITHUB_TOKEN = githubToken;
  console.log('✅ GitHub token found, will use authenticated API requests (5,000 req/hour)');
} else {
  console.log('⚠️  No GitHub token found, using unauthenticated API requests (60 req/hour limit)');
}

console.log('🔨 Building React app...');
try {
  // Use environment variables directly instead of command line (safer and more reliable)
  // This ensures the token is properly passed even with special characters
  const buildEnvWithToken = {
    ...process.env,
    REACT_APP_VERSION: pkg.version,
    PUBLIC_URL: '.'
  };
  
  // Add token to environment if available
  if (githubToken) {
    buildEnvWithToken.REACT_APP_GITHUB_TOKEN = githubToken;
  }
  
  // Run react-scripts build directly with environment variables
  // This bypasses npm scripts to ensure our env vars are used
  const reactScriptsPath = path.join(__dirname, '..', 'node_modules', '.bin', 'react-scripts');
  const reactScriptsCommand = process.platform === 'win32' 
    ? reactScriptsPath + '.cmd'
    : reactScriptsPath;
  
  execSync(`${reactScriptsCommand} build`, { 
    stdio: 'inherit', 
    env: buildEnvWithToken,
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

