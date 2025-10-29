const { ipcRenderer } = require('electron');

console.log('Preload script loaded');

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
};

console.log('electronAPI exposed to window'); 