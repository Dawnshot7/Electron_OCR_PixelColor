// overlayPreload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose `ipcRenderer` functionality to the renderer process (overlay.html)
contextBridge.exposeInMainWorld('electronAPI', {
    // Used by hideDraggableOverlay button to tell main.js to hide the overlay and show the main electron window
    hideDraggableOverlay: () => ipcRenderer.send('hideDraggableOverlay'),
    // Used to update variables in main.js and config.ini upon changes in the position of alerts after dragging
    updateVariable: (variableName, key, value) => ipcRenderer.send('update-variable', { variableName, key, value }),

    // Used by main.js to initialize all alerts on load
    onInitAlerts: (callback) => ipcRenderer.on('initAlerts', (event, data) => callback(data)),
    // Used by AlertDesigner component to display all alerts as draggable before displaying the overlay in clickable mode
    onDragAlerts: (callback) => ipcRenderer.on('dragAlerts', (event, data) => callback(data)),
    // Used when game-mode is active to send the list of alerts to be made visible every second from the main.js setinterval function
    onUpdateVisibleAlerts: (callback) => ipcRenderer.on('updateVisibleAlerts', (event, data) => callback(data)),
});
