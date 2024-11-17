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

const isDev = process.env.NODE_ENV === 'development'; // Set NODE_ENV in development
const basePath = isDev 
  ? __dirname  // In development, use the src folder directly 
  : path.join(process.resourcesPath, 'app/src'); // Adjust for the packaged app

const configPath = path.join(basePath, 'config/config.ini');
const unmodifiedImagePath = path.join(basePath, 'assets/unmodifiedImage.png');
const modifiedImagePath = path.join(basePath, 'assets/modifiedImage.png');
const pixelsDefaultImagePath = path.join(basePath, 'assets/pixelsDefault.png');
const overlayHTMLPath = path.join(basePath, 'renderer/overlay.html');
const indexHTMLPath = path.join(basePath, 'renderer/index.html');

console.log(configPath);
// Event listener for when the application is ready
app.on('ready', () => {
  // Load config before creating the window
  loadConfig(configPath);
  
  // Now create the windows after their config is loaded
  createWindow();
  createOverlayWindow();
});

// Quit the app when all windows are closed, unless on macOS
app.on('window-all-closed', () => {
  saveConfig(configPath);
  if (process.platform !== 'darwin') app.quit();
});

// Read the contents of config.ini into the state variable
function loadConfig(filePath) {
  const rawConfig = fs.readFileSync(filePath, 'utf-8');
  state = ini.parse(rawConfig);

  // Parse OCR and pixel coordinates safely if saved as JSON strings
  for (const section of ['ocrRegions', 'pixelCoords', 'alerts', 'conditions']) {
    for (const key in state[section]) {
      try {
        state[section][key] = JSON.parse(state[section][key]);
      } catch (error) {
        console.error(`Error parsing ${section} configuration for ${key}:`, error);
      }
    }
  }
  console.log(state);
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



/**
 * Function to create the main application window.
 * Initializes the window and sets up its properties.
 * Initiates pixel checks and OCR every 1000ms and delivers results to components through IPC.
 */
function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true, // Important for enabling IPC usage
      preload: path.join(basePath, 'preload.js'), // Path to preload.js
    }
  });

  // Load the HTML file for the renderer process
  win.loadFile(indexHTMLPath);

  // Set an interval to monitor the pixel color and OCR repeatedly
  setInterval(async () => {
    // Evaluate all conditions and send list of alerts to the overlay in game mode
    if (state['conditions']['selected'].live) {
      const alertList = await evaluateConditions();
      overlayWindow.webContents.send('updateVisibleAlerts', alertList);
      console.log(`Alert list: `, alertList);
    }  
  
    // Get the pixel color from selected pixel on Pixel Selector component
    if (state['pixelCoords']['selected'].live) {
      const selectedRegion = state['pixelCoords']['selected'].regionSelected
      const selectedX = state['pixelCoords'][selectedRegion].x
      const selectedY = state['pixelCoords'][selectedRegion].y
      const liveColor = robot.getPixelColor(selectedX, selectedY);
      win.webContents.send('pixelColor', { liveColor }); // Sending pixel data
    }
    // Perform OCR on selected region on OCR Configurator component
    if (state['ocrRegions']['selected'].live) {
      const selectedRegion = state['ocrRegions']['selected'].regionSelected
      const ocrText = await captureAndProcessScreenshot(state['ocrRegions'][selectedRegion]);
      win.webContents.send('ocrText', { ocrText }); // Sending OCR data
      // Send the updated images
      const unmodifiedImageData = fs.readFileSync(unmodifiedImagePath);
      const modifiedImageData = fs.readFileSync(modifiedImagePath);
      win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
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
      preload: path.join(basePath, 'overlayPreload.js'),
    }
  });

  overlayWindow.setIgnoreMouseEvents(true, {forward: true}); // Makes it click-through
  overlayWindow.loadFile(overlayHTMLPath); // Load overlay HTML file
  overlayWindow.hide(); // Start hidden
  overlayWindow.webContents.on('did-finish-load', () => {
    overlayWindow.webContents.send('initAlerts', state['alerts']); // Send initial data after loading
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

// Function to perform OCR and check pixel conditions
async function evaluateConditions() {
  const alerts = []; // Store triggered alerts

  // Loop through each condition in the state['conditions']
  for (const conditionKey in state['conditions']) {
    const condition = state['conditions'][conditionKey];
    let truecount = 0;
    let falsecount = 0;
    if (conditionKey === 'selected' || conditionKey === 'conditionsDefault') {
      continue;
    }
    // Check OCR regions if available
    if (condition.ocrRegions) {
      // Perform OCR within the specified region
      const ocrRegion = condition.ocrRegions;
      const ocrText = await captureAndProcessScreenshot(state['ocrRegions'][ocrRegion]);

      // Check if OCR result matches the regex
      const regex = new RegExp(condition.regex);
      const match = ocrText.match(regex);

      if (match) {
        // Loop through each target in the matches array and perform the comparison
        for (let i = 0; i < condition.matches.length; i++) {
          const target = condition.matches[i];
          const matchedText = match[i + 1]; // Assuming capturing groups start from index 1 in the match array
          // Perform comparison based on the specified type
          switch (target[0]) {
            case 'equals':
              matchedText === target[1] ? truecount++ : falsecount++;
              break;
            case 'notEquals':
              matchedText !== target[1] ? truecount++ : falsecount++;
              break;
            case 'lessThan':
              parseInt(matchedText, 10) <  parseInt(target[1], 10) ? truecount++ : falsecount++;
              break;
            case 'greaterThan':
              parseInt(matchedText, 10) > parseInt(target[1], 10) ? truecount++ : falsecount++;
              break;
            case 'between':
              parseInt(matchedText, 10) > parseInt(target[1], 10) && parseInt(matchedText, 10) < parseInt(target[2], 10) ? truecount++ : falsecount++;
              break;
            default:
              console.warn(`Unknown comparison type: ${target[0]}`);
          }
        }

      }
    }

    // Check pixel color conditions if available
    if (condition.pixelCoords.length > 0) {
      for (let i = 0; i < condition.pixelCoords.length; i++) {
        const pixelCoord = condition.pixelCoords[i];
        const { x, y, color } = state['pixelCoords'][pixelCoord];
        const comparison = condition.pixelComparison[i];
        if (x && y) {
          // Get the color at specified pixel using RobotJS
          const colorAtPixel = robot.getPixelColor(x, y);

          // Check color based on the specified comparison
          if (comparison === "equals" && colorAtPixel === color) {
            truecount++;
          } else if (comparison === "notEquals" && colorAtPixel !== color) {
            truecount++;
          } else {
            falsecount++;
          }
        }
      }
    }

    // If all conditions for this alert are met, add it to alerts array
    if (truecount > 0 && falsecount === 0) {
      alerts.push(condition.alert);
    }
  }
  return alerts;
}


// Run Autohotkey scripts to capture user mouse clicks to select coordinates. 
ipcMain.on('run-ahk-script', async (event, {scriptName, arg1, arg2}) => {
  console.log('starting ahk script');
  // getBoxCoords.ahk collects two mouse clicks, getPixelCoords.ahk collects one click
  const ahkPath = path.join(basePath, '../scripts/AutoHotkeyA32.exe');
  const ahkScript = path.join(basePath, `../scripts/${scriptName}.ahk`);
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
        win.webContents.send('updateConfig', { thisData });
        console.log('Image processed and saved successfully');
    
        // Read and send the images
        const unmodifiedImageData = fs.readFileSync(unmodifiedImagePath);
        const modifiedImageData = fs.readFileSync(modifiedImagePath);
        win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
        console.log('Sent both images'); 
      } else if (scriptName === 'getPixelCoords'){
        // Put stdout into variables
        const [x1, y1] = output.split(" ").map(Number);

        // Update coordinates and desired color for .regionSelected
        const thisRegion = state['pixelCoords']['selected'].regionSelected

        const screenshot = robot.screen.capture(x1-50, y1-50, 100, 100);
        const imagePath = path.join(basePath, `assets/${thisRegion}.png`);
        await saveScreenshotAsPNG(screenshot, imagePath);
        const imageData = fs.readFileSync(imagePath);
        win.webContents.send('updatePixelImages', { imageData });

        const pixelData = {
          x: x1,
          y: y1,
          color: robot.getPixelColor(x1, y1),
        };
        console.log(`Setting Pixel to: (${x1}, ${y1}), color:${pixelData.color}`);

        state['pixelCoords'][thisRegion] = { ...state['pixelCoords'][thisRegion], ...pixelData };
        // Send current coords and color of new pixel to be displayed by component
        win.webContents.send('updateConfig', { pixelData });
      }      
      saveConfig(configPath);   
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
      
      region = state[variableName]['selected'].regionSelected

      // Process add new region request 
      if (!state[variableName]['selected'].regions.includes(region) && !state[variableName][region]) {
        // Set default config for the new region
        state[variableName][region] = { ...state[variableName][`${variableName}Default`] };
        // Add the region to the regions list
        state[variableName]['selected'].regions.push(region);
        console.log(`Added new region: ${region} with default config`, state[variableName]['selected'].regions);
      } 
      // Process delete region request
      if (!state[variableName]['selected'].regions.includes(region) && state[variableName][region]) {
        if (variableName === 'pixelCoords') {
          fs.unlinkSync(`src/assets/${region}.png`);
        }
        delete state[variableName][region];
        state[variableName]['selected'].regionSelected = state[variableName]['selected'].regions[0];
      }

      region = state[variableName]['selected'].regionSelected
      const regionImagePath = path.join(basePath, `assets/${region}.png`);

      if (variableName === 'ocrRegions') {
        // Perform OCR and send the recognized text
        const ocrText = await captureAndProcessScreenshot(state[variableName][region]);
        win.webContents.send('ocrText', { ocrText });
        console.log('Image processed and saved successfully');

        // Send the updated images
        const unmodifiedImageData = fs.readFileSync(unmodifiedImagePath);
        const modifiedImageData = fs.readFileSync(modifiedImagePath);
        win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
        console.log('Sent both images');
      }
      if (variableName === 'pixelCoords') {
        if (!fs.existsSync(regionImagePath)) {
          fs.copyFileSync(pixelsDefaultImagePath, regionImagePath)
        }
        const imageData = fs.readFileSync(regionImagePath);
        win.webContents.send('updatePixelImages', { imageData });
        console.log(`sent image for: ${region}`);
       }
    }
    if (key === 'selected' ) {
      // Handle region change and component load by sending config and listbox data
      const selectedRegion = state[variableName].selected.regionSelected;
      const selectedValues = state[variableName][selectedRegion];
      if (variableName === 'conditions') {
        state['conditions']['selected'].ocrRegions = state['ocrRegions']['selected'].regions;
        state['conditions']['selected'].pixelRegions = state['pixelCoords']['selected'].regions;
        state['conditions']['selected'].alertRegions = state['alerts']['selected'].regions;
      }
      const selectedList = state[variableName]['selected'];
      win.webContents.send('updateList', { selectedList });
      win.webContents.send('updateConfig', { selectedValues });
      console.log(`Main replied: `, selectedList);
    }
    saveConfig(configPath);
  } catch (error) {
    console.error('Error updating variable:', error);
  }
});

// IPC listener to show overlay with draggable controls
ipcMain.on('showDraggableOverlay', (event) => {
  overlayWindow.setIgnoreMouseEvents(false, { forward: true });
  overlayWindow.webContents.send('dragAlerts', state['alerts']);
  overlayWindow.show();
  win.hide();
});

// Listen to hide overlay with draggable controls
ipcMain.on('hideDraggableOverlay', (event) => {
  console.log('received hide draggable overlay event in main.js');
  overlayWindow.setIgnoreMouseEvents(true, { forward: true }); // Disable click-through in edit mode
  overlayWindow.hide();
  win.show()
});

// IPC listener to toggle game-mode click-through overlay
ipcMain.on('toggleGameModeOverlay', (event) => {
  if (!state['conditions']['selected'].live) {
    overlayWindow.webContents.send('initAlerts', state['alerts']);
    state['conditions']['selected'].live = true;
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.show();
  } else {
    state['conditions']['selected'].live = false;
    overlayWindow.hide();
  }
});


