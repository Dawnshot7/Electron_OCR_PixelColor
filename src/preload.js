// Import necessary modules from the Electron package
const { contextBridge, ipcRenderer } = require('electron');

// Use contextBridge to securely expose APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Define a method to listen for 'pixelColor' events from the main process
  onPixelColor: (callback) => ipcRenderer.on('pixelColor', callback),

  updateVariable: (variableName, key, value) => ipcRenderer.send('update-variable', { variableName, key, value }),
  runAhkScript: (scriptName, arg1, arg2) => ipcRenderer.send('run-ahk-script', { scriptName, arg1, arg2 }),
  
  onupdateConfig: (callback) => ipcRenderer.on('updateConfig', (event, data) => callback(data)),
  onupdateList: (callback) => ipcRenderer.on('updateList', (event, data) => callback(data)),
  onupdateImages: (callback) => ipcRenderer.on('updateImages', (event, data) => callback(data)),
  onOCRText: (callback) => ipcRenderer.on('ocrText', callback),
});
