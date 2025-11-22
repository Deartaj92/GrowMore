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
    // Check if download is in progress (including paused)
    if (activeDownloads.size > 0) {
      event.preventDefault();
      
      // Show the download modal in the renderer instead of closing
      // Send a message to show the download modal
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('show-download-modal-on-close');
        // Focus the window to make sure user sees the modal
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
      }
      
      // Don't close - user must cancel download first
      return;
    }

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
    // Check if download is in progress before quitting
    if (activeDownloads.size > 0 && !isQuitting) {
      // Don't quit if download is active and user hasn't explicitly chosen to close
      // The close handler will show the warning dialog
      return;
    }
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
  // Check if download is in progress (including paused)
  if (activeDownloads.size > 0) {
    // Show the download modal instead of closing
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('show-download-modal-on-close');
      // Focus the window to make sure user sees the modal
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
    // Don't close - user must cancel download first
    return;
  }

  if (mainWindow) {
    mainWindow.hide(); // Minimize to tray instead of destroy
  }
});
ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Track active downloads for pause/resume/cancel support
const activeDownloads = new Map(); // Map of fileName -> download state

// Download file with progress tracking
ipcMain.handle('download-file', async (event, url, fileName) => {
  return new Promise((resolve, reject) => {
    // Download directly to Downloads folder (default Windows location)
    const filePath = path.join(app.getPath('downloads'), fileName);
    let file = null;
    let downloadedBytes = 0;
    let totalBytes = 0;
    let currentRequest = null;
    let currentResponse = null;
    let isResolved = false;
    let isPaused = false;
    let isCanceled = false;

    // Helper function to clean up resources
    const cleanup = () => {
      if (file && !file.destroyed) {
        try {
          file.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };

    // Store download state
    const downloadState = {
      fileName,
      filePath,
      url,
      file: null,
      downloadedBytes: 0,
      totalBytes: 0,
      request: null,
      response: null,
      isPaused: false,
      isCanceled: false,
      resolve,
      reject
    };
    activeDownloads.set(fileName, downloadState);

    // Helper function to make request with redirect support
    const makeRequest = (requestUrl) => {
      // Determine if http or https
      const urlObj = new URL(requestUrl);
      const httpModule = urlObj.protocol === 'https:' ? require('https') : require('http');

      const requestOptions = {
        headers: {
          'User-Agent': 'GrowMore-Updater/1.0',
          'Accept': '*/*'
        },
        timeout: 30000 // 30 second timeout
      };

      // Create new file stream for each request (in case of redirect)
      if (file) {
        try {
          file.destroy();
        } catch (e) {
          // Ignore
        }
      }
      file = fs.createWriteStream(filePath);
      downloadState.file = file;

      const req = httpModule.get(requestUrl, requestOptions, (response) => {
        currentResponse = response;
        downloadState.response = response;
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Resolve relative redirects
            const absoluteUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, requestUrl).href;
            
            // Clean up current file
            cleanup();
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (e) {
                // Ignore deletion errors
              }
            }
            
            // Retry with new URL
            setTimeout(() => {
              makeRequest(absoluteUrl);
            }, 100);
            return;
          }
        }
        handleDownload(response);
      });

      req.on('error', (err) => {
        cleanup();
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
        activeDownloads.delete(fileName);
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        cleanup();
        activeDownloads.delete(fileName);
        if (!isResolved) {
          isResolved = true;
          reject(new Error('Download timeout'));
        }
      });

      currentRequest = req;
      downloadState.request = req;
      return req;
    };

    function handleDownload(response) {
      // Check if canceled
      if (isCanceled || downloadState.isCanceled) {
        return;
      }
      // Handle non-200 status codes
      if (response.statusCode !== 200 && response.statusCode !== 206) {
        cleanup();
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
        activeDownloads.delete(fileName);
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        }
        return;
      }

      totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      downloadState.totalBytes = totalBytes;

      // Ensure response is not paused
      if (response.isPaused()) {
        response.resume();
      }

      // Send initial progress update (0%)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          progress: 0,
          downloadedBytes: 0,
          totalBytes: downloadState.totalBytes || totalBytes,
          fileName
        });
      }

      // Track bytes since last update to send progress every 10KB
      let bytesSinceLastUpdate = 0;
      const UPDATE_THRESHOLD = 10 * 1024; // 10KB

      // Handle data chunks
      response.on('data', (chunk) => {
        if (isResolved || isCanceled || downloadState.isCanceled) return; // Don't process if already resolved/rejected/canceled
        
        // Check if paused
        if (isPaused || downloadState.isPaused) {
          return; // Don't process data when paused
        }
        
        downloadedBytes += chunk.length;
        downloadState.downloadedBytes = downloadedBytes;
        bytesSinceLastUpdate += chunk.length;

        // Write chunk to file
        try {
          if (!file.write(chunk)) {
            // If write returns false, pause until drain event
            response.pause();
            file.once('drain', () => {
              if (!isResolved) {
                response.resume();
              }
            });
          }
        } catch (err) {
          cleanup();
          if (!isResolved) {
            isResolved = true;
            reject(err);
          }
          return;
        }

        // Send progress update every 10KB
        if (bytesSinceLastUpdate >= UPDATE_THRESHOLD) {
          const currentTotalBytes = downloadState.totalBytes || totalBytes;
          const progress = currentTotalBytes > 0 
            ? Math.round((downloadedBytes / currentTotalBytes) * 100) 
            : Math.min(99, Math.round((downloadedBytes / (downloadedBytes + 1024 * 1024)) * 100));

          // Send progress updates to renderer in real-time
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
              progress,
              downloadedBytes,
              totalBytes: currentTotalBytes || downloadedBytes,
              fileName,
              isPaused: downloadState.isPaused
            });
          }

          bytesSinceLastUpdate = 0; // Reset counter
        }
      });

      response.on('end', () => {
        if (file && !file.destroyed) {
          file.end();
        }
      });

      response.on('error', (err) => {
        cleanup();
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
        activeDownloads.delete(fileName);
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      });

      file.on('finish', () => {
        // Check if download was canceled before proceeding
        const currentState = activeDownloads.get(fileName);
        if (currentState && currentState.isCanceled) {
          // Download was canceled, don't open file or resolve
          activeDownloads.delete(fileName);
          if (!isResolved) {
            isResolved = true;
            reject(new Error('Download was canceled'));
          }
          return;
        }
        
        if (file) {
          file.close();
        }

        // Send final 100% progress update
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            progress: 100,
            downloadedBytes: totalBytes || downloadedBytes,
            totalBytes: totalBytes || downloadedBytes,
            fileName,
            isPaused: false
          });
        }

        // Remove from active downloads
        activeDownloads.delete(fileName);

        if (!isResolved) {
          isResolved = true;
          resolve({ filePath, fileName });
        }
      });

      file.on('error', (err) => {
        cleanup();
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
        activeDownloads.delete(fileName);
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      });
    }

    // Start the download
    makeRequest(url);
  });
});

