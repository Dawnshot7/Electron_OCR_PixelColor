// Import necessary modules from Electron and RobotJS
const { app, Menu, BrowserWindow, globalShortcut } = require('electron'); // Electron APIs. Robotjs requires Electron v17.4.11
const { ipcMain } = require('electron'); // Transmit data to Vue components and back to main.js
const robot = require('robotjs'); // RobotJS for taking screenshots and getting pixel color
const fs = require('fs'); // Read from and write to {currentProfile}.ini and image files 
const path = require('path'); // Module for handling and transforming file paths
const OCRAD = require('ocrad.js');  // OCRAD to perform OCR on screenshots
const { createCanvas, Image } = require('canvas');  // Used to modify screenshot images before OCR 
const { PNG } = require('pngjs'); // For handling PNG image format
const { spawn } = require('child_process'); // AutoHotkey scripts are spawned with parameters, and return stdout
const Jimp = require('jimp'); // Used to modify screenshot images before OCR 
const ini = require('ini'); // Configuration data is stored in a .ini format between sessions

let win; // Variable to hold the reference to the main application window
let overlayWindow; // Variable to hold the reference to the transparent alert window
let state = {}; // Variable to hold all configuration data from {currentProfile}.ini after JSON.parse is performed in loadConfig()

// Modify basePath to work as the correct path to main.js in both development and production
const isPackaged = require('electron').app.isPackaged;
const basePath = isPackaged 
  ? path.join(process.resourcesPath, 'app/src') // Adjust for the packaged app
  : __dirname; // In development, use the src folder directly 

// Use basePath to construct all paths used in main.js
const defaultProfilePath = path.join(basePath, 'config/profileDefault.ini');
const pixelsDefaultImagePath = path.join(basePath, 'assets/pixelsDefault.png');
const ocrDefaultImagePath = path.join(basePath, 'assets/ocrDefault.png');
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

// Read the contents of {currentProfile}.ini into the state map variable
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

