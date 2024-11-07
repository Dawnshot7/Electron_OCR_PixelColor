// Import necessary modules from Electron and RobotJS
const { app, BrowserWindow } = require('electron'); // Electron APIs
const robot = require('robotjs'); // RobotJS for controlling input devices and getting pixel color
const fs = require('fs'); // Add fs to write files
const path = require('path'); // Module for handling and transforming file paths
const OCRAD = require('ocrad.js');  // Import OCRAD.js
const { createCanvas, Image } = require('canvas');
const { PNG } = require('pngjs'); // Add PNG for handling PNG format
const { spawn } = require('child_process');
const Jimp = require('jimp');

// Requires Electron v17.4.11

let win; // Variable to hold the reference to the main application window

// Define a variable to store the OCR region
let ocrRegion = { x: 0, y: 300, width: 250, height: 300 };  // Default OCR region

// Listen for coordinate updates from renderer process
const { ipcMain } = require('electron');

/**
 * Function to create the main application window.
 * Initializes the window and sets up its properties.
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

  // Set an interval to monitor the pixel color and OCR every 3 seconds
  setInterval(async () => {
    const { x, y } = { x: 50, y: 240 }; // Coordinates of the pixel to monitor (modifiable)
    const color = robot.getPixelColor(x, y); // Get the pixel color at the specified coordinates

    // Perform OCR and capture text in the specified region
    const ocrText = await captureAndRecognize();
    //const ocrText = "testing"; 
    //console.log(`Color at (100, 100): ${color}`);

    // Send the pixel color and OCR data to the renderer process via IPC
    win.webContents.send('pixelColor', { x, y, color, ocrText }); // Sending both pixel and OCR data
  }, 1000); // Interval set to 3000 milliseconds (3 seconds)
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

// Function to capture a specific area of the screen and recognize text
async function captureAndRecognize() {

  // Capture the screen
  const screenshot = robot.screen.capture(ocrRegion.x, ocrRegion.y, ocrRegion.width, ocrRegion.height);
  
  // Create a temporary file to save the screenshot
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
    fs.unlinkSync(tempImagePath); // Uncomment if you want to delete the temp file
  }
}

// Event listener for when the application is ready
app.on('ready', createWindow);

// Quit the app when all windows are closed, unless on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Listen for 'start-capture' from the renderer
ipcMain.on('start-capture', () => {
  // Path to AutoHotkey executable and script
  const ahkPath = path.join(__dirname, '../scripts/AutoHotkeyA32.exe');
  const ahkScript = path.join(__dirname, '../scripts/getBoxCoords.ahk');

  // Spawn the AHK process
  const ahkProcess = spawn(ahkPath, [ahkScript]);

  ahkProcess.stdout.on('data', (data) => {
      // Parse the coordinates from AHK output
      const output = data.toString().trim();
      if (output) {
        const [x1, y1, x2, y2] = output.split(" ").map(Number);
        console.log(`Setting OCR region to: (${x1}, ${y1}) to (${x2}, ${y2})`);
  
        // Update OCR region with these coordinates
        ocrRegion = {
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