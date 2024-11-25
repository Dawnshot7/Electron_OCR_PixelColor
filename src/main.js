// Import necessary modules from Electron and RobotJS
const { app, Menu, BrowserWindow } = require('electron'); // Electron APIs. Robotjs requires Electron v17.4.11
const { ipcMain } = require('electron'); // Transmit data to Vue components and back to main.js
const robot = require('robotjs'); // RobotJS for taking screenshots and getting pixel color
const fs = require('fs'); // Read from and write to config.ini and image files 
const path = require('path'); // Module for handling and transforming file paths
const OCRAD = require('ocrad.js');  // OCRAD to perform OCR on screenshots
const { createCanvas, Image } = require('canvas');  // Used to modify screenshot images before OCR 
const { PNG } = require('pngjs'); // For handling PNG image format
const { spawn } = require('child_process'); // AutoHotkey scripts are spawned with parameters, and return stdout
const Jimp = require('jimp'); // Used to modify screenshot images before OCR 
const ini = require('ini'); // Configuration data is stored in a .ini format between sessions

let win; // Variable to hold the reference to the main application window
let overlayWindow; // Variable to hold the reference to the transparent alert window
let state = {}; // Variable to hold all configuration data from config.ini after JSON.parse is performed in loadConfig()

// Modify basePath to work as the correct path to main.js in both development and production
const isDev = process.env.NODE_ENV === 'development'; 
const basePath = isDev 
  ? __dirname  // In development, use the src folder directly 
  : path.join(process.resourcesPath, 'app/src'); // Adjust for the packaged app

// Use basePath to construct all paths used in main.js
const defaultProfilePath = path.join(basePath, 'config/profileDefault.ini');
const pixelsDefaultImagePath = path.join(basePath, 'assets/pixelsDefault.png');
const overlayHTMLPath = path.join(basePath, 'renderer/overlay.html');
const indexHTMLPath = path.join(basePath, 'renderer/index.html');
const unmodifiedImagePath = path.join(basePath, `assets/unmodifiedImage.png`);
const modifiedImagePath = path.join(basePath, `assets/modifiedImage.png`);

// Read saved selected profile from settings.txt to determine what configPath to use at initiation
const settingsPath = path.join(basePath, 'config/settings.txt');
let currentProfile = fs.readFileSync(settingsPath, 'utf-8').trim();
const configFolderPath = path.join(basePath, 'config'); 
let configPath = path.join(configFolderPath, `${currentProfile}`);

// Collect the names of all available profiles to populate 'open profile' menu option
let savedProfiles = [];
fs.readdir(configFolderPath, (err, files) => {
  files.forEach(file => {
    if (file !== "profileDefault.ini" && file !== "settings.txt") {
      savedProfiles.push(file);
    }
  });
  createMenu();
});

// Tracks currently open component tab
let currentComponent = 'ocrRegions'

// Event listener for when the application is ready
app.on('ready', () => {
  // Load config before creating the window
  loadConfig(configPath);

  // Now create the windows after their config is loaded
  createWindow();
  createOverlayWindow();
});

// Quit the app and save config data when all windows are closed, unless on macOS
app.on('window-all-closed', () => {
  saveConfig(configPath);
  if (process.platform !== 'darwin') app.quit();
});

// Read the contents of config.ini into the state map variable
function loadConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.copyFileSync(defaultProfilePath, filePath)
  }
  const rawConfig = fs.readFileSync(filePath, 'utf-8');
  state = ini.parse(rawConfig);

  // Parse .ini values saved as JSON strings into a map
  for (const section of ['ocrRegions', 'pixelCoords', 'alerts', 'conditions', 'automation']) {
    for (const key in state[section]) {
      try {
        state[section][key] = JSON.parse(state[section][key]);
      } catch (error) {
        console.error(`Error parsing ${section} configuration for ${key}:`, error);
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

/**
 * Functions to create, initiate, and set properties and menu of the main application window.
 * Sets an interval to evaluate user-defined conditions, perform pixel checks and OCR every 1000ms 
 * Delivers results to the renderer through IPC.
 */

// Build main window file menu
const createMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Profile', click: newProfile },
        { label: 'Open Profile', 
          submenu: savedProfiles.map(profile => ({
            label: profile.slice(0, -4),
            click: () => openProfile(profile), // Function call with profile as argument
          })), 
        },
        { label: 'Delete Profile', click: deleteProfile },
        { Label: 'Exit', role: 'quit' }
      ]
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

const fsPromises = fs.promises; // Import the promise-based API

// Menu option to create a new profile (config .ini file) from default profile  
async function newProfile() {
  // Find a novel filename
  let index = 1;
  let newProfile = `profile${index}.ini`;
  while (savedProfiles.includes(newProfile)) {
    newProfile = `profile${index}.ini`;
    index++;
  } 

  // Update current profile and profiles list variables with new profile name and update application menu
  configPath = path.join(configFolderPath, `${newProfile}`);
  await fsPromises.writeFile(settingsPath, newProfile, 'utf-8');
  currentProfile = newProfile;
  savedProfiles.push(newProfile);
  createMenu();

  // Make new assets folder
  const newAssetPath = path.join(basePath, `assets/${newProfile.slice(0, -4)}`);
  await fsPromises.mkdir(newAssetPath);
  await fsPromises.copyFile(path.join(basePath, 'assets/pixelsDefault.png'), path.join(newAssetPath, 'pixel1.png'));
  await fsPromises.copyFile(path.join(basePath, 'assets/pixelsDefault.png'), path.join(newAssetPath, 'ocr1.png'));

  // Copy default profile config settings into new profile and load into the state variable
  await fsPromises.copyFile(defaultProfilePath, configPath);
  loadConfig(configPath);

  // Update state variable and component regarding new profile name, and set initial component configuration data.
  state['ocrRegions'].selected.profile = newProfile.slice(0, -4);
  state['pixelCoords'].selected.profile = newProfile.slice(0, -4);
  state['alerts'].selected.profile = newProfile.slice(0, -4);
  state['conditions'].selected.profile = newProfile.slice(0, -4);
  saveConfig(configPath);  

  // Function to use new config to reperform ocr and update component variables and images 
  updateComponents(currentComponent);
}

// Menu option to open a saved config .ini file  
async function openProfile(newProfile) {
  // Set profile variables and load new config file
  await fsPromises.writeFile(settingsPath, newProfile, 'utf-8');
  currentProfile = newProfile;
  configPath = path.join(configFolderPath, newProfile);
  loadConfig(configPath);

  // Function to use new config to reperform ocr and update component variables and images 
  updateComponents(currentComponent);
}

// Menu option to rename current config .ini file 
ipcMain.on('renameProfile', async (event, newProfile) => {
  if (savedProfiles.includes(newProfile)) {
    return
  } 

  // Copy config file to new filename and set new configPath 
  const oldConfigPath = configPath;
  configPath = path.join(configFolderPath, `${newProfile}`);
  await fsPromises.copyFile(oldConfigPath, configPath);
  await fsPromises.unlink(oldConfigPath);

  // Change assets folder
  const oldAssetPath = path.join(basePath, `assets/${currentProfile.slice(0, -4)}`);
  const newAssetPath = path.join(basePath, `assets/${newProfile.slice(0, -4)}`);
  await fsPromises.mkdir(newAssetPath);
  const files = await fsPromises.readdir(oldAssetPath);
  await Promise.all(files.map(file => 
    fsPromises.copyFile(path.join(oldAssetPath, file), path.join(newAssetPath, file))
  ));
  await fsPromises.rmdir(oldAssetPath, { recursive: true });

  // Update the current profile and profile list variables
  await fsPromises.writeFile(settingsPath, newProfile, 'utf-8');
  const index = savedProfiles.indexOf(currentProfile);
  savedProfiles.splice(index, 1);
  savedProfiles.push(newProfile);
  currentProfile = newProfile;

  // Make updates in the application menu and state variable
  createMenu();
  state['ocrRegions'].selected.profile = newProfile.slice(0, -4);
  state['pixelCoords'].selected.profile = newProfile.slice(0, -4);
  state['alerts'].selected.profile = newProfile.slice(0, -4);
  state['conditions'].selected.profile = newProfile.slice(0, -4);
  saveConfig(configPath);  
});

// Menu option to delete current config .ini file 
async function deleteProfile() {
  // Delete config file
  await fsPromises.unlink(configPath);

  // Delete assets folder
  const assetsPath = path.join(basePath, `assets/${currentProfile.slice(0, -4)}`);
  await fsPromises.rmdir(assetsPath, { recursive: true });

  // Remove profile from profiles list and update the application menu
  const index = savedProfiles.indexOf(currentProfile);
  savedProfiles.splice(index, 1);
  createMenu();

  // if a profile remains in the list
  if (savedProfiles.length > 0) {
    // Update variables with newwly selected profile name and load profile
    const newProfile = savedProfiles[0];
    await fsPromises.writeFile(settingsPath, newProfile, 'utf-8');
    configPath = path.join(configFolderPath, newProfile);
    loadConfig(configPath);
    state['ocrRegions'].selected.profile = newProfile.slice(0, -4);
    state['pixelCoords'].selected.profile = newProfile.slice(0, -4);
    state['alerts'].selected.profile = newProfile.slice(0, -4);
    state['conditions'].selected.profile = newProfile.slice(0, -4);
    
    // Function to use new config to reperform ocr and update component variables and images 
    updateComponents(currentComponent);
  } else {
    // If no profiles remain create a new profile from default settings
    newProfile();
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1300, //1100 without dev tools
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true, // Important for enabling IPC usage
      preload: path.join(basePath, 'preload.js'), // Path to preload where IPC channels are defined
    }
  });

  // Load the HTML file for the renderer process
  win.loadFile(indexHTMLPath);
  win.webContents.openDevTools();
  // Initialize alert list used in evaluateConditions()
  let previousAlertList = [];

  // Define a function to handle repeated checks using setTimeout
  async function checkConditions() {
    try {
      // Evaluate all conditions in state['conditions'] and send list of visible alerts to the overlay when game-mode is active
      if (state['conditions']['selected'].live) {
        const alertList = await evaluateConditions();
        // Only update overlay if alertList has changed
        if (JSON.stringify(previousAlertList) !== JSON.stringify(alertList)) {
          overlayWindow.webContents.send('updateVisibleAlerts', alertList);
          console.log(`Alert list: `, alertList);
          previousAlertList = alertList;
        }
      }

      // Get the live pixel color from the selected pixel coordinate when Pixel Selector component live mode is active
      if (state['pixelCoords']['selected'].live) {
        const selectedRegion = state['pixelCoords']['selected'].regionSelected;
        const selectedX = state['pixelCoords'][selectedRegion].x;
        const selectedY = state['pixelCoords'][selectedRegion].y;
        const liveColor = robot.getPixelColor(selectedX, selectedY);
        win.webContents.send('pixelColor', { liveColor }); // Sending pixel data
      }

      // Perform live OCR on the selected region when OCR Configurator component live mode is active
      if (state['ocrRegions']['selected'].live) {
        const selectedRegion = state['ocrRegions']['selected'].regionSelected;
        const ocrText = await captureAndProcessScreenshot(state['ocrRegions'][selectedRegion]);
        win.webContents.send('ocrText', { ocrText }); // Sending OCR data

        // Send the updated images
        const unmodifiedImageData = fs.readFileSync(unmodifiedImagePath);
        const modifiedImageData = fs.readFileSync(modifiedImagePath);
        win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
      }
    } catch (error) {
      console.error("Error during condition evaluation:", error);
    } finally {
      // Schedule the next execution
      setTimeout(checkConditions, 500); // 500ms delay
    }
  }

  // Start the checking loop
  checkConditions();
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
  overlayWindow.loadFile(overlayHTMLPath); // Load the HTML file for the renderer process
  overlayWindow.hide(); // Start hidden

  overlayWindow.webContents.on('did-finish-load', () => {
    overlayWindow.webContents.send('initAlerts', state['alerts']); // Send initial alert data after loading
  });

  win.on('close', () => {
    overlayWindow.close(); // Close the overlay window when the main window closes
  });
}

// Function to capture, save, and process screenshots
async function captureAndProcessScreenshot(ocrRegion) {
  try {
    // Capture the screen based on the passed ocrRegion and save the screenshot as PNG
    await captureScreenshotAsPNG(ocrRegion, unmodifiedImagePath);

    // Process and save the modified image as another PNG
    await processAndSaveModifiedImage(unmodifiedImagePath, modifiedImagePath, ocrRegion);

    // Perform OCR on the modified image
    const text = await recognizeTextFromImage(modifiedImagePath);
    return text.trim(); // Return the recognized text
  } catch (error) {
    console.error('Error during OCR recognition:', error);
    return ''; // Return empty string in case of error
  }
}

// Capture screenshot as PNG
function captureScreenshotAsPNG(captureRegion, filePath) {
  return new Promise((resolve, reject) => {
    try {
      // Capture the screen based on the passed capture region
      const screenshot = robot.screen.capture(
        captureRegion.x,
        captureRegion.y,
        captureRegion.width,
        captureRegion.height
      );

      // Save screenshot as PNG
      const png = new PNG({ width: screenshot.width, height: screenshot.height });
      png.data = Buffer.from(screenshot.image);
      const buffer = PNG.sync.write(png);

      fs.writeFile(filePath, buffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    } catch (error) {
      reject(new Error(`Error capturing screenshot: ${error.message}`));
    }
  });
}

// Process and save the modified image using Sharp according to user-defined modification settings
async function processAndSaveModifiedImage(inputPath, outputPath, { brightness, contrast, invert }) {
  try {
    const image = await Jimp.read(inputPath);

    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    // Apply transformations based on OCR region settings. When in game-mode use process.nextTick for efficiency.
    if (state.conditions.selected.live) {
      process.nextTick(() => {
        if (invert) image.invert();
        image.greyscale();
        image.brightness((brightness * 2) - 1);
        image.contrast((contrast * 2) - 1);
        image.resize(originalWidth * 5, originalHeight * 5, Jimp.RESIZE_HERMITE);
      });
    } else {
      if (invert) image.invert();
      image.greyscale();
      image.brightness((brightness * 2) - 1);
      image.contrast((contrast * 2) - 1);
      image.resize(originalWidth * 5, originalHeight * 5, Jimp.RESIZE_HERMITE);
    }

    // Save the modified image
    await image.writeAsync(outputPath);
    await new Promise(resolve => setTimeout(resolve, 100)); // Add delay to allow disk write completion  } catch (error) {
  } catch (error) {
    console.error('Error processing and saving modified image:', error);
    throw new Error(`Processing error: ${error.message}`);
  }
}

// Function to recognize text from an image file using the OCRAD.js OCR module
function recognizeTextFromImage(imagePath) {
  return new Promise((resolve, reject) => {
    try {
      const src = fs.readFileSync(imagePath);
      const img = new Image();

      // Wait for the image to load before processing
      img.onload = () => {
        try {
          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);

          // Use OCRAD to process the canvas directly
          const text = OCRAD(canvas);
          resolve(text); // Resolve with the recognized text
        } catch (error) {
          reject(new Error(`Error during OCR processing: ${error.message}`));
        }
      };

      // Handle image loading errors
      img.onerror = (err) => {
        reject(new Error(`Failed to load image: ${err.message}`));
      };

      // Set the image source to trigger loading
      img.src = src;
    } catch (error) {
      reject(new Error(`Error reading image: ${error.message}`));
    }
  });
}

