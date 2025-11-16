const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

console.log('Preload script loaded');

// Try to read GitHub token for development mode
try {
  const tokenPath = path.join(__dirname, '..', '.github_token.txt');
  if (fs.existsSync(tokenPath)) {
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    if (token) {
      window.__GITHUB_TOKEN__ = token;
      console.log('GitHub token loaded from file for development mode');
    }
  }
} catch (e) {
  // Ignore errors reading token file
}

// Expose the window control functions directly to the window object
window.electronAPI = {
  minimize: () => {
    console.log('Minimize called from preload');
    ipcRenderer.send('window-minimize');
  },
  maximize: () => {
    console.log('Maximize called from preload');
    ipcRenderer.send('window-maximize');
  },
  unmaximize: () => {
    console.log('Unmaximize called from preload');
    ipcRenderer.send('window-unmaximize');
  },
  close: () => {
    console.log('Close called from preload');
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
};

console.log('electronAPI exposed to window'); 