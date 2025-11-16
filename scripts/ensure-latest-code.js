const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Ensures the latest source code is used before building
 * This script:
 * 1. Checks for uncommitted changes
 * 2. Optionally commits them (if flag is set)
 * 3. Pulls latest from remote (if git is used)
 * 4. Cleans build artifacts
 * 5. Ensures dependencies are up to date
 */

function runCommand(cmd, options = {}) {
  try {
    execSync(cmd, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return true;
  } catch (error) {
    if (!options.ignoreErrors) {
      console.error(`Error running: ${cmd}`);
      console.error(error.message);
    }
    return false;
  }
}

function isGitRepo() {
  return fs.existsSync(path.join(process.cwd(), '.git'));
}

function hasUncommittedChanges() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function ensureLatestCode(options = {}) {
  const {
    autoCommit = false,
    commitMessage = 'Auto-commit before build',
    pullLatest = true,
    cleanBuild = true,
    updateDeps = false
  } = options;

  console.log('🔍 Ensuring latest source code is used...\n');

  // Check if this is a git repository
  if (!isGitRepo()) {
    console.log('⚠️  Not a git repository. Skipping git checks.');
  } else {
    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      console.log('⚠️  Uncommitted changes detected!');
      
      if (autoCommit) {
        console.log('📝 Auto-committing changes...');
        runCommand(`git add -A`);
        runCommand(`git commit -m "${commitMessage}"`);
        console.log('✅ Changes committed.\n');
      } else {
        console.log('❌ Please commit or stash your changes before building.');
        console.log('   Or run with --auto-commit flag to auto-commit changes.\n');
        process.exit(1);
      }
    } else {
      console.log('✅ No uncommitted changes.\n');
    }

    // Pull latest from remote
    if (pullLatest) {
      const branch = getCurrentBranch();
      if (branch) {
        console.log(`📥 Pulling latest from origin/${branch}...`);
        if (runCommand(`git pull origin ${branch}`, { ignoreErrors: true })) {
          console.log('✅ Latest code pulled.\n');
        } else {
          console.log('⚠️  Could not pull latest code (this is okay if working offline).\n');
        }
      }
    }
  }

  // Clean build artifacts
  if (cleanBuild) {
    console.log('🧹 Cleaning build artifacts...');
    const buildDirs = ['build', 'dist', 'node_modules/.cache'];
    
    buildDirs.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`   ✓ Removed ${dir}`);
        } catch (error) {
          console.log(`   ⚠️  Could not remove ${dir}: ${error.message}`);
        }
      }
    });
    console.log('✅ Build artifacts cleaned.\n');
  }

  // Update dependencies
  if (updateDeps) {
    console.log('📦 Updating dependencies...');
    runCommand('npm install', { ignoreErrors: true });
    console.log('✅ Dependencies updated.\n');
  }

  console.log('✅ Latest source code ensured!\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  autoCommit: args.includes('--auto-commit') || args.includes('-a'),
  commitMessage: args.find(arg => arg.startsWith('--message='))?.split('=')[1] || 
                 args.find(arg => arg.startsWith('-m='))?.split('=')[1] || 
                 'Auto-commit before build',
  pullLatest: !args.includes('--no-pull'),
  cleanBuild: !args.includes('--no-clean'),
  updateDeps: args.includes('--update-deps') || args.includes('-u')
};

ensureLatestCode(options);