// Function to evaluate user-defined conditions for alert visibility by performing OCR and checking pixel colors
async function evaluateConditions() {
  let alerts = [];
  // Helper function to evaluate a single condition
  for (const [conditionKey, condition] of Object.entries(state['conditions'])) {
    // Ignore settings keys which don't contain a condition
    if (conditionKey === 'selected' || conditionKey === 'conditionsDefault') continue;

    // Alert will be shown if truecount is greater than 0 and falsecount equals 0
    let truecount = 0;
    let falsecount = 0;
    let ocrText = '';
    // Evaluate OCR region text with regex if the user included an OCR region in this condition
    if (condition.ocrRegions) {
      // Perform OCR within the specified region
      const ocrRegionData = state['ocrRegions'][condition.ocrRegions];
      if (ocrRegionData) {
        ocrText = await captureAndProcessScreenshot(ocrRegionData);

        // Check if OCR result matches the regex
        if (ocrText) {
          const regex = new RegExp(condition.regex);
          const match = ocrText.match(regex);

          if (match) {
            // Loop through each array in condition.matches and perform the requested comparison against the corresponding match group
            for (const target of condition.matches) {
              const matchedText = match[target.matchGroupIndex || 1]; // Match group text

              // Perform comparison based on the specified comparison type (structured to reduce cpu usage)
              // target[0] is comparison type. 
              // target[1] is text to compare against the match group. 
              // target[2] is only populated if the 'between' comparison is chosen
              switch (target[0]) {
                case 'equals':
                  truecount += matchedText === target[1] ? 1 : 0;
                  falsecount += matchedText !== target[1] ? 1 : 0;
                  break;
                case 'notEquals':
                  truecount += matchedText !== target[1] ? 1 : 0;
                  falsecount += matchedText === target[1] ? 1 : 0;
                  break;
                case 'lessThan':
                case 'greaterThan':
                case 'between': {
                  const numericValue = parseInt(matchedText, 10);
                  const target1 = parseInt(target[1], 10);
                  const target2 = parseInt(target[2] || 0, 10);

                  if (isNaN(numericValue)) {
                    falsecount++;
                    break;
                  }

                  if (
                    (target[0] === 'lessThan' && numericValue < target1) ||
                    (target[0] === 'greaterThan' && numericValue > target1) ||
                    (target[0] === 'between' && numericValue >= target1 && numericValue <= target2)
                  ) {
                    truecount++;
                  } else {
                    falsecount++;
                  }
                  break;
                }
                default:
                  console.warn(`Unknown comparison type: ${target[0]}`);
                  falsecount++;
                  break;
              }
            }
          } else { 
            falsecount++; 
          }
        } else { 
          falsecount++; 
        }
      } else { 
        falsecount++; 
      }
    }

    // Evaluate match status of listed pixel's color if the user included an pixel coordinates in this condition    
    if (condition.pixelCoords.length > 0) {
      for (let i = 0; i < condition.pixelCoords.length; i++) {
        const pixelCoord = condition.pixelCoords[i];
        const { x, y, color } = state['pixelCoords'][pixelCoord];
        const comparison = condition.pixelComparison[i];
        
		
        if (x && y) {
          const colorAtPixel = robot.getPixelColor(x, y);
          const matches = (comparison === "equals" && colorAtPixel === color) || 
                          (comparison === "notEquals" && colorAtPixel !== color);
          if (matches) truecount++;
          else falsecount++;
        } 
      }   
    }

    // Suppress alerts for conditions on a suppression timer, otherwise evaluate alert display status based on truecount and falsecount.
    const now = Date.now();
    const duration = parseInt(condition.timer, 10);
    if (duration > 0) {
      // Condition evaluating true triggers alert suppresion for a duration. Needs reset by evaluating false after each true evaluation.
      if ((truecount > 0 && falsecount === 0) && !condition.resetNeeded) { // Reset is not currently needed and condition is triggered
        condition.resetNeeded = true;
        state['conditions'][conditionKey].startTime = now; // For duration of timer falsecount++ will be applied in suppression section below
      } else if (!(truecount > 0 && falsecount === 0) && condition.resetNeeded) { 
        condition.resetNeeded = false; // Reset was needed, and reset is applied because !matches.
      } 

      if (condition.startTime > 0) {
        const elapsed = (now - condition.startTime) / 1000; // Convert to seconds
        if (elapsed >= duration) {
          state['conditions'][conditionKey].startTime = 0;
          alerts.push(condition.alert);
        }
      } else {
        alerts.push(condition.alert);
      }
    } 
    else if (truecount > 0 && falsecount === 0) { // If all conditions for this alert are met, add it to alerts array to be made visible in overlay    
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
        // Put stdout into variables for the new top left and bottom right corners of the currently selected OCR region box
        const [x1, y1, x2, y2] = output.split(" ").map(Number);
        console.log(`Setting OCR region to: (${x1}, ${y1}) to (${x2}, ${y2})`);

        // Update coordinates for currently selected OCR region
        const thisRegion = state['ocrRegions']['selected'].regionSelected
        const thisData = {
          x: x1,
          y: y1,
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1)
        };
        state['ocrRegions'][thisRegion] = { ...state['ocrRegions'][thisRegion], ...thisData };
      
        // Perform OCR and send the recognized text and new OCR region configuration settings to the renderer
        const ocrText = await captureAndProcessScreenshot(state['ocrRegions'][thisRegion]);
        await fsPromises.copyFile(unmodifiedImagePath,path.join(basePath, `assets/${currentProfile.slice(0, -4)}/${thisRegion}.png`));
        win.webContents.send('ocrText', { ocrText });
        win.webContents.send('updateConfig', { thisData });
        console.log('Image processed and saved successfully');
    
        // Read and send the images using the new box coordinates and configuration settings
        const unmodifiedImageData = fs.readFileSync(unmodifiedImagePath);
        const modifiedImageData = fs.readFileSync(modifiedImagePath);
        win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
        console.log('Sent both images'); 
      } else if (scriptName === 'getPixelCoords'){
        // Put stdout into variables for the new coordinate of the currently selected pixel
        const [x1, y1] = output.split(" ").map(Number);

        // Take a screenshot of the region around the mouse position, save as PNG, and send to renderer
        const thisRegion = state['pixelCoords']['selected'].regionSelected
        const screenshotCoordinates = { x: x1-50, y: y1-50, width: 100, height: 100 };
        const imagePath = path.join(basePath, `assets/${currentProfile.slice(0, -4)}/${thisRegion}.png`);
        await captureScreenshotAsPNG(screenshotCoordinates, imagePath);
        const imageData = fs.readFileSync(imagePath);
        win.webContents.send('updatePixelImages', { imageData });

        // Update pixel coordinates and target pixel color variables, and send new configuration settings to the renderer
        const pixelData = {
          x: x1,
          y: y1,
          color: robot.getPixelColor(x1, y1),
        };
        console.log(`Setting Pixel to: (${x1}, ${y1}), color:${pixelData.color}`);
        state['pixelCoords'][thisRegion] = { ...state['pixelCoords'][thisRegion], ...pixelData };
        win.webContents.send('updateConfig', { pixelData });
      }      

      // Save new settings to config.ini
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
      console.error(`Key ${key} not found in state[${variableName}]`);
    } else {
      currentComponent = variableName;
      // Update the variable data key by key
      state[variableName][key] = { ...state[variableName][key], ...value };
      console.log(`Updated state[${variableName}][${key}]:`, value);
      
      // Currently selected ocr region/alert/pixel/condition
      region = state[variableName]['selected'].regionSelected
      const regionImagePath = path.join(basePath, `assets/${currentProfile.slice(0, -4)}/${region}.png`);

      // Process add new region request when state[variableName] doesn't have config data for region, and region is not yet in the state[variableName]['selected'].regions array
      if (!state[variableName]['selected'].regions.includes(region) && !state[variableName][region]) {
        console.log(`Added new region: ${region} with default config`, state[variableName]['selected'].regions);
        // Set the config for the new region to the saved default configurations
        state[variableName][region] = { ...state[variableName][`${variableName}Default`] };
        // Add the region to the regions list
        state[variableName]['selected'].regions.push(region);
        // After new region addition, copy the default image saying "No pixel selected" to the region's image filename 
        if (variableName === 'pixelCoords' || variableName === 'ocrRegions') {
          if (!fs.existsSync(regionImagePath)) {
            fs.copyFileSync(pixelsDefaultImagePath, regionImagePath);
          }
        }
      } 
      // Process delete region request when state[variableName] has config data for region, but region is no longer in the state[variableName]['selected'].regions array
      if (!state[variableName]['selected'].regions.includes(region) && state[variableName][region]) {
        console.log(`Deleted new region: ${region} with default config`, state[variableName]['selected'].regions);
        delete state[variableName][region];
        state[variableName]['selected'].regionSelected = state[variableName]['selected'].regions[0];
        region = state[variableName]['selected'].regionSelected;
        // After region deletion, delete the saved image for that region
        if (variableName === 'pixelCoords' || variableName === 'ocrRegions') {
          if (fs.existsSync(regionImagePath)) {
            fs.unlinkSync(regionImagePath);
          }
        }
      }

      // Function to use new config to reperform ocr and update component variables and images 
      updateComponents(variableName);
    }  
    // Save configuration data config.ini after each change in configuration settings variables
    saveConfig(configPath);
  } catch (error) {
    console.error('Error updating variable:', error);
  }
});

