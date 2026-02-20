#!/usr/bin/env node

/**
 * GitHub Updates Setup Script
 * This script helps you configure GitHub for app updates
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupGitHub() {
  console.log('\n🚀 GitHub Updates Setup\n');
  console.log('This script will help you configure GitHub for app updates.\n');

  // Get GitHub repository information
  const username = await question('Enter your GitHub username: ');
  const repoName = await question('Enter your repository name: ');
  
  if (!username || !repoName) {
    console.error('❌ Username and repository name are required!');
    rl.close();
    process.exit(1);
  }

  const repoPath = `${username}/${repoName}`;
  
  console.log(`\n📦 Repository: ${repoPath}\n`);

  // Files to update
  const filesToUpdate = [
    {
      path: 'capacitor.config.ts',
      searchPattern: /YOUR_USERNAME\/YOUR_REPO/g,
      replacement: repoPath,
      description: 'Capacitor configuration'
    },
    {
      path: 'src/services/updateService.ts',
      searchPattern: /YOUR_USERNAME\/YOUR_REPO/g,
      replacement: repoPath,
      description: 'Update service'
    },
    {
      path: 'scripts/deploy-update.bat',
      searchPattern: /set REPO_OWNER=YOUR_USERNAME/g,
      replacement: `set REPO_OWNER=${username}`,
      description: 'Windows deployment script'
    },
    {
      path: 'scripts/deploy-update.bat',
      searchPattern: /set REPO_NAME=YOUR_REPO/g,
      replacement: `set REPO_NAME=${repoName}`,
      description: 'Windows deployment script'
    },
    {
      path: 'scripts/deploy-update.sh',
      searchPattern: /REPO_OWNER="YOUR_USERNAME"/g,
      replacement: `REPO_OWNER="${username}"`,
      description: 'Linux/Mac deployment script'
    },
    {
      path: 'scripts/deploy-update.sh',
      searchPattern: /REPO_NAME="YOUR_REPO"/g,
      replacement: `REPO_NAME="${repoName}"`,
      description: 'Linux/Mac deployment script'
    }
  ];

  console.log('📝 Updating configuration files...\n');

  let updatedCount = 0;
  for (const fileInfo of filesToUpdate) {
    try {
      const filePath = path.join(process.cwd(), fileInfo.path);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${fileInfo.path}`);
        continue;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes('YOUR_USERNAME') || content.includes('YOUR_REPO')) {
        content = content.replace(fileInfo.searchPattern, fileInfo.replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${fileInfo.path}`);
        updatedCount++;
      } else {
        console.log(`✓  Already configured: ${fileInfo.path}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${fileInfo.path}:`, error.message);
    }
  }

  console.log(`\n✨ Configuration complete! Updated ${updatedCount} file(s).\n`);

  // Check GitHub CLI
  const checkGH = await question('Do you have GitHub CLI (gh) installed? (y/n): ');
  
  if (checkGH.toLowerCase() === 'n' || checkGH.toLowerCase() === 'no') {
    console.log('\n📥 Installing GitHub CLI...');
    console.log('Visit: https://cli.github.com/');
    console.log('Or run: winget install GitHub.cli (Windows)\n');
    
    const installNow = await question('Have you installed it? (y/n): ');
    if (installNow.toLowerCase() === 'n' || installNow.toLowerCase() === 'no') {
      console.log('\n⚠️  Please install GitHub CLI before continuing.');
      rl.close();
      process.exit(0);
    }
  }

  // Authenticate GitHub CLI
  console.log('\n🔐 Authenticating with GitHub...');
  console.log('If you haven\'t authenticated yet, run: gh auth login\n');
  
  const { execSync } = require('child_process');
  
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    console.log('✅ GitHub CLI is authenticated!\n');
  } catch (error) {
    console.log('⚠️  GitHub CLI not authenticated. Please run: gh auth login\n');
  }

  // Verify repository exists
  console.log(`🔍 Verifying repository exists: ${repoPath}...`);
  
  try {
    const response = await fetch(`https://api.github.com/repos/${repoPath}`);
    if (response.ok) {
      const repo = await response.json();
      console.log(`✅ Repository found: ${repo.full_name}`);
      console.log(`   Description: ${repo.description || 'No description'}`);
      console.log(`   URL: ${repo.html_url}\n`);
    } else if (response.status === 404) {
      console.log(`⚠️  Repository not found: ${repoPath}`);
      console.log('   Make sure the repository exists and is accessible.\n');
    } else {
      console.log(`⚠️  Could not verify repository. Status: ${response.status}\n`);
    }
  } catch (error) {
    console.log('⚠️  Could not verify repository. Make sure you have internet connection.\n');
  }

  // Final instructions
  console.log('🎉 Setup Complete!\n');
  console.log('📋 Next Steps:');
  console.log('1. Make sure your repository is initialized: git init');
  console.log('2. Add remote: git remote add origin https://github.com/' + repoPath + '.git');
  console.log('3. Push your code: git push -u origin main');
  console.log('4. To deploy an update, run: npm run deploy:update');
  console.log('\n📖 For more information, see: UPDATE_SETUP_GUIDE.md\n');

  rl.close();
}

// Run setup
setupGitHub().catch(error => {
  console.error('❌ Setup failed:', error);
  rl.close();
  process.exit(1);
});


