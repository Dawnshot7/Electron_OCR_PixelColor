// Import necessary modules from the Electron package
const { contextBridge, ipcRenderer } = require('electron');

// Use contextBridge to securely expose APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Define a method to listen for 'pixelColor' events from the main process
  onPixelColor: (callback) => ipcRenderer.on('pixelColor', callback),
  startCapture: () => ipcRenderer.send('start-capture')
});