const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');

let mainWindow;
let shareServer;
let serverProcess = null;
const sharedFiles = new Map();

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;


function createWindow() {
  // Find icon path - check multiple possible locations
  let iconPath = path.join(__dirname, '../client/public/favicon.png');
  if (!fsSync.existsSync(iconPath)) {
    // Try alternative paths in production
    iconPath = path.join(__dirname, '../resources/client/public/favicon.png');
    if (!fsSync.existsSync(iconPath)) {
      iconPath = undefined; // Use default icon
    }
  }
  
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    show: false,
    ...(iconPath && { icon: iconPath }),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), '/dist/public/index.html'));
    startServer();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

async function getDirectoryContents(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const contents = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        let stats = null;
        try {
          stats = await fs.stat(fullPath);
        } catch (e) {
          return null;
        }
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats ? stats.size : 0,
          modified: stats ? stats.mtime.toISOString() : null,
          created: stats ? stats.birthtime.toISOString() : null,
        };
      })
    );
    return contents.filter(Boolean).sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error;
  }
}

function getSystemDirectories() {
  const homeDir = os.homedir();
  return {
    home: homeDir,
    desktop: path.join(homeDir, 'Desktop'),
    documents: path.join(homeDir, 'Documents'),
    downloads: path.join(homeDir, 'Downloads'),
    pictures: path.join(homeDir, 'Pictures'),
    music: path.join(homeDir, 'Music'),
    videos: path.join(homeDir, 'Videos'),
  };
}

function startServer() {
  if (serverProcess) return;

  const { spawn } = require('child_process');
  const appPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : path.join(__dirname, '..');
  const serverPath = path.join(appPath, 'dist', 'index.cjs');

  serverProcess = spawn('node', [serverPath], {
    cwd: appPath,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '5000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data.toString()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server error: ${data.toString()}`);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    serverProcess = null;
  });
}

function startShareServer() {
  if (shareServer) return;

  shareServer = http.createServer((req, res) => {
    const shareId = req.url.slice(1);
    const fileInfo = sharedFiles.get(shareId);

    if (!fileInfo) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found or link expired');
      return;
    }

    if (Date.now() > fileInfo.expiresAt) {
      sharedFiles.delete(shareId);
      res.writeHead(410, { 'Content-Type': 'text/plain' });
      res.end('Share link has expired');
      return;
    }

    const filePath = fileInfo.path;
    const fileName = path.basename(filePath);

    try {
      if (!fsSync.existsSync(filePath)) {
        sharedFiles.delete(shareId);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
        return;
      }

      const stat = fsSync.statSync(filePath);

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': stat.size,
      });

      const readStream = fsSync.createReadStream(filePath);
      readStream.on('error', (err) => {
        console.error('Read stream error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
        }
        res.end('Error reading file');
      });
      readStream.pipe(res);
    } catch (err) {
      console.error('Share server error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  });

  shareServer.listen(3001, () => {
    console.log('Share server running on port 3001');
  });
}

ipcMain.handle('get-system-dirs', () => {
  return getSystemDirectories();
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  return await getDirectoryContents(dirPath);
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled) return null;
  return result.filePaths;
});

ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      isDirectory: stats.isDirectory(),
      size: stats.size,
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString(),
    };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('show-in-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('copy-path', async (event, filePath) => {
  const { clipboard } = require('electron');
  clipboard.writeText(filePath);
  return true;
});

ipcMain.handle('create-share-link', async (event, filePath, expirationMinutes = 60) => {
  startShareServer();
  
  const shareId = Math.random().toString(36).substring(2, 15);
  const expiresAt = Date.now() + expirationMinutes * 60 * 1000;
  
  sharedFiles.set(shareId, {
    path: filePath,
    expiresAt,
    createdAt: Date.now(),
  });
  
  return {
    shareId,
    url: `http://localhost:3001/${shareId}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
});

ipcMain.handle('get-shared-files', () => {
  const now = Date.now();
  const activeShares = [];
  
  sharedFiles.forEach((value, key) => {
    if (value.expiresAt > now) {
      activeShares.push({
        shareId: key,
        path: value.path,
        name: path.basename(value.path),
        url: `http://localhost:3001/${key}`,
        expiresAt: new Date(value.expiresAt).toISOString(),
        createdAt: new Date(value.createdAt).toISOString(),
      });
    } else {
      sharedFiles.delete(key);
    }
  });
  
  return activeShares;
});

ipcMain.handle('revoke-share', (event, shareId) => {
  sharedFiles.delete(shareId);
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (shareServer) {
    shareServer.close();
  }
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (shareServer) {
    shareServer.close();
  }
});
