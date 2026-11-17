const { contextBridge, ipcRenderer } = require('electron');
// Pont limité entre le logiciel et Windows : version et mise à jour uniquement
contextBridge.exposeInMainWorld('tenkalaDesktop', {
  version: () => ipcRenderer.invoke('tk-version'),
  verifierMaj: () => ipcRenderer.invoke('tk-maj')
});
