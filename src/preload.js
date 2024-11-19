// Import necessary modules from the Electron package
const { contextBridge, ipcRenderer } = require('electron');

// Use contextBridge to securely expose APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  
  // Used by all componenets to update variables in main.js and config.ini upon changes in the component
  updateVariable: (variableName, key, value) => ipcRenderer.send('update-variable', { variableName, key, value }),
  // Used by OCRConfigurator and PixelSelector components to select coordinates for OCR boxes and pixels using AHK scripts
  runAhkScript: (scriptName, arg1, arg2) => ipcRenderer.send('run-ahk-script', { scriptName, arg1, arg2 }),
  // Used by AlertDesigner component to show draggable, clickable alert overlay
  showDraggableOverlay: () => ipcRenderer.send('showDraggableOverlay'),  
  // Used by Conditions component to toggle visibility of game-mode, click-through alert overlay
  toggleGameModeOverlay: () => ipcRenderer.send('toggleGameModeOverlay'),
  // Used by App.vue to send user request to rename profile to main.js
  renameProfile: (newProfile) => ipcRenderer.send('renameProfile', newProfile),
  
  // Used by all components to populate their listboxes on component load
  onupdateList: (callback) => ipcRenderer.on('updateList', (event, data) => callback(data)),
  // Used by all components to receive config fields data upon listbox selection change or component load
  onupdateConfig: (callback) => ipcRenderer.on('updateConfig', (event, data) => callback(data)),
  // Used by OCRConfigurator component to receive updated images upon change in config settings or live update
  onupdateImages: (callback) => ipcRenderer.on('updateImages', (event, data) => callback(data)),
  // Used by PixelSelector component to receive updated images upon change in config settings or new pixel selection
  onupdatePixelImages: (callback) => ipcRenderer.on('updatePixelImages', (event, data) => callback(data)),
  // Used by OCRConfigurator to receive OCR text on config settings change or live update
  onOCRText: (callback) => ipcRenderer.on('ocrText', callback),
  // Used by PixelSelector to receive live updates of color of currently selected pixel
  onpixelColor: (callback) => ipcRenderer.on('pixelColor', (event, data) => callback(data)),
});
