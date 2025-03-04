## Electron Game Automation Tool

## Overview

This Electron-based application allows users to automate gameplay in MMO RPGs by monitoring pixel colors and performing OCR on specific screen regions. The app determines when certain abilities should be used based on real-time in-game data and can generate on-screen alerts or send simulated keypresses using AutoHotkey.

## Features

## Pixel & OCR Monitoring

- Users can select in-game pixels to monitor for color changes.

- OCR functionality (via ocrad.js) can read text from defined screen regions.

- OCR settings include image inversion, brightness, and contrast adjustments to improve recognition accuracy.

## On-Screen Alerts

- Custom alerts can be displayed when pixel color conditions or OCR-detected text matches user-defined triggers.

- Alerts appear via a transparent, click-through overlay.

- Alerts are toggled every 0.5s (or a custom global cooldown).

## Decision Tree for Automation

- Users define conditions based on pixel colors and OCR text.

- The app evaluates conditions in a loop and displays corresponding alerts when conditions are met.

- Automation allows keypresses to be sent to the game, mimicking real user input.

## User Profiles & Configuration

- All settings are stored in .ini files.

- Multiple profiles can be saved and loaded, useful for different characters or game roles.

- Data is structured using JSON stringified state variables stored under different headings in the .ini file.

## Components

## 1. Pixel Selector

- UI component for selecting pixels and defining the target color.

- Uses robotjs to capture pixel color values in real-time.

## 2. OCR Region Selector

- UI for defining a screenshot region for OCR processing.

- Includes settings for image preprocessing (contrast, brightness, inversion).

- Uses ocrad.js to extract text from the region.

## 3. On-Screen Alerts

- Users create and customize alerts (text, color, size).

- Alerts are conditionally displayed during gameplay.

## 4. Condition Builder

- Users define conditions using pixel colors and OCR results.

- If a condition is met, a selected alert is shown.

## 5. Automation System

- Users build a list of conditions that trigger keypresses.

- The app executes the first true condition, pressing the assigned key.

- Automation follows a decision-tree structure to simulate optimal gameplay.

## How It Works

1. The user sets up pixel monitoring and OCR text recognition.

2. They configure alerts that will appear when conditions are met.

3. A decision tree is created to determine which abilities should be used.

4. The automation system evaluates the conditions every 0.5s (or a user-defined interval).

5. If a condition is met, the app:

  - Displays an alert.

  - Optionally simulates a keypress.

6. The system can be toggled on/off via hotkeys.

## Technologies Used

- Electron: Provides the main app framework.

- Vue.js & BootstrapVue: Frontend UI components.

- RobotJS: Captures pixel colors from the screen.

- OCRAD.js: Performs OCR on screenshot regions.

- Jimp & Canvas APIs: Preprocesses images before OCR.

- AutoHotkey: Simulates keypresses for in-game automation.

- ini & fs Modules: Handles saving and loading of user profiles.

## Installation & Setup

1. Clone this repository:

git clone https://github.com/your-repo-name.git
cd your-repo-name

2. Install dependencies:

npm install

3. Start the application:

npm start

## Usage

- Open the application and configure pixel monitoring, OCR, alerts, and automation settings.

- Save profiles for different characters or game setups.

- Toggle automation and alerts as needed while playing.

## Future Improvements

- Enhance OCR accuracy with alternative libraries.

- Add more advanced decision-tree automation options.

- Improve UI for a more intuitive experience.

## Disclaimer

This tool is for educational and personal use only. The use of automation in online games may violate terms of service. Use at your own risk.

## License

## MIT License

