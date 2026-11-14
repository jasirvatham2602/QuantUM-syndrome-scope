const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('syndromeScope', {
  runQiskit: input => ipcRenderer.invoke('qiskit:run', input)
});