// Save the contents of the state variable into {currentProfile}.ini
function saveConfig(filePath) {
  // Initialize an empty config object for writing
  let configForIni = {};

  // Loop through each section in the state variable
  for (let section in state) {
    if (state.hasOwnProperty(section)) {
      configForIni[section] = {}; // Create the section

      // Iterate through each key-value pair in the section
      for (let key in state[section]) {
        if (state[section].hasOwnProperty(key)) {
          const value = state[section][key];
          // Use JSON.stringify for objects/arrays
          configForIni[section][key] = JSON.stringify(value);
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
  state['automation'].selected.profile = newProfile.slice(0, -4);
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
  state['automation'].selected.profile = newProfile.slice(0, -4);
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
    state['automation'].selected.profile = newProfile.slice(0, -4);
    
    // Function to use new config to reperform ocr and update component variables and images 
    updateComponents(currentComponent);
  } else {
    // If no profiles remain create a new profile from default settings
    newProfile();
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true, // Important for enabling IPC usage
      preload: path.join(basePath, 'preload.js'), // Path to preload where IPC channels are defined
    }
  });

  // Load the HTML file for the renderer process
  win.loadFile(indexHTMLPath);
  //win.webContents.openDevTools();


  let previousAlertList = ['initial'];   // Initialize alert list used in evaluateConditions()
  let intervalId; // Interval ID for dynamic control
  let intervalOffset = 0; // Initialize offset to 0
  let isIntervalRunning = false; // Guard to prevent overlapping intervals

  // Function to update the interval dynamically
  function startInterval() {
    if (isIntervalRunning) {
      console.log("Interval already running. Skipping restart.");
      return;
    }

    isIntervalRunning = true; // Mark interval as running
    const live = state.automation.selected.live;
    const gcd = state.automation[state.automation.selected.regionSelected]?.gcd || 1.5; // Default GCD
    let interval = live ? gcd * 1000 : 500; // Base interval
  
    const durations = []; // Rolling window for iteration durations
    const adjustmentStep = 100; // Increment for interval adjustments
  
    intervalId = setInterval(async () => {
      const startTime = Date.now(); // Mark the start of the iteration
  
      try {
        // If automation is turned on by shortcut while condition evaluation is not active and overlay is not visible
        if (state['automation']['selected'].live && !state['conditions']['selected'].live) {
          toggleGameModeOverlay();
        }
  
        // Evaluate all conditions and update visible alerts. If automation is live, press buttons with autohotkey
        if (state['conditions']['selected'].live) {
          const alertList = await evaluateConditions();
          // If automation is live, run automate to determine what button to press, and press it with sendInput.ahk
          if (state['automation']['selected'].live) {
            const button = await automate(alertList);
            console.log(button);
            await runAhkScript('sendInput', button, '');
            alertList.push('alertAutomation');
          }
          alertList.push('alertOverlay');
          overlayWindow.webContents.send('updateVisibleAlerts', alertList);
          console.log(`Alert list: `, alertList);
          previousAlertList = alertList;
        }
  
        // Get the live pixel color when Pixel Selector component live mode is active
        if (state['pixelCoords']['selected'].live) {
          const selectedRegion = state['pixelCoords']['selected'].regionSelected;
          const selectedX = state['pixelCoords'][selectedRegion].x;
          const selectedY = state['pixelCoords'][selectedRegion].y;
          const liveColor = robot.getPixelColor(selectedX, selectedY);
          win.webContents.send('pixelColor', { liveColor });
        }
  
        // Perform live OCR when OCR Configurator component live mode is active
        if (state['ocrRegions']['selected'].live) {
          const selectedRegion = state['ocrRegions']['selected'].regionSelected;
          const ocrText = await captureAndProcessScreenshot(state['ocrRegions'][selectedRegion]);
          win.webContents.send('ocrText', { ocrText });
          // Send the updated images
          const unmodifiedImageData = fs.readFileSync(unmodifiedImagePath);
          const modifiedImageData = fs.readFileSync(modifiedImagePath);
          win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
        }
      } catch (error) {
        console.error("Error during condition evaluation:", error);
      } finally {
        const duration = Date.now() - startTime; // Calculate iteration duration
        durations.push(duration);
        if (durations.length > 5) durations.shift(); // Keep only the last 5 durations
  
        // Calculate the average duration of the last 5 iterations
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  
        // Adjust intervalOffset dynamically
        if (avgDuration >= (interval + intervalOffset) * 0.9) {
          intervalOffset += adjustmentStep; // Increase offset
          console.warn(`Increasing interval offset ${interval} to ${intervalOffset}ms due to high load.`);
        } else if (avgDuration <= (interval + intervalOffset) * 0.75 && intervalOffset > 0) {
          intervalOffset = Math.max(0, intervalOffset - adjustmentStep); // Decrease offset, minimum 0
          console.info(`Decreasing interval offset ${interval} to ${intervalOffset}ms as load is manageable.`);
        }
  
      }
    }, interval + intervalOffset); // Use the effective interval
    console.log("Interval started with effective interval:", interval + intervalOffset);
  }
  
  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      isIntervalRunning = false; // Mark interval as stopped
      console.log("Interval stopped.");
    }
  }

  // Example: Listen for changes in state.automation.selected.live or gcd
  // Replace this logic with your state management approach (e.g., Redux, IPC event listeners, etc.)
  win.webContents.on('did-finish-load', () => {
    // Simulated listener for state changes
    setInterval(() => {
      // If live state or regionSelected changes, restart the interval
      const live = state.automation.selected.live;
      const gcd = state.automation[state.automation.selected.regionSelected]?.gcd || 1.5;
      const expectedInterval = live ? gcd * 1000 : 500;

      // Restart interval only if the settings have changed
      if (!isIntervalRunning || expectedInterval !== (intervalId ? intervalId._idleTimeout : null)) {
        console.log(`Restarting interval due to state change...${isIntervalRunning} ${expectedInterval} ${intervalId} `);
        stopInterval();
        startInterval();
      }
    }, 500); // Check state changes every 500ms

    // Register a global shortcut (e.g., Ctrl+Shift+A)
    globalShortcut.register('Ctrl+Shift+A', () => {
      // Toggle the state
      const currentAutomation = state.automation.selected.regionSelected;
      if (state.automation[currentAutomation].gcdError || state.automation[currentAutomation].buttonErrors.some(err => err.trim() !== '') || state.automation[currentAutomation].conditionErrors.some(err => err.trim() !== '')) {
        return;
      } else {
        state['automation']['selected'].live = !state['automation']['selected'].live;
        console.log(
          `Automation live state toggled: ${state['automation']['selected'].live}`
        );
      }
    });
    globalShortcut.register('Ctrl+Shift+S', () => {
      // Toggle the game-mode alert overlay and condition evaluation
      toggleGameModeOverlay();
    });
  });
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
        image.resize(originalWidth * 5, originalHeight * 5, Jimp.RESIZE_BICUBIC);
      });
    } else {
      if (invert) image.invert();
      image.greyscale();
      image.brightness((brightness * 2) - 1);
      image.contrast((contrast * 2) - 1);
      image.resize(originalWidth * 5, originalHeight * 5, Jimp.RESIZE_BICUBIC);
    }

    // Save the modified image
    await image.writeAsync(outputPath);
    await new Promise(resolve => setTimeout(resolve, 100)); // Add delay to allow disk write completion  } catch (error) {
  } catch (error) {
    console.error('Error processing and saving modified image:', error);
    throw new Error(`Processing error: ${error.message}`);
  }
}

