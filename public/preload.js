const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Try to read GitHub token for development mode
try {
  const tokenPath = path.join(__dirname, '..', '.github_token.txt');
  if (fs.existsSync(tokenPath)) {
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    if (token) {
      window.__GITHUB_TOKEN__ = token;
    }
  }
} catch (e) {
  // Ignore errors reading token file
}

// Expose the window control functions directly to the window object
window.electronAPI = {
  minimize: () => {
    ipcRenderer.send('window-minimize');
  },
  maximize: () => {
    ipcRenderer.send('window-maximize');
  },
  unmaximize: () => {
    ipcRenderer.send('window-unmaximize');
  },
  close: () => {
    ipcRenderer.send('window-close');
  },
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximize: (callback) => ipcRenderer.on('window-maximized', callback),
  onUnmaximize: (callback) => ipcRenderer.on('window-unmaximized', callback),
  // Download functionality
  downloadFile: (url, fileName) => {
    return ipcRenderer.invoke('download-file', url, fileName);
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => {
      callback(data);
    });
  },
  pauseDownload: (fileName) => ipcRenderer.invoke('pause-download', fileName),
  resumeDownload: (fileName) => ipcRenderer.invoke('resume-download', fileName),
  cancelDownload: (fileName) => ipcRenderer.invoke('cancel-download', fileName),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  // Push Notifications (FCM)
  startPushService: (senderId) => ipcRenderer.send('START_NOTIFICATION_SERVICE', senderId),
  onPushTokenReceived: (callback) => {
    ipcRenderer.on('NOTIFICATION_SERVICE_STARTED', (_, token) => callback(token));
    ipcRenderer.on('TOKEN_UPDATED', (_, token) => callback(token));
  },
  onPushNotificationReceived: (callback) => ipcRenderer.on('NOTIFICATION_RECEIVED', (_, notification) => callback(notification)),
  onRfidScan: (callback) => {
    ipcRenderer.on('rfid-global-scan', (_, uid) => callback(uid));
  },
  showRfidScanNotification: (payload) => ipcRenderer.send('rfid-scan-notification', payload),
  // Listen for show download modal on close event
  onShowDownloadModalOnClose: (callback) => {
    ipcRenderer.on('show-download-modal-on-close', callback);
  },
};
