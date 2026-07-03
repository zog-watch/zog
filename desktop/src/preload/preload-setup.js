const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__ZOG_SETUP__', {
  saveDomain: (domain) => ipcRenderer.invoke('save-domain', domain),
});
