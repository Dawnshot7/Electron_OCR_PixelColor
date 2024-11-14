// overlayPreload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose `ipcRenderer` functionality to the renderer process (overlay.html)
contextBridge.exposeInMainWorld('electronAPI', {
    // Expose an API to listen for alerts updates
    onInitAlerts: (callback) => ipcRenderer.on('initAlerts', (event, data) => {
        console.log('initAlerts received in preload'); // Debug log
        callback(data);
    }),
    onDragAlerts: (callback) => ipcRenderer.on('dragAlerts', (event, data) => {
        console.log('updateAlerts received in preload'); // Debug log
        callback(data);
    }),
    onUpdateVisibleAlerts: (callback) => ipcRenderer.on('updateVisibleAlerts', (event, data) => {
        console.log('updateVisibleAlerts received in preload'); // Debug log
        callback(data);
    }),
    turnOffEditMode: () => ipcRenderer.send('turnOffEditMode'),
    updateVariable: (variableName, key, value) => ipcRenderer.send('update-variable', { variableName, key, value })
});
