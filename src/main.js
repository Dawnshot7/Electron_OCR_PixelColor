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
const ini = require('ini');

// Robotjs requires Electron v17.4.11

let win; // Variable to hold the reference to the main application window
let overlayWindow; // Variable to hold the reference to the transparent alert window
let state = {}; // Variable to hold all data from config.ini upon loadConfig()

// Event listener for when the application is ready
app.on('ready', () => {
  // Load config before creating the window
  loadConfig('src/config/config.ini');
  
  // Now create the windows after their config is loaded
  createWindow();
  createOverlayWindow();
});

// Quit the app when all windows are closed, unless on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Read the contents of config.ini into the state variable
function loadConfig(filePath) {
  const rawConfig = fs.readFileSync(filePath, 'utf-8');
  state = ini.parse(rawConfig);
  console.log(state);

  // Process each key in ocrRegions and convert it into an actual object
  for (let key in state.ocrRegions) {
    if (state.ocrRegions.hasOwnProperty(key)) {
      const stringVar = state.ocrRegions[key];
      
      // Use eval() to convert the string to an object
      try {
        state.ocrRegions[key] = eval(`(${stringVar})`); // Turns string into an object
      } catch (error) {
        console.error('Error parsing string to object:', error);
      }
    }
  }
  for (let key in state.pixelCoords) {
    if (state.pixelCoords.hasOwnProperty(key)) {
      const stringVar = state.pixelCoords[key];
      
      // Use eval() to convert the string to an object
      try {
        state.pixelCoords[key] = eval(`(${stringVar})`); // Turns string into an object
      } catch (error) {
        console.error('Error parsing string to object:', error);
      }
    }
  }
  for (let key in state.alerts) {
    if (state.alerts.hasOwnProperty(key)) {
      const stringVar = state.alerts[key];
      
      // Use eval() to convert the string to an object
      try {
        state.alerts[key] = eval(`(${stringVar})`); // Turns string into an object
      } catch (error) {
        console.error('Error parsing string to object:', error);
      }
    }
  }
}

// Save the contents of the state variable into config.ini
function saveConfig(filePath) {
  // Initialize an empty config object for writing
  let configForIni = {};

  // Loop through each section in the state variable
  for (let section in state) {
    if (state.hasOwnProperty(section)) {
      configForIni[section] = {};  // Create the section

      // Iterate through each key-value pair in the section
      for (let key in state[section]) {
        if (state[section].hasOwnProperty(key)) {
          // Convert each value to a JSON string for storage in ini format
          configForIni[section][key] = JSON.stringify(state[section][key]);
        }
      }
    }
  }

  // Use `ini.stringify` to format `configForIni` into ini format
  const iniString = ini.stringify(configForIni);

  // Write the formatted ini string to the specified file
  fs.writeFileSync(filePath, iniString, 'utf-8');
}

const unmodifiedImagePath = path.join(__dirname, 'assets/unmodifiedImage.png');
const modifiedImagePath = path.join(__dirname, 'assets/modifiedImage.png');

/**
 * Function to create the main application window.
 * Initializes the window and sets up its properties.
 * Initiates pixel checks and OCR every 1000ms and delivers results to components through IPC.
 */
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
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
    if (state['pixelCoords']['selected'].live) {
      const selectedRegion = state['pixelCoords']['selected'].regionSelected
      const selectedX = state['pixelCoords'][selectedRegion].x
      const selectedY = state['pixelCoords'][selectedRegion].y
      const color = robot.getPixelColor(selectedX, selectedY);
      win.webContents.send('pixelColor', { selectedX, selectedY, color }); // Sending pixel data
    }
    // Perform OCR on selected region
    if (state['ocrRegions']['selected'].live) {
      const selectedRegion = state['ocrRegions']['selected'].regionSelected
      const ocrText = await captureAndProcessScreenshot(state['ocrRegions'][selectedRegion]);
      win.webContents.send('ocrText', { ocrText }); // Sending OCR data
    }
  }, 1000); // Interval set to 1000 milliseconds 
}

// Create overlay window which will be displayed during gameplay
function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    fullscreen: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false, // Prevents the overlay from getting focus
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'overlayPreload.js'),
    }
  });

  overlayWindow.setIgnoreMouseEvents(true); // Makes it click-through
  overlayWindow.loadFile('src/renderer/overlay.html'); // Load overlay HTML file
  overlayWindow.hide(); // Start hidden
  const alerts=state['alerts']
  overlayWindow.webContents.on('did-finish-load', () => {
    overlayWindow.webContents.send('initAlerts', alerts); // Send initial data after loading
  });

  win.on('close', () => {
    overlayWindow.close(); // Close the overlay window
  });
}

// Function to capture, save, and process screenshots
async function captureAndProcessScreenshot(ocrRegion) {
  // Capture the screen based on the passed ocrRegion
  const screenshot = robot.screen.capture(ocrRegion.x, ocrRegion.y, ocrRegion.width, ocrRegion.height);

  try {
    // Save the original screenshot as PNG
    await saveScreenshotAsPNG(screenshot, unmodifiedImagePath);

    // Process and save the modified image
    await processAndSaveModifiedImage(unmodifiedImagePath, modifiedImagePath, ocrRegion);

    // Perform OCR on the modified image (optional: you can also do OCR on the unmodified image)
    const text = await recognizeTextFromImage(modifiedImagePath);
    return text.trim(); // Return the recognized text
  } catch (error) {
    console.error('Error during OCR recognition:', error);
    return ''; // Return empty string in case of error
  }
}

// Reuse this function to save original screenshot as PNG
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

// New function to process and save the modified image using Jimp
async function processAndSaveModifiedImage(inputPath, outputPath, { brightness, contrast, invert }) {
  try {
    const image = await Jimp.read(inputPath);

    // Apply transformations based on OCR region settings
    if (invert) image.invert();
    image.brightness((brightness*2) - 1); // Adjust brightness (Jimp uses -1 to 1 scale)
    image.contrast((contrast*2)-1); // Adjust contrast
    image.resize(image.bitmap.width * 5, image.bitmap.height * 5, Jimp.RESIZE_HERMITE);
    image.greyscale();
    // Save the modified image
    await image.writeAsync(outputPath);
  } catch (error) {
    console.error('Error processing and saving modified image:', error);
  }
}

// Function to recognize text from an image file
function recognizeTextFromImage(imagePath) {
  return new Promise((resolve, reject) => {
    const src = fs.readFileSync(imagePath);
    const img = new Image();
    img.src = src;

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // Use OCRAD to process the canvas directly
    const text = OCRAD(canvas);
    resolve(text); // Resolve with the recognized text
  });
}

// Run Autohotkey scripts to capture user mouse clicks to select coordinates. 
ipcMain.on('run-ahk-script', async (event, {scriptName, arg1, arg2}) => {
  // getBoxCoords.ahk collects two mouse clicks, getPixelCoords.ahk collects one click
  const ahkPath = path.join(__dirname, '../scripts/AutoHotkeyA32.exe');
  const ahkScript = path.join(__dirname, `../scripts/${scriptName}.ahk`);
  const ahkProcess = spawn(ahkPath, [ahkScript, arg1, arg2]);

  // AHK script stdout variable returns mouse click coordinate values
  ahkProcess.stdout.on('data', async (data) => {
    const output = data.toString().trim();
    if (output) {
      if (scriptName === 'getBoxCoords') {
        // Put stdout into variables
        const [x1, y1, x2, y2] = output.split(" ").map(Number);
        console.log(`Setting OCR region to: (${x1}, ${y1}) to (${x2}, ${y2})`);

        // Update coordinates for .regionSelected
        const thisRegion = state['ocrRegions']['selected'].regionSelected
        const thisData = {
          x: x1,
          y: y1,
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1)
        };
        state['ocrRegions'][thisRegion] = { ...state['ocrRegions'][thisRegion], ...thisData };
      
        // Perform OCR and send the recognized text
        const ocrText = await captureAndProcessScreenshot(state['ocrRegions'][thisRegion]);
        win.webContents.send('ocrText', { ocrText });
        console.log('Image processed and saved successfully');
    
        // Read and send the images
        const unmodifiedImageData = fs.readFileSync('src/assets/unmodifiedImage.png');
        const modifiedImageData = fs.readFileSync('src/assets/modifiedImage.png');
        win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
        console.log('Sent both images'); 
      } else if (scriptName === 'getPixelCoords'){
        // Put stdout into variables
        const [x1, y1] = output.split(" ").map(Number);
        console.log(`Setting Pixel to: (${x1}, ${y1})`);

        // Update coordinates and desired color for .regionSelected
        const thisRegion = state['pixelCoords']['selected'].regionSelected
        thisData = {
          x: x1,
          y: y1,
          color: robot.getPixelColor(x1, y1),
        };
        state['pixelCoords'][thisRegion] = { ...state['pixelCoords'][thisRegion], ...thisData };
      
        // Send current coords and color of new pixel to be displayed by component
        win.webContents.send('pixelColor', { x, y, color });
      }      
      saveConfig('src/config/config.ini');   
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

// Update the state variable after changes to corresponding variables in the components
ipcMain.on('update-variable', async (event, { variableName, key, value }) => {
  try {
    if (!state[variableName]) {
      console.error(`Key ${variableName} not found in state`);
    } else if (!state[variableName][key]) {
      state[variableName][key] = value;
      console.error(`Key ${key} not found in state[${variableName}]`);
    } else {

      // Update the variable data key by key
      state[variableName][key] = { ...state[variableName][key], ...value };
      console.log(`Updated state[${variableName}][${key}]:`, value);
      
      if (variableName === 'ocrRegions') {
        region = state['ocrRegions']['selected'].regionSelected

        // Process add new region request 
        if (!state['ocrRegions']['selected'].regions.includes(region)) {
          // Set default config for the new region
          state['ocrRegions'][region] = { ...state['ocrRegions']['ocrDefault'] };
          // Add the region to the regions list
          state['ocrRegions']['selected'].regions.push(region);
          console.log(`Added new region: ${region} with default config`, state['ocrRegions']['selected'].regions);
        }       

        // Perform OCR and send the recognized text
        const ocrText = await captureAndProcessScreenshot(state[variableName][region]);
        win.webContents.send('ocrText', { ocrText });
        console.log('Image processed and saved successfully');

        // Send the updated images
        const unmodifiedImageData = fs.readFileSync('src/assets/unmodifiedImage.png');
        const modifiedImageData = fs.readFileSync('src/assets/modifiedImage.png');
        win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
        console.log('Sent both images');
      }
    }
    if (key === 'selected' ) {
      // Handle region change and component load by sending config and listbox data
      const selectedRegion = state[variableName].selected.regionSelected;
      const selectedValues = state[variableName][selectedRegion];
      const selectedList = state[variableName]['selected'];
      win.webContents.send('updateList', { selectedList });
      win.webContents.send('updateConfig', { selectedValues });
      console.log(`Main replied: `, selectedList);
    }
    saveConfig('src/config/config.ini');
  } catch (error) {
    console.error('Error updating variable:', error);
  }
});

// IPC listener to toggle overlay visibility
ipcMain.on('toggle-overlay', (event) => {
  if (overlayWindow.isVisible()) {
    overlayWindow.hide();
  } else {
    const alerts = state['alerts']
    overlayWindow.webContents.send('updateAlerts', alerts);
    overlayWindow.show();
  }
});

