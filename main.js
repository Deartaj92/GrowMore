const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 690,
    minWidth: 1200,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    closable: true,
    minimizable: true,
    maximizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'build', 'preload.js'),
      // webSecurity: true // default is true, more secure
    }
  });

  mainWindow.setMinimumSize(1200, 600);
  mainWindow.removeMenu();

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, 'build', 'index.html')}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });


}

app.on('ready', createWindow);

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  console.log('Minimize button clicked');
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  console.log('Maximize button clicked');
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-unmaximize', () => {
  console.log('Unmaximize button clicked');
  if (mainWindow) mainWindow.unmaximize();
});

ipcMain.on('window-close', () => {
  console.log('Close button clicked - destroying window');
  if (mainWindow) {
    mainWindow.destroy();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
}); 