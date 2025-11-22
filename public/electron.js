const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const isDev = require('electron-is-dev');

// Set App User Model ID for Windows notifications
app.setAppUserModelId('com.growmore.app');

// Initialize electron-push-receiver
const { setup: setupPushReceiver, START_NOTIFICATION_SERVICE, NOTIFICATION_SERVICE_STARTED, NOTIFICATION_SERVICE_ERROR, NOTIFICATION_RECEIVED, TOKEN_UPDATED } = require('electron-push-receiver');

// Main window reference
let mainWindow;
let tray = null;
let isQuitting = false;

function createWindow() {
  // Determine correct paths for dev vs production
  const getResourcePath = (relativePath) => {
    if (isDev) {
      return path.join(__dirname, '..', relativePath);
    } else {
      // In production, __dirname is the build folder (app.asar/build)
      // Resources are in app.asar/../resources
      return path.join(process.resourcesPath, relativePath);
    }
  };

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
    icon: getResourcePath('assets/New Icon Fixed.ico'),
    frame: false,
    titleBarStyle: 'hidden'
  });

  // Initialize push receiver for this window
  setupPushReceiver(mainWindow.webContents);

  // Maximize the window on startup
  mainWindow.maximize();

  // Disable the default menu bar
  Menu.setApplicationMenu(null);

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode only
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close (minimize to tray)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

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
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    if (!isDev) {
      mainWindow.loadURL(`file://${path.join(__dirname, 'index.html')}`);
    }
  });
}

// Create Tray Icon
function createTray() {
  // Use same path resolution as main window icon
  const getResourcePath = (relativePath) => {
    if (isDev) {
      return path.join(__dirname, '..', relativePath);
    } else {
      return path.join(process.resourcesPath, relativePath);
    }
  };

  const iconPath = getResourcePath('assets/New Icon Fixed.ico');
  console.log('Tray icon path:', iconPath);
  const trayIcon = require('electron').nativeImage.createFromPath(iconPath);

  tray = new Menu.buildFromTemplate([
    {
      label: 'Open Grow More',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  const appTray = new (require('electron').Tray)(trayIcon);
  appTray.setToolTip('Grow More');
  appTray.setContextMenu(tray);

  appTray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return appTray;
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('ready', () => {
    createWindow();
    tray = createTray();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Do not quit, keep running in tray
    // app.quit(); 
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-maximize', () => {
  if (mainWindow) mainWindow.maximize();
});
ipcMain.on('window-unmaximize', () => {
  if (mainWindow) mainWindow.unmaximize();
});
ipcMain.on('window-close', () => {
  // This is the custom close button in the UI
  if (mainWindow) {
    mainWindow.hide(); // Minimize to tray instead of destroy
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

