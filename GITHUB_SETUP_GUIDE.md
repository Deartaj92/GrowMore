# GitHub Setup Guide for App Updates

This guide will walk you through setting up GitHub for automatic app updates.

## 🚀 Quick Setup (Recommended)

### Option 1: Automated Setup (Windows PowerShell)
```powershell
npm run setup:github:ps
```

### Option 2: Automated Setup (Node.js)
```bash
npm run setup:github
```

The script will ask for:
- Your GitHub username
- Your repository name

It will automatically update all configuration files!

---

## 📋 Manual Setup Steps

If you prefer to set up manually, follow these steps:

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Enter repository name (e.g., `school-management-app`)
4. Choose **Public** or **Private** (Private repositories require authentication)
5. Click **"Create repository"**

### Step 2: Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 3: Install GitHub CLI

**Windows:**
```powershell
winget install GitHub.cli
```

**Or download from:** https://cli.github.com/

### Step 4: Authenticate GitHub CLI

```bash
gh auth login
```

Follow the prompts:
- Choose **GitHub.com**
- Choose **HTTPS** (recommended) or **SSH**
- Authenticate through browser or paste token

### Step 5: Update Configuration Files

Update these files with your repository details:

#### 1. `capacitor.config.ts`
```typescript
updateUrl: 'https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/releases/latest'
```

#### 2. `src/services/updateService.ts`
```typescript
private readonly GITHUB_REPO = 'YOUR_USERNAME/YOUR_REPO';
```

#### 3. `scripts/deploy-update.bat`
```batch
set REPO_OWNER=YOUR_USERNAME
set REPO_NAME=YOUR_REPO
```

#### 4. `scripts/deploy-update.sh`
```bash
REPO_OWNER="YOUR_USERNAME"
REPO_NAME="YOUR_REPO"
```

**Replace:**
- `YOUR_USERNAME` → Your GitHub username
- `YOUR_REPO` → Your repository name

---

## ✅ Verify Setup

### Test Repository Access
```bash
gh repo view YOUR_USERNAME/YOUR_REPO
```

### Test API Access
Open in browser:
```
https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO
```

Should return repository information (JSON).

---

## 🚀 Deploy Your First Update

### 1. Make Changes to Your Code

### 2. Update Version in `package.json`
```json
{
  "version": "1.0.4"  // Increment version number
}
```

### 3. Deploy Update
```bash
npm run deploy:update
```

This will:
- Build your app
- Create a bundle
- Create a GitHub release
- Upload the bundle as a release asset

### 4. Test Update Notification

Users will be notified when they:
- Start the app (automatic check)
- Click "Check for Updates" in profile menu

---

## 📱 How Updates Work

1. **App checks GitHub** on startup (after 2 seconds)
2. **Compares versions** with latest release
3. **Shows notification** if update available
4. **User clicks download** → Progress bar appears
5. **Download completes** → Install prompt shows
6. **User confirms** → App restarts with new version

---

## 🔧 Troubleshooting

### "Repository not found"
- Verify repository name and username are correct
- Check if repository is private (may need authentication)
- Verify you have access to the repository

### "GitHub CLI not authenticated"
```bash
gh auth login
gh auth refresh
```

### "Update check fails"
- Check internet connection
- Verify repository is accessible
- Check browser console for errors

### "No bundle asset found"
- Make sure deployment script completes successfully
- Verify bundle file is uploaded in GitHub release
- Check bundle asset name matches `app-bundle.zip`

---

## 📝 Manual Release (Alternative)

If automated script fails:

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Create bundle:**
   - Zip the `build` folder contents
   - Name it `app-bundle.zip`

3. **Create GitHub Release:**
   - Go to your GitHub repository
   - Click **"Releases"** → **"Create a new release"**
   - Tag version: `v1.0.4` (match package.json version)
   - Release title: `Release v1.0.4`
   - Description: Your release notes
   - Upload `app-bundle.zip` as an asset
   - Click **"Publish release"**

---

## 🔐 Security Notes

- **Private repositories** require authentication
- Updates are downloaded from GitHub (trusted source)
- Bundle integrity is verified by Capacitor
- User has control over when to install updates

---

## 📚 Additional Resources

- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Capacitor Live Updates](https://capacitorjs.com/docs/guides/live-updates)

---

## ✨ Next Steps

After setup:
1. ✅ Test update system with a sample release
2. ✅ Monitor user adoption of updates
3. ✅ Set up automated deployments (CI/CD)
4. ✅ Document your release process

Your app now has professional update management! 🎉

