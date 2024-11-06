# Electron Pixel Color OCR
This project allows you to capture a specific region of the screen using mouse clicks, extract text using OCR (Optical Character Recognition), and update the OCR region dynamically using AutoHotkey (AHK) for capturing the coordinates.

## Features
- OCR-based screen capture: Capture a selected region of the screen and perform OCR to extract text from it.
- Dynamic region selection: Use mouse clicks to select the region for OCR and update the OCR region in real time.
- Integration with AutoHotkey: Use an AutoHotkey script to capture mouse coordinates for defining the OCR region.

## Prerequisites
- Before you begin, ensure you have the following installed:

    - Node.js (v16.x or above)
    - Electron (17.x or below for compatibility with robotjs if you're using it)
    - AutoHotkey (v1.x for the scripts used in this project)
    - ocrad.js (for OCR processing)

- You can install the required Node.js packages by running the following command:

    bash
    npm install

## Dependencies:
- ocrad.js: A JavaScript-based OCR tool for extracting text from images.
- AutoHotkeyA32.exe: For executing AutoHotkey scripts to capture mouse coordinates.

## Project Setup
- Clone this repository:

    bash
    git clone https://github.com/yourusername/Electron_PixelColor_OCR.git
    cd Electron_PixelColor_OCR

- Install dependencies:

    bash
    npm install

- Ensure you have AutoHotkey installed on your system, and place AutoHotkeyA32.exe and the AutoHotkey script (getBoxCoords.ahk) in the scripts folder.

- Update the paths in your main.js file to reflect the location of AutoHotkeyA32.exe and the AHK script.

## How It Works

- OCR Region Setup:

    - The user clicks the "Start Capture" button in the Electron window to begin selecting the OCR region.
    - The user clicks and releases the left mouse button on the screen to define the coordinates for the OCR region.
    - These coordinates are captured by an AutoHotkey script and returned to the Electron app.

- OCR Extraction:

    - The Electron app uses the coordinates received from AutoHotkey to define the region for OCR.
    - The OCR tool (ocrad.js) is then used to extract text from the captured region.

- AutoHotkey Script:

    - The AHK script (getBoxCoords.ahk) waits for the left mouse button to be pressed and released.
    - It captures the x,y coordinates of the mouse clicks and outputs them to standard output (stdout).
    - These coordinates are sent back to the Electron app and used to update the OCR region.

## Example Usage
- Start Capture: Click the "Start Capture" button in the Electron window.
- Select OCR Region: Click and release the left mouse button to define the coordinates for the OCR region.
- OCR Output: The extracted text from the selected region will be printed to the console or displayed in the app.

## Files and Structure
- main.js: The main Electron app logic, including spawning the AutoHotkey script and handling OCR extraction.
- renderer.js: Handles the front-end logic, including the event listener for the "Start Capture" button and mouse click events.
- getBoxCoords.ahk: AutoHotkey script that captures the coordinates of the mouse clicks.
- ocrad.js: The OCR tool for extracting text from images within the defined region.

## Troubleshooting
- No OCR Output: Make sure the ocrad.js OCR region coordinates are correct and the OCR tool is functioning properly.
- No Coordinates from AHK: Ensure that AutoHotkeyA32.exe is running correctly and the getBoxCoords.ahk script is properly outputting coordinates.