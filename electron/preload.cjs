// Minimal preload — expose no Node API to renderer for security
// Add IPC handlers here if you need native functionality.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
});
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemDirs: () => ipcRenderer.invoke('get-system-dirs'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  copyPath: (filePath) => ipcRenderer.invoke('copy-path', filePath),
  createShareLink: (filePath, expirationMinutes) => 
    ipcRenderer.invoke('create-share-link', filePath, expirationMinutes),
  getSharedFiles: () => ipcRenderer.invoke('get-shared-files'),
  revokeShare: (shareId) => ipcRenderer.invoke('revoke-share', shareId),
});
