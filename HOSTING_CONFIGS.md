# Hosting Configuration Files

This project includes configuration files for multiple hosting platforms. You can keep all of them in your repository - each platform will only use its own config file and ignore the others.

## 📁 Config Files Overview

| File | Platform | Status |
|------|----------|--------|
| `netlify.toml` | Netlify | ✅ Currently Active |
| `vercel.json` | Vercel | ⚪ Ready to use |
| `firebase.json` | Firebase Hosting | ⚪ Ready to use |
| `render.yaml` | Render.com | ⚪ Ready to use |
| `staticwebapp.config.json` | Azure Static Web Apps | ⚪ Ready to use |
| `public/.htaccess` | Apache Servers | ⚪ Ready to use |

## 🚀 Quick Deploy Guide

### Currently Deployed: Netlify
Your app is currently deployed on Netlify. The configuration is in `netlify.toml`.

### Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Done! Vercel will use `vercel.json`

### Deploy to Firebase
1. Install Firebase CLI: `npm i -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`
5. Done! Firebase will use `firebase.json`

### Deploy to Render
1. Connect your GitHub repo to Render
2. Render will automatically detect `render.yaml`
3. Click "Create Web Service"
4. Done!

### Deploy to Azure Static Web Apps
1. Go to Azure Portal
2. Create a Static Web App
3. Connect your GitHub repo
4. Azure will use `staticwebapp.config.json`
5. Done!

### Deploy to Apache Server (Traditional Hosting)
1. Build your app: `npm run build`
2. Upload the `build` folder to your server
3. The `.htaccess` file will be included automatically
4. Done!

## ⚙️ What Each Config Does

All config files provide:
- ✅ **SPA Routing**: Redirects all routes to `index.html`
- ✅ **Security Headers**: X-Frame-Options, X-XSS-Protection, etc.
- ✅ **Caching**: Static assets cached for 1 year
- ✅ **No HTML Caching**: Fresh HTML on every visit

## 🔄 Switching Platforms

To switch from one platform to another:

1. **Build your app**: `npm run build`
2. **Deploy to new platform** (see guides above)
3. **Update DNS** (if using custom domain)
4. **Done!**

The config files ensure your app works the same way on all platforms.

## 📝 Notes

- All config files can coexist without conflicts
- Each platform reads only its own config file
- You can deploy to multiple platforms simultaneously
- All configs follow the same principles (SPA routing + security)

## 🆘 Troubleshooting

If you encounter issues on any platform:

1. Check that the build completes successfully
2. Verify the `homepage` in `package.json` is set to `"/"`
3. Clear the platform's cache and redeploy
4. Check the platform's build logs for errors

## 📚 More Information

- [Netlify Docs](https://docs.netlify.com/)
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Render Docs](https://render.com/docs)
- [Azure Static Web Apps Docs](https://docs.microsoft.com/en-us/azure/static-web-apps/)
