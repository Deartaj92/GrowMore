# GitHub-Based App Updates Setup Guide

This guide will help you set up automatic app updates using GitHub Releases.

## Prerequisites

1. **GitHub CLI** - Install from [cli.github.com](https://cli.github.com/)
2. **GitHub Repository** - Your app should be in a GitHub repository
3. **GitHub Authentication** - Run `gh auth login` to authenticate

## Setup Steps

### 1. Configure Your Repository Details

Update these files with your actual repository information:

**capacitor.config.ts:**
```typescript
updateUrl: 'https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/releases/latest'
```

**src/services/updateService.ts:**
```typescript
private readonly GITHUB_REPO = 'YOUR_USERNAME/YOUR_REPO';
```

**scripts/deploy-update.bat:**
```batch
set REPO_OWNER=YOUR_USERNAME
set REPO_NAME=YOUR_REPO
```

### 2. Test the Update System

1. **Build and test locally:**
   ```bash
   npm run build
   npm run android
   ```

2. **Create a test release:**
   ```bash
   npm run deploy:update
   ```

3. **Check if users get notified** when you open the app

### 3. How Updates Work

1. **App checks for updates** on startup
2. **Compares current version** with latest GitHub release
3. **Shows notification** if update available
4. **User clicks download** → Progress bar appears
5. **Download completes** → Install prompt shows
6. **User confirms** → App restarts with new version

## Deployment Process

### For New Updates:

1. **Make your changes** to the code
2. **Update version** in `package.json`
3. **Run deployment script:**
   ```bash
   npm run deploy:update
   ```
4. **Users automatically get notified** of the update

### Manual Release (Alternative):

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Create bundle:**
   ```bash
   npx cap live-updates bundle
   ```

3. **Create GitHub release manually:**
   - Go to your GitHub repository
   - Click "Releases" → "Create a new release"
   - Upload the bundle file as an asset
   - Publish the release

## File Structure

```
your-project/
├── src/
│   ├── services/
│   │   └── updateService.ts          # Update logic
│   └── components/
│       └── UpdateNotification.tsx    # Update UI
├── scripts/
│   ├── deploy-update.bat            # Windows deployment
│   └── deploy-update.sh             # Linux/Mac deployment
├── capacitor.config.ts              # Capacitor configuration
└── package.json                     # Scripts and version
```

## Troubleshooting

### Update Not Showing:
- Check if GitHub CLI is authenticated: `gh auth status`
- Verify repository name in configuration files
- Check if release was created successfully
- Ensure bundle asset name matches `BUNDLE_ASSET_NAME`

### Download Fails:
- Check internet connection
- Verify GitHub release asset is accessible
- Check browser console for errors

### App Doesn't Restart:
- Ensure Capacitor Live Updates plugin is properly installed
- Check if app has necessary permissions

## Security Notes

- Updates are downloaded from GitHub (trusted source)
- Bundle integrity is verified by Capacitor
- User has control over when to install updates
- No automatic installation without user consent

## Benefits

✅ **No App Store Required** - Direct updates to users
✅ **User Control** - Download now or later
✅ **Progress Tracking** - Real-time download progress
✅ **Release Notes** - Users see what's new
✅ **Automatic Notifications** - Users know when updates are available
✅ **GitHub Integration** - Leverages existing GitHub workflow

## Next Steps

1. **Replace placeholder values** with your actual repository details
2. **Test the system** with a sample release
3. **Deploy your first update** using the deployment script
4. **Monitor user adoption** of updates

Your app now has a complete update system! 🚀