// Pause download
ipcMain.handle('pause-download', async (event, fileName) => {
  const downloadState = activeDownloads.get(fileName);
  if (downloadState && downloadState.response && !downloadState.isPaused) {
    downloadState.isPaused = true;
    downloadState.response.pause();

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', {
        progress: downloadState.totalBytes > 0 ? Math.round((downloadState.downloadedBytes / downloadState.totalBytes) * 100) : 0,
        downloadedBytes: downloadState.downloadedBytes,
        totalBytes: downloadState.totalBytes,
        fileName,
        isPaused: true
      });
    }

    return { success: true };
  }
  return { success: false };
});

// Resume download
ipcMain.handle('resume-download', async (event, fileName) => {
  const downloadState = activeDownloads.get(fileName);
  if (downloadState && downloadState.response && downloadState.isPaused) {
    downloadState.isPaused = false;
    downloadState.response.resume();

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', {
        progress: downloadState.totalBytes > 0 ? Math.round((downloadState.downloadedBytes / downloadState.totalBytes) * 100) : 0,
        downloadedBytes: downloadState.downloadedBytes,
        totalBytes: downloadState.totalBytes,
        fileName,
        isPaused: false
      });
    }

    return { success: true };
  }
  return { success: false };
});

// Cancel download
ipcMain.handle('cancel-download', async (event, fileName) => {
  const downloadState = activeDownloads.get(fileName);
  if (downloadState) {
    // Mark as canceled to prevent completion handlers from running
    downloadState.isCanceled = true;

    // Abort the request if it exists
    if (downloadState.request) {
      downloadState.request.abort();
    }

    // Destroy the response stream if it exists (this stops any data from being written)
    if (downloadState.response) {
      downloadState.response.destroy();
    }

    // Close the file stream properly before deletion
    if (downloadState.file && !downloadState.file.destroyed) {
      try {
        // End the stream (flushes any pending data)
        if (downloadState.file.writable && !downloadState.file.destroyed) {
          downloadState.file.end();
        }
        // Wait a bit for stream to finish closing
        await new Promise(resolve => setTimeout(resolve, 50));
        // Destroy the stream if still open
        if (!downloadState.file.destroyed) {
          downloadState.file.destroy();
        }
      } catch (e) {
        // Ignore stream errors during cancellation
      }
    }

    // Wait a moment to ensure file stream is fully closed before deletion
    await new Promise(resolve => setTimeout(resolve, 100));

    // Delete the partial file (multiple attempts to ensure it's deleted)
    let attempts = 0;
    while (fs.existsSync(downloadState.filePath) && attempts < 5) {
      try {
        fs.unlinkSync(downloadState.filePath);
        break; // Successfully deleted
      } catch (e) {
        attempts++;
        if (attempts < 5) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Reject the promise if it's still pending
    if (downloadState.reject) {
      try {
        downloadState.reject(new Error('Download was canceled by user'));
      } catch (e) {
        // Ignore if promise already resolved/rejected
      }
    }

    // Remove from active downloads
    activeDownloads.delete(fileName);

    // Send cancellation notification
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', {
        progress: 0,
        downloadedBytes: 0,
        totalBytes: downloadState.totalBytes || 0,
        fileName,
        isPaused: false,
        canceled: true
      });
    }

    return { success: true };
  }
  return { success: false };
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