// Add crosshairs and save the modified image using Jimp
async function processImageWithCrosshairs(inputPath, outputPath) {
  try {
    const image = await Jimp.read(inputPath);

    // Crosshair properties
    const crosshairColor = Jimp.cssColorToHex('#808080'); // Grey color
    const lineThickness = 2;
    const centerX = Math.floor(image.getWidth() / 2);
    const centerY = Math.floor(image.getHeight() / 2);

    // Draw vertical line (center column)
    for (let dx = 0; dx < lineThickness; dx++) {
      const x = centerX - Math.floor(lineThickness / 2) + dx;
      if (x >= 0 && x < image.getWidth()) {
        image.scan(x, 0, 1, image.getHeight(), (x, y, idx) => {
          image.bitmap.data.writeUInt32BE(crosshairColor, idx);
        });
      }
    }

    // Draw horizontal line (center row)
    for (let dy = 0; dy < lineThickness; dy++) {
      const y = centerY - Math.floor(lineThickness / 2) + dy;
      if (y >= 0 && y < image.getHeight()) {
        image.scan(0, y, image.getWidth(), 1, (x, y, idx) => {
          image.bitmap.data.writeUInt32BE(crosshairColor, idx);
        });
      }
    }

    // Save the modified image
    await image.writeAsync(outputPath);
    console.log('Crosshairs added and image saved successfully:', outputPath);
  } catch (error) {
    console.error('Error processing and saving modified image:', error);
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
          // Replace ~ with \ in the regex pattern
          const sanitizedRegex = condition.regex.replace(/~/g, '\\');
          const regex = new RegExp(sanitizedRegex);
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
                case 'not equals':
                  truecount += matchedText !== target[1] ? 1 : 0;
                  falsecount += matchedText === target[1] ? 1 : 0;
                  break;
                case 'less than':
                case 'greater than':
                case 'between': {
                  const numericValue = parseInt(matchedText, 10);
                  const target1 = parseInt(target[1], 10);
                  const target2 = parseInt(target[2] || 0, 10);

                  if (isNaN(numericValue)) {
                    falsecount++;
                    break;
                  }

                  if (
                    (target[0] === 'less than' && numericValue < target1) ||
                    (target[0] === 'greater than' && numericValue > target1) ||
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
    let duration = parseInt(condition.timer, 10);

    if (condition.pixelCoords.length > 0) {
      for (let i = 0; i < condition.pixelCoords.length; i++) {
        const pixelCoord = condition.pixelCoords[i];
        const { x, y, color } = state['pixelCoords'][pixelCoord];
        const comparison = condition.pixelComparison[i];
        
		
        if (x && y) {
          const colorAtPixel = robot.getPixelColor(x, y);
          const matches = (comparison === "equals" && colorAtPixel === color) || 
          (comparison === "not equals" && colorAtPixel !== color);

          if (matches) truecount++;
          else {
            falsecount++;
            // A not-equals comparison evaluating to false hides the alert even if a suppression timer is set
            if (i > 0) {
              duration = 0;
              condition.resetNeeded = false;
              i=condition.pixelCoords.length;
            }
          }  
        } else {
          console.log('Pixel not in list');
        }
      }   
    }

    // Suppress alerts for conditions on a suppression timer, otherwise evaluate alert display status based on truecount and falsecount.
    const now = Date.now();
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

// Main automate function
async function automate(alertList) {
  const automationChoice = state.automation.selected.regionSelected
  const automationSettings = state['automation'][automationChoice];
  const operationsList = automationSettings.operationsList;
  
  // Evaluates the operations to find a matching button
  const evaluateOperations = () => {
    for (let i = 0; i < operationsList.length - 1; i++) {
      const [alertsToCheck, condition, button] = operationsList[i];

      if (!button) continue; // Skip operations with no button defined

      // Parse and evaluate the condition
      const conditionsMet = parseAndEvaluateCondition(condition, alertsToCheck, alertList);

      if (conditionsMet) {
        return button; // Return the button if the condition is met
      }
    }

    // Default action: return the button of the last operation
    return operationsList[operationsList.length - 1][2];
  };

  /**
   * Parse and evaluate a condition string safely using dynamic functions.
   * @param {string} conditionString - The user-defined condition.
   * @param {Array} alertsToCheck - The subset of alerts to evaluate.
   * @param {Array} alertList - The list of currently active alerts.
   * @returns {boolean} - True if the condition is met, false otherwise.
   */
  function parseAndEvaluateCondition(conditionString, alertsToCheck, alertList) {
    // Step 1: Sanitize the input to prevent code injection
    const sanitizedCondition = sanitizeCondition(conditionString);
    if (!sanitizedCondition) {
      console.error("Invalid condition syntax:", conditionString);
      return false; // Return false for invalid conditions
    }

    // Step 2: Replace alert indices with their evaluation logic
    const conditionWithLogic = replaceAlertIndices(sanitizedCondition, alertsToCheck, alertList);

    // Step 3: Create a dynamic function to evaluate the condition
    try {
      const conditionFunction = new Function(`return ${conditionWithLogic};`);
      return conditionFunction(); // Evaluate the condition dynamically
    } catch (error) {
      console.error("Error evaluating condition:", error);
      return false; // Return false if evaluation fails
    }
  }

  /**
   * Sanitizes the condition string to allow only valid syntax.
   * Valid elements: digits, spaces, "and", "or", "not", and parentheses.
   * @param {string} conditionString - The user-defined condition.
   * @returns {string|null} - The sanitized condition or null if invalid.
   */
  function sanitizeCondition(conditionString) {
    const validPattern = /^[\d\s()]+(?:and|or|not|[\d\s()])*$/gi;
    return validPattern.test(conditionString) ? conditionString.toLowerCase() : null;
  }

  /**
   * Replaces alert indices in the sanitized condition with logical checks.
   * @param {string} sanitizedCondition - The sanitized condition string.
   * @param {Array} alertsToCheck - The subset of alerts to evaluate.
   * @param {Array} alertList - The list of currently active alerts.
   * @returns {string} - The condition string with alert checks.
   */
  function replaceAlertIndices(sanitizedCondition, alertsToCheck, alertList) {
    return sanitizedCondition.replace(/\d+/g, (match) => {
      const index = parseInt(match, 10) - 1; // Convert 1-based index to 0-based
      const alert = alertsToCheck[index];
      return alert ? alertList.includes(alert) : false;
    });
  }

  // Run the evaluation
  return evaluateOperations();
}

// IPC listener for renderer-triggered requests
ipcMain.on('run-ahk-script', async (event, { scriptName, arg1, arg2 }) => {
  try {
    await runAhkScript(scriptName, arg1, arg2);
  } catch (error) {
    console.error(error);
  }
});

// Run Autohotkey scripts to capture user mouse clicks to select coordinates. 
async function runAhkScript(scriptName, arg1, arg2) {
  console.log('starting ahk script');
  // getBoxCoords.ahk collects two mouse clicks, getPixelCoords.ahk collects one click
  const ahkExePath = path.join(basePath, `../scripts/${scriptName}.exe`);
  const ahkProcess = spawn(ahkExePath, [arg1, arg2]);

  // AHK script stdout variable returns mouse click coordinate values
  ahkProcess.stdout.on('data', async (data) => {
    const output = data.toString().trim();
    if (output) {
      if (scriptName === 'getBoxCoords') {
        // Parse the coordinates
        const [x1, y1, x2, y2] = output.split(" ").map(Number);
        console.log(`Original coordinates: (${x1}, ${y1}) to (${x2}, ${y2})`);
    
        // Determine the top-left and bottom-right corners dynamically
        const topLeftX = Math.min(x1, x2);
        const topLeftY = Math.min(y1, y2);
        const bottomRightX = Math.max(x1, x2);
        const bottomRightY = Math.max(y1, y2);
    
        // Calculate width and height
        const width = bottomRightX - topLeftX;
        const height = bottomRightY - topLeftY;
    
        console.log(`Setting OCR region to: (${topLeftX}, ${topLeftY}) with width ${width} and height ${height}`);
    
        // Update coordinates for the currently selected OCR region
        const thisRegion = state['ocrRegions']['selected'].regionSelected;
        const thisData = {
            x: topLeftX,
            y: topLeftY,
            width,
            height
        };
        state['ocrRegions'][thisRegion] = { ...state['ocrRegions'][thisRegion], ...thisData };
    
        // Perform OCR and send recognized text and new OCR region configuration to the renderer
        const ocrText = await captureAndProcessScreenshot(state['ocrRegions'][thisRegion]);
        await fsPromises.copyFile(unmodifiedImagePath, path.join(basePath, `assets/${currentProfile.slice(0, -4)}/${thisRegion}.png`));
        win.webContents.send('ocrText', { ocrText });
    
        const component = 'ocrRegions';
        win.webContents.send('updateConfig', { component, thisData });
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
        await processImageWithCrosshairs(imagePath, imagePath);

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
        const component = 'pixelCoords';
        win.webContents.send('updateConfig', { component, pixelData });
      } else if (scriptName === 'sendInput'){
        console.log(`Script returned: `, output);
      }

      // Save new settings to {currentProfile}.ini
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
};

// Update the state variable after changes to corresponding variables in the components
ipcMain.on('update-variable', async (event, { action, currentComponent, key, value }) => {
  try {
    if (!state[currentComponent]) {
      console.error(`Key ${currentComponent} not found in state`);
    } else if (!state[currentComponent][key] && !action === 'rename') {
      console.error(`Key ${key} not found in state[${currentComponent}]`);
    } else {
      // Update the variable data key by key
      state[currentComponent][key] = { ...state[currentComponent][key], ...value };
      console.log(`Updated state[${currentComponent}][${key}]:`, value);
      
      // Currently selected ocr/alert/pixel/condition/automation
      region = state[currentComponent]['selected'].regionSelected
      const regionImagePath = path.join(basePath, `assets/${currentProfile.slice(0, -4)}/${region}.png`);

      // Process add new region request 
      if (action === 'add') {
        console.log(`Added new region: ${region} with default config`, state[currentComponent]['selected'].regions);
        // Set the config for the new region to the saved default configurations
        state[currentComponent][region] = { ...state[currentComponent][`${currentComponent}Default`] };
        // Add the region to the regions list
        state[currentComponent]['selected'].regions.push(region);
        // After new region addition, copy the default image saying "No pixel selected" or "No OCR box selected" to the region's image filename 
        if (currentComponent === 'pixelCoords') {
          if (!fs.existsSync(regionImagePath)) {
            fs.copyFileSync(pixelsDefaultImagePath, regionImagePath);
          }
        }
        if (currentComponent === 'ocrRegions') {
          if (!fs.existsSync(regionImagePath)) {
            fs.copyFileSync(ocrDefaultImagePath, regionImagePath);
          }
        }
      } 

      // Process delete region request 
      if (action === 'delete') {
        console.log(`Deleted region: ${region}`);
        // Delete contents of the variable  
        delete state[currentComponent][region];
        // Set the regionSelected to the first region in the list
        state[currentComponent]['selected'].regionSelected = state[currentComponent]['selected'].regions[0];
        // After region deletion, delete the saved images for that region
        if (currentComponent === 'pixelCoords' || currentComponent === 'ocrRegions') {
          if (fs.existsSync(regionImagePath)) {
            fs.unlinkSync(regionImagePath);
          }
        }
      }
      
      // Process rename region request 
      if (action === 'rename') {
        console.log(`Renamed region ${region} to ${key}`);
        // Delete contents of variable with previous name 
        delete state[currentComponent][region];
        // Set new regionSelected
        state[currentComponent]['selected'].regionSelected = key;
        // Replace region name in regions
        const index = state[currentComponent]['selected'].regions.findIndex(oldName => oldName === region);
        state[currentComponent]['selected'].regions.splice(index, 1,key);
        // Copy the image folders to the new folder name and delete the old folder
        const newRegionImagePath = path.join(basePath, `assets/${currentProfile.slice(0, -4)}/${key}.png`);
        if (currentComponent === 'pixelCoords' || currentComponent === 'ocrRegions') {
          fs.copyFileSync(regionImagePath, newRegionImagePath);
          fs.unlinkSync(regionImagePath);
        }
        // Check all components for references to the renamed region and update them
        const componentsToCheck = ['conditions', 'automation'];
        componentsToCheck.forEach(component => {
          if (state[component]) {
            // Update lists in the `selected` field
            ['ocrRegions', 'pixelRegions', 'alertRegions'].forEach(listName => {
              if (state[component]['selected'] && state[component]['selected'][listName]) {
                const listIndex = state[component]['selected'][listName].findIndex(item => item === region);
                if (listIndex !== -1) state[component]['selected'][listName].splice(listIndex, 1, key);
              }
            });
            // Update fields in individual entries
            Object.keys(state[component]).forEach(entryKey => {
              if (entryKey !== 'selected' && entryKey !== `${component}Default`) {
                const entry = state[component][entryKey];
                // Check if this entry references the renamed region
                if (entry.ocrRegions === region) entry.ocrRegions = key;
                if (entry.pixelCoords && entry.pixelCoords.includes(region)) {
                  entry.pixelCoords = entry.pixelCoords.map(coord => (coord === region ? key : coord));
                }
                if (entry.alert === region) entry.alert = key;
                // Update alert references in automation operationsList
                if (entry.operationsList) {
                  entry.operationsList.forEach(operation => {
                    if (Array.isArray(operation[0])) {
                      operation[0] = operation[0].map(alert => (alert === region ? key : alert));
                    }
                  });
                }
              }
            });
          }
        });
        console.log(`Region ${region} successfully renamed to ${key} across all components.`);
      }

      // Function to use new config to reperform ocr and update component variables and images over ipc
      updateComponents(currentComponent);
    }  
    // Save configuration data to {currentProfile}.ini after each change in configuration settings variables
    saveConfig(configPath);
  } catch (error) {
    console.error('Error updating variable:', error);
  }
});

// Function to use new config to reperform ocr and update component lists, configuration variables and images 
async function updateComponents(currentComponent) {
  region = state[currentComponent]['selected'].regionSelected
  const regionImagePath = path.join(basePath, `assets/${currentProfile.slice(0, -4)}/${region}.png`);

  if (currentComponent === 'ocrRegions' && !state.ocrRegions.selected.live) {
    // Perform OCR and send the recognized text after each config change
    await processAndSaveModifiedImage(regionImagePath, modifiedImagePath, state[currentComponent][region]);
    const ocrText = await recognizeTextFromImage(modifiedImagePath);
    win.webContents.send('ocrText', { ocrText });
    console.log('Image processed and saved successfully');

    // Send the updated images after each config change
    const unmodifiedImageData = fs.readFileSync(regionImagePath);
    const modifiedImageData = fs.readFileSync(modifiedImagePath);
    win.webContents.send('updateImages', { unmodifiedImageData, modifiedImageData });
    console.log('Sent both images');
  }
  if (currentComponent === 'pixelCoords') {
    // After new pixel region addition, copy the default image saying "No pixel selected" to the region's image filename and send to renderer
    const imageData = fs.readFileSync(regionImagePath);
    win.webContents.send('updatePixelImages', { imageData });
    console.log(`sent image for: ${region}`);
   }
  // Updates variables in component used to populate listboxes
  if (currentComponent === 'conditions') {
    // The conditions component needs these additional arrays to populate it's dropdown listboxes
    state['conditions']['selected'].ocrRegions = state['ocrRegions']['selected'].regions;
    state['conditions']['selected'].pixelRegions = state['pixelCoords']['selected'].regions;
    state['conditions']['selected'].alertRegions = state['alerts']['selected'].regions;
  }
  // Updates variables in component used to populate listboxes
  if (currentComponent === 'automation') {
    // The conditions automation needs these additional arrays to populate it's dropdown listboxes
    state['automation']['selected'].alertRegions = state['alerts']['selected'].regions;
  }
  const component = currentComponent;
  const selectedList = state[currentComponent]['selected'];
  win.webContents.send('updateList', { component, selectedList });

  // Updates variables in component representing configuration data for selected ocr region/alert/pixel/condition
  const selectedRegion = state[currentComponent].selected.regionSelected;
  const selectedValues = state[currentComponent][selectedRegion];
  win.webContents.send('updateConfig', { component, selectedValues });
  console.log(`Sent Config: `, JSON.stringify(selectedValues, null, 2));
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
  toggleGameModeOverlay();
});

function toggleGameModeOverlay() {
  if (!state['conditions']['selected'].live) {
    overlayWindow.webContents.send('initAlerts', state['alerts']);
    state['conditions']['selected'].live = true;
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.show();
  } else {
    state['conditions']['selected'].live = false;
    state['automation']['selected'].live = false;
    overlayWindow.hide();
  }
}


