// Import necessary modules from Electron and RobotJS
const { app, BrowserWindow } = require('electron'); // Electron APIs
const { ipcMain } = require('electron'); // Listen for coordinate updates from renderer process
const robot = require('robotjs'); // RobotJS for controlling input devices and getting pixel color
const fs = require('fs'); // Add fs to write files
const path = require('path'); // Module for handling and transforming file paths
const OCRAD = require('ocrad.js');  // Import OCRAD.js
const { createCanvas, Image } = require('canvas');
const { PNG } = require('pngjs'); // Add PNG for handling PNG format
const { spawn } = require('child_process');
const Jimp = require('jimp');

// Robotjs requires Electron v17.4.11

let win; // Variable to hold the reference to the main application window

// Define a new state object with nested structures for ocrRegions and pixelCoords
const state = {
  ocrRegions: {
    selected: {profile: 'initial', region: 'ocrRegion1'},
    ocrRegion1: { x: 0, y: 300, width: 250, height: 300, invert: false, contrast: 1.0, brightness: 1.0 }
  },
  pixelCoords: {
    selected: {profile: 'initial', region: 'pixelCoord1'},
    pixelCoord1: { x: 50, y: 50, color: "#000000", active: true }
  }
};

/**
 * Function to create the main application window.
 * Initializes the window and sets up its properties.
 * Initiates pixel checks and OCR every 1000ms and delivers results to components through IPC.
 */
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true, // Important for enabling IPC usage
      preload: path.join(__dirname, 'preload.js'), // Path to preload.js
    }
  });

  // Load the HTML file for the renderer process
  win.loadFile('src/renderer/index.html');

  // Set an interval to monitor the pixel color and OCR repeatedly
  setInterval(async () => {
    // Get the pixel color from state.pixelCoords.pixelCoord1
    const { x, y } = state.pixelCoords.pixelCoord1;
    const color = robot.getPixelColor(x, y);

    // Perform OCR using state.ocrRegions.ocrRegion1
    const ocrText = await captureAndRecognize(state.ocrRegions.ocrRegion1);

    // Send the pixel color and OCR data to the renderer process via IPC
    win.webContents.send('pixelColor', { x, y, color }); // Sending pixel data
    win.webContents.send('ocrText', { ocrText }); // Sending OCR data
  }, 1000); // Interval set to 1000 milliseconds 
}

// Event listener for when the application is ready
app.on('ready', createWindow);

// Quit the app when all windows are closed, unless on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Function to capture a specific area of the screen and recognize text
async function captureAndRecognize(ocrRegion) {
  // Capture the screen based on the passed ocrRegion
  const screenshot = robot.screen.capture(ocrRegion.x, ocrRegion.y, ocrRegion.width, ocrRegion.height);

  const tempImagePath = path.join(__dirname, 'tempImage.png');

  try {
    // Save the screenshot as a PNG
    await saveScreenshotAsPNG(screenshot, tempImagePath);

    // Read the saved image and process it
    const src = fs.readFileSync(tempImagePath); // Read the file synchronously
    const img = new Image();
    img.src = src;
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // Process the image with OCRAD
    const text = OCRAD(canvas);  // OCRAD will process the canvas directly
    return text.trim(); // Return the recognized text
  } catch (error) {
    console.error('Error during OCR recognition:', error);
    return ''; // Return empty string in case of error
  } finally {
    // Clean up the temporary image file
    fs.unlinkSync(tempImagePath);
  }
}

// Function to convert the robotjs screenshot to PNG and save it
function saveScreenshotAsPNG(screenshot, filePath) {
  return new Promise((resolve, reject) => {
      const png = new PNG({ width: screenshot.width, height: screenshot.height });
      png.data = Buffer.from(screenshot.image);

      const buffer = PNG.sync.write(png);
      fs.writeFile(filePath, buffer, (err) => {
          if (err) reject(err);
          else resolve();
      });
  });
}

// Listen for 'start-capture' from the renderer and update state.ocrRegions.ocrRegion1
ipcMain.on('start-capture-box', () => {
  const ahkPath = path.join(__dirname, '../scripts/AutoHotkeyA32.exe');
  const ahkScript = path.join(__dirname, '../scripts/getBoxCoords.ahk');

  const ahkProcess = spawn(ahkPath, [ahkScript]);

  ahkProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      const [x1, y1, x2, y2] = output.split(" ").map(Number);
      console.log(`Setting OCR region to: (${x1}, ${y1}) to (${x2}, ${y2})`);

      // Update state.ocrRegions.ocrRegion1
      state.ocrRegions.ocrRegion1 = {
        x: x1,
        y: y1,
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1)
      };
    } else {
      console.log('No coordinates received from AHK script');
    }
  });

  ahkProcess.stderr.on('data', (data) => {
    console.error(`AHK Error: ${data}`);
  });

  ahkProcess.on('close', (code) => {
    console.log(`AHK process exited with code ${code}`);
  });
});

// Listen for 'start-capture' from the renderer and update state.pixelCoords.pixelCoord1
ipcMain.on('start-capture-pixel', () => {
  const ahkPath = path.join(__dirname, '../scripts/AutoHotkeyA32.exe');
  const ahkScript = path.join(__dirname, '../scripts/getPixelCoords.ahk');

  const ahkProcess = spawn(ahkPath, [ahkScript]);

  ahkProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      const [x1, y1] = output.split(" ").map(Number);
      console.log(`Setting Pixel to: (${x1}, ${y1})`);

      // Update state.pixelCoords.pixelCoord1
      state.pixelCoords.pixelCoord1 = {
        x: x1,
        y: y1,
        color: robot.getPixelColor(x1, y1),
        active: true
      };
    } else {
      console.log('No coordinates received from AHK script');
    }
  });

  ahkProcess.stderr.on('data', (data) => {
    console.error(`AHK Error: ${data}`);
  });

  ahkProcess.on('close', (code) => {
    console.log(`AHK process exited with code ${code}`);
  });
});

// Add the new ipcMain listener for variable updates
ipcMain.on('update-variable', (event, { variableName, key, value }) => {
  try {
    if (!state[variableName]) {
      console.error(`Key ${variableName} not found in state`);
    } else if (!state[variableName][key]) {
      console.error(`Key ${key} not found in ${variableName}`);
    } else {
      // Update the pixel coordinates entry by key
      state[variableName][key] = { ...state[variableName][key], ...value };
      console.log(`Updated state[${variableName}][${key}]:`, state[variableName][key]);
    }
    if (key === 'selected') {
      const selectedValues = state[variableName][value.region];
      win.webContents.send('updateVariables', { selectedValues });
    }
    if (key === 'component') {
      const selectedValues = state[variableName][value.region];
      win.webContents.send('updateVariables', { selectedValues });
    }
  } catch (error) {
    console.error('Error updating variable:', error);
  }
});