// Function to use new config to reperform ocr and update component variables and images 
async function updateComponents(variableName) {
  region = state[variableName]['selected'].regionSelected
  const regionImagePath = path.join(basePath, `assets/${currentProfile.slice(0, -4)}/${region}.png`);

  if (variableName === 'ocrRegions' && !state.ocrRegions.selected.live) {
    // Perform OCR and send the recognized text after each config change
    await processAndSaveModifiedImage(regionImagePath, modifiedImagePath, state[variableName][region]);
    const ocrText = await recognizeTextFromImage(modifiedImagePath);
    win.webContents.send('ocrText', { ocrText });
    console.log('Image processed and saved successfully');

    // Send the updated images after each config change
    const unmodifiedImageData = fs.readFileSync(regionImagePath);
    const modifiedImageData = fs.readFileSync(modifiedImagePath);
    win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
    console.log('Sent both images');
  }
  if (variableName === 'pixelCoords') {
    // After new pixel region addition, copy the default image saying "No pixel selected" to the region's image filename and send to renderer
    const imageData = fs.readFileSync(regionImagePath);
    win.webContents.send('updatePixelImages', { imageData });
    console.log(`sent image for: ${region}`);
   }
  // Updates variables in component used to populate listboxes
  if (variableName === 'conditions') {
    // The conditions component needs these additional arrays to populate it's dropdown listboxes
    state['conditions']['selected'].ocrRegions = state['ocrRegions']['selected'].regions;
    state['conditions']['selected'].pixelRegions = state['pixelCoords']['selected'].regions;
    state['conditions']['selected'].alertRegions = state['alerts']['selected'].regions;
  }
  // Updates variables in component used to populate listboxes
  if (variableName === 'automation') {
    // The conditions automation needs these additional arrays to populate it's dropdown listboxes
    state['automation']['selected'].alertRegions = state['alerts']['selected'].regions;
  }
  const selectedList = state[variableName]['selected'];
  win.webContents.send('updateList', { selectedList });

  // Updates variables in component representing configuration data for selected ocr region/alert/pixel/condition
  const selectedRegion = state[variableName].selected.regionSelected;
  const selectedValues = state[variableName][selectedRegion];
  win.webContents.send('updateConfig', { selectedValues });
  //console.log(`Sent Config: `, JSON.stringify(selectedValues, null, 2));
}

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


