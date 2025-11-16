const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: true
    },
    icon: isDev ? path.join(__dirname, '../assets/icon.ico') : path.join(__dirname, '../assets/icon.ico'),
    frame: false,
    titleBarStyle: 'hidden'
  });

  // Maximize the window on startup
  mainWindow.maximize();

  // Disable the default menu bar
  Menu.setApplicationMenu(null);

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'index.html')}`;

  mainWindow.loadURL(startUrl);

  // Log the URL being loaded
  console.log('Loading URL:', startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
  });

  // Handle loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    if (!isDev) {
      mainWindow.loadURL(`file://${path.join(__dirname, 'index.html')}`);
    }
  });


}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});



ipcMain.on('window-minimize', () => {
  console.log('Minimize button clicked');
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-maximize', () => {
  console.log('Maximize button clicked');
  if (mainWindow) mainWindow.maximize();
});
ipcMain.on('window-unmaximize', () => {
  console.log('Unmaximize button clicked');
  if (mainWindow) mainWindow.unmaximize();
});
ipcMain.on('window-close', () => {
  console.log('Close button clicked');
  if (mainWindow) {
    mainWindow.destroy();
  }
});
ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Download file with progress tracking
ipcMain.handle('download-file', async (event, url, fileName) => {
  return new Promise((resolve, reject) => {
    // Download directly to Downloads folder (default Windows location)
    const filePath = path.join(app.getPath('downloads'), fileName);
      const file = fs.createWriteStream(filePath);
      let downloadedBytes = 0;
      let totalBytes = 0;

      // Determine if http or https
      const urlObj = new URL(url);
      const httpModule = urlObj.protocol === 'https:' ? require('https') : require('http');

      const requestOptions = {
        headers: {
          'User-Agent': 'GrowMore-Updater/1.0'
        }
      };

      const req = httpModule.get(url, requestOptions, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Resolve relative redirects
            const absoluteUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).href;
            file.close();
            // Delete file if it exists
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (e) {
                // Ignore deletion errors
              }
            }
            // Retry with new URL
            const redirectUrlObj = new URL(absoluteUrl);
            const redirectHttpModule = redirectUrlObj.protocol === 'https:' ? require('https') : require('http');
            redirectHttpModule.get(absoluteUrl, requestOptions, handleDownload).on('error', reject);
            return;
          }
        }
        handleDownload(response);
      });

      req.on('error', (err) => {
        file.close();
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
        reject(err);
      });

      function handleDownload(response) {
        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (e) {
              // Ignore deletion errors
            }
          }
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        
        // Send initial progress update (0%)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            progress: 0,
            downloadedBytes: 0,
            totalBytes: totalBytes,
            fileName
          });
        }
        
        // Track bytes since last update to send progress every 10KB
        let bytesSinceLastUpdate = 0;
        const UPDATE_THRESHOLD = 10 * 1024; // 10KB
        
        // Manually handle data chunks instead of using pipe to track progress
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          bytesSinceLastUpdate += chunk.length;
          
          // Write chunk to file
          if (!file.write(chunk)) {
            // If write returns false, pause until drain event
            response.pause();
            file.once('drain', () => {
              response.resume();
            });
          }
          
          // Send progress update every 10KB
          if (bytesSinceLastUpdate >= UPDATE_THRESHOLD) {
            const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : Math.min(99, Math.round((downloadedBytes / (downloadedBytes + 1024 * 1024)) * 100));
            
            // Send progress updates to renderer in real-time
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download-progress', {
                progress,
                downloadedBytes,
                totalBytes: totalBytes || downloadedBytes,
                fileName
              });
            }
            
            bytesSinceLastUpdate = 0; // Reset counter
          }
        });

        response.on('end', () => {
          // Finish writing file
          file.end();
        });

        file.on('finish', () => {
          file.close();
          
          // Send final 100% progress update
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
              progress: 100,
              downloadedBytes: totalBytes || downloadedBytes,
              totalBytes: totalBytes || downloadedBytes,
              fileName
            });
          }
          
          resolve({ filePath, fileName });
        });

        file.on('error', (err) => {
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (e) {
              // Ignore deletion errors
            }
          }
          reject(err);
        });
      }
  });
});

// Show save dialog for installer
ipcMain.handle('show-save-dialog', async (event, options) => {
  if (!mainWindow) return { canceled: true };
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || 'Save Installer',
    defaultPath: options.defaultPath || path.join(app.getPath('downloads'), options.fileName || 'installer.exe'),
    filters: options.filters || [
      { name: 'Executable Files', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result;
});

// Open file location in explorer
ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

 