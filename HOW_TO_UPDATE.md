# How to Deploy Updates

## 🚀 Simple Update Process

### Step 1: Make Your Changes
Edit your code normally, then:

### Step 2: Bump Version (Optional)
If you want to bump the version number, edit `package.json`:
```json
"version": "1.0.4"  // Change this
```

### Step 3: Deploy Update

#### For Mobile (APK):
```bash
npm run update
```

#### For Desktop (Windows Installer):
```bash
npm run update:desktop
```

That's it! The script will automatically:
- ✅ Build your app
- ✅ Create the installer/APK
- ✅ Upload to GitHub
- ✅ Create a release (if it doesn't exist)
- ✅ Publish it

## 📱 What Happens Next?

### Mobile Users:
1. See a notification when they open the app (checks for updates automatically)
2. Click "Check for Updates" in their profile to manually check
3. Download the update with progress bar
4. Restart the app to apply the update

### Desktop Users:
1. See a notification when they open the app (checks for updates automatically)
2. Click "Check for Updates" in their profile to manually check
3. Download the installer (.exe file)
4. Run the installer (it will automatically replace the old version)
5. Launch Grow More again to use the updated version

## ⚙️ Need More Details?

- **View your releases**: https://github.com/Deartaj92/GrowMore/releases
- **Check update status**: Users can click their profile → "Check for Updates"

---
**For mobile updates: `npm run update`**  
**For desktop updates: `npm run update:desktop`** 🎉

