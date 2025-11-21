const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { setup: setupPushReceiver } = require('electron-push-receiver');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      preload: path.join(__dirname, 'public', 'preload.js'),
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
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
    : `file://${path.join(__dirname, 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  // Initialize Electron Push Receiver
  setupPushReceiver(mainWindow.webContents);

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
      mainWindow.loadURL(`file://${path.join(__dirname, 'build', 'index.html')}`);
    }
  });
}

// Set App User Model ID for Windows notifications
if (process.platform === 'win32') {
  app.setAppUserModelId('com.schoolmanagement.app');
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
// Track active downloads for close confirmation and pause/resume
let activeDownloads = new Map(); // Map of fileName -> download state

ipcMain.on('window-close', () => {
  console.log('Close button clicked');
  if (mainWindow && activeDownloads.size > 0) {
    // Ask user for confirmation
    const { dialog } = require('electron');
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Close Anyway'],
      defaultId: 0,
      title: 'Download in Progress',
      message: 'A download is currently in progress.',
      detail: 'If you close the application now, the download will be canceled. Are you sure you want to close?'
    });

    if (choice === 0) {
      // User chose Cancel - don't close
      return;
    }
  }

  if (mainWindow) {
    mainWindow.destroy();
  }
});
ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Download file with progress tracking and pause/resume support
ipcMain.handle('download-file', async (event, url, fileName) => {
  return new Promise((resolve, reject) => {
    // Download directly to Downloads folder (default Windows location)
    const filePath = path.join(app.getPath('downloads'), fileName);

    // Check if file exists and get its size for resume support
    let downloadedBytes = 0;
    let file;
    if (fs.existsSync(filePath)) {
      downloadedBytes = fs.statSync(filePath).size;
      file = fs.createWriteStream(filePath, { flags: 'a' }); // Append mode for resume
    } else {
      file = fs.createWriteStream(filePath);
    }

    let totalBytes = 0;
    let currentRequest = null;
    let currentResponse = null;
    let isPaused = false;

    // Store download state
    const downloadState = {
      fileName,
      filePath,
      url,
      file,
      downloadedBytes,
      totalBytes,
      request: null,
      response: null,
      isPaused: false,
      isCanceled: false,
      resolve,
      reject
    };
    activeDownloads.set(fileName, downloadState);

    // Determine if http or https
    const urlObj = new URL(url);
    const httpModule = urlObj.protocol === 'https:' ? require('https') : require('http');

    const requestOptions = {
      headers: {
        'User-Agent': 'GrowMore-Updater/1.0'
      }
    };

    // Add Range header for resume support if we have partial download
    if (downloadedBytes > 0) {
      requestOptions.headers['Range'] = `bytes=${downloadedBytes}-`;
    }

    // Helper function to make request with redirect support
    const makeRequest = (requestUrl, requestFile, requestFilePath) => {
      const urlObj = new URL(requestUrl);
      const reqModule = urlObj.protocol === 'https:' ? require('https') : require('http');

      // Update request options for redirect (remove Range header on redirect)
      const redirectOptions = { ...requestOptions };
      if (requestUrl !== url) {
        delete redirectOptions.headers['Range']; // Don't use range on redirect
      }

      const req = reqModule.get(requestUrl, redirectOptions, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Resolve relative redirects
            const absoluteUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, requestUrl).href;

            // Close current file
            requestFile.close();
            // Delete file if it exists
            if (fs.existsSync(requestFilePath)) {
              try {
                fs.unlinkSync(requestFilePath);
              } catch (e) {
                // Ignore deletion errors
              }
            }

            // Reset download state
            downloadState.downloadedBytes = 0;
            downloadState.file = fs.createWriteStream(requestFilePath);

            // Create new file stream and retry with new URL
            const redirectReq = makeRequest(absoluteUrl, downloadState.file, requestFilePath);
            downloadState.request = redirectReq;
            redirectReq.on('error', (err) => {
              downloadState.file.close();
              if (fs.existsSync(requestFilePath)) {
                try {
                  fs.unlinkSync(requestFilePath);
                } catch (e) {
                  // Ignore deletion errors
                }
              }
              activeDownloads.delete(fileName);
              reject(err);
            });
            return;
          }
        }
        downloadState.request = req;
        downloadState.response = response;
        handleDownload(response, requestFile);
      });

      return req;
    };

    const req = makeRequest(url, file, filePath);
    downloadState.request = req;

    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // Ignore deletion errors
        }
      }
      activeDownloads.delete(fileName);
      reject(err);
    });

    function handleDownload(response, downloadFile) {
      // Handle 206 Partial Content (resume) or 200 OK
      if (response.statusCode !== 200 && response.statusCode !== 206) {
        downloadFile.close();
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
        activeDownloads.delete(fileName);
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      // For 206 Partial Content, content-range header tells us total size
      if (response.statusCode === 206) {
        const contentRange = response.headers['content-range'];
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)/);
          if (match) {
            totalBytes = parseInt(match[1], 10);
          }
        }
      } else {
        totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      }

      downloadState.totalBytes = totalBytes;

      // Ensure response is not paused initially
      if (response.isPaused()) {
        response.resume();
      }

      // Send initial progress update
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          progress: totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0,
          downloadedBytes: downloadedBytes,
          totalBytes: totalBytes,
          fileName
        });
      }

      // Track bytes since last update to send progress every 10KB
      let bytesSinceLastUpdate = 0;
      const UPDATE_THRESHOLD = 10 * 1024; // 10KB

      // Manually handle data chunks instead of using pipe to track progress
      response.on('data', (chunk) => {
        // Check if paused
        if (downloadState.isPaused) {
          return; // Don't process data when paused
        }

        downloadedBytes += chunk.length;
        downloadState.downloadedBytes = downloadedBytes;
        bytesSinceLastUpdate += chunk.length;

        // Write chunk to file
        const writeResult = downloadFile.write(chunk);
        if (!writeResult) {
          // If write returns false, pause until drain event
          response.pause();
          downloadFile.once('drain', () => {
            if (!downloadState.isPaused) {
              response.resume();
            }
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
              fileName,
              isPaused: downloadState.isPaused
            });
          }

          bytesSinceLastUpdate = 0; // Reset counter
        }
      });

      response.on('end', () => {
        // Finish writing file
        downloadFile.end();
      });

      response.on('error', (err) => {
        downloadFile.close();
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
        activeDownloads.delete(fileName);
        reject(err);
      });

      downloadFile.on('finish', () => {
        downloadFile.close();

        // Check if download was canceled before proceeding
        const currentState = activeDownloads.get(fileName);
        if (currentState && currentState.isCanceled) {
          // Download was canceled, don't open file or resolve
          activeDownloads.delete(fileName);
          reject(new Error('Download was canceled'));
          return;
        }

        // Check if file still exists (might have been deleted)
        if (!fs.existsSync(filePath)) {
          activeDownloads.delete(fileName);
          reject(new Error('Downloaded file no longer exists'));
          return;
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

        // Auto-open the downloaded file only if it exists
        if (fs.existsSync(filePath)) {
          shell.openPath(filePath).catch((err) => {
            console.error('Failed to open downloaded file:', err);
          });
          resolve({ filePath, fileName });
        } else {
          reject(new Error('Downloaded file not found'));
        }
      });

      downloadFile.on('error', (err) => {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
        activeDownloads.delete(fileName);
        reject(err);
      });
    }
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
