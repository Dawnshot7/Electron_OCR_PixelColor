// overlayPreload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose `ipcRenderer` functionality to the renderer process (overlay.html)
contextBridge.exposeInMainWorld('electronAPI', {
    // Expose an API to listen for alerts updates
    onInitAlerts: (callback) => ipcRenderer.on('initAlerts', (event, data) => {
        console.log('initAlerts received in preload'); // Debug log
        callback(data);
    }),
    onUpdateAlerts: (callback) => ipcRenderer.on('updateAlerts', (event, data) => {
        console.log('updateAlerts received in preload'); // Debug log
        callback(data);
    }),

    // You could also expose a method for sending messages back to main.js, if needed
    sendAlertPosition: (alertData) => ipcRenderer.send('save-alert-position', alertData)
});
