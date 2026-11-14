const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { runQiskitExperiment } = require('./qiskit-runner.cjs');

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1040,
    minHeight: 720,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f4f5f1',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

const template = [
  { role: 'appMenu' },
  { role: 'editMenu' },
  { role: 'viewMenu' },
  { role: 'windowMenu' }
];

app.whenReady().then(() => {
  const qiskitRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : app.getAppPath();
  ipcMain.handle('qiskit:run', (_event, input) => runQiskitExperiment(input, qiskitRoot));
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
