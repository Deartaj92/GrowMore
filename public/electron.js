const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
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
    icon: path.join(__dirname, '../assets/icon.ico'),
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

 