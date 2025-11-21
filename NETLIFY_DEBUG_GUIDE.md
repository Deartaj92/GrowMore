# Debugging White Screen Issues on Netlify

## What We've Fixed

1. **Error Boundary**: Added global error boundary to catch and display errors gracefully
2. **Chunk Loading Errors**: Added automatic retry and reload for failed chunk loads
3. **Build Optimization**: 
   - Increased Node memory limit to 4GB
   - Disabled source maps in production
4. **Theme Context Fix**: Removed theme dependency from ProtectedRoute loading state

## How to Debug Further

### 1. Check Browser Console
After deploying, if you still see white screens:
1. Open your Netlify site
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Navigate to the problematic page
5. Look for error messages (especially red errors)

### 2. Check Network Tab
1. Open Developer Tools (`F12`)
2. Go to the **Network** tab
3. Refresh the page
4. Look for:
   - Failed requests (shown in red)
   - 404 errors for chunk files
   - CORS errors

### 3. Common Issues and Solutions

#### Issue: "ChunkLoadError" or "Loading chunk X failed"
**Solution**: The automatic reload should handle this, but if it persists:
- Clear Netlify cache and redeploy
- Check if your build is completing successfully

#### Issue: White screen only on specific pages
**Possible causes**:
- Large component size
- Missing dependencies
- Lazy loading issues

**Solution**: Check the specific component for:
- Very large imports
- Circular dependencies
- Missing error handling

#### Issue: Works locally but not on Netlify
**Possible causes**:
- Environment variables not set
- Build optimization issues
- Case-sensitive file paths (Netlify uses Linux)

### 4. Netlify-Specific Debugging

#### Clear Cache and Redeploy
```bash
# In Netlify dashboard:
# Deploys > Trigger deploy > Clear cache and deploy site
```

#### Check Build Logs
1. Go to Netlify dashboard
2. Click on your site
3. Go to **Deploys**
4. Click on the latest deploy
5. Check the build logs for warnings or errors

#### Enable Deploy Previews
Deploy previews can help you test before going live:
1. Make changes in a new branch
2. Push to GitHub
3. Netlify will create a preview deploy
4. Test the preview URL

### 5. Quick Fixes to Try

#### Force a Clean Build
In `netlify.toml`, you can add:
```toml
[build]
  command = "rm -rf node_modules && npm install && npm run build"
```

#### Check for Case Sensitivity
Windows is case-insensitive, but Netlify (Linux) is case-sensitive.
Make sure all imports match the actual file names exactly.

### 6. Getting Error Details

If you see a white screen, you can add this to your browser console:
```javascript
// Run this in browser console to see what's failing
window.addEventListener('error', (e) => {
  console.error('Global error:', e);
  alert('Error: ' + e.message);
});
```

## Contact Support

If issues persist after trying these steps:
1. Take screenshots of console errors
2. Copy the exact error messages
3. Note which specific pages are affected
4. Check if it's browser-specific (try Chrome, Firefox, Safari)

## Monitoring

After deployment, monitor:
- Netlify Analytics (if enabled)
- Browser console for errors
- Network requests for failed chunks
- Performance metrics

## Prevention

To prevent future issues:
1. Test builds locally with `npm run build && npx serve -s build`
2. Keep dependencies updated
3. Monitor bundle size
4. Use code splitting wisely
5. Test on multiple browsers before deploying
