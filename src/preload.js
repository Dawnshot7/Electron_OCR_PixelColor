// Import necessary modules from the Electron package
const { contextBridge, ipcRenderer } = require('electron');

// Use contextBridge to securely expose APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Define a method to listen for 'pixelColor' events from the main process
  onPixelColor: (callback) => ipcRenderer.on('pixelColor', callback),
  onOCRText: (callback) => ipcRenderer.on('ocrText', callback),
  startCapturePixel: () => ipcRenderer.send('start-capture-pixel'),
  startCaptureBox: () => ipcRenderer.send('start-capture-box'),

  onUpdateVariables: (callback) => ipcRenderer.on('updateVariables', callback),
  // Add method to update variable in main process
  updateVariable: (variableName, key, value) => ipcRenderer.send('update-variable', { variableName, key, value }),
});
