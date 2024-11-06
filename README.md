# Electron RobotJS Pixel Color Monitor

## Description

This Electron application utilizes RobotJS to monitor and retrieve the color of a specific pixel on the screen in real time. The application communicates pixel color data between the main process and the renderer process using IPC (Inter-Process Communication). The monitored pixel's color is displayed in the app's user interface, updating every second.

## Features

- Monitors the color of a specified pixel on the screen.
- Displays pixel color data in the user interface.
- Uses Electron for a cross-platform desktop application.
- Implements IPC for communication between the main and renderer processes.

## Technologies Used

- Electron: Framework for building cross-platform desktop applications with web technologies.
- RobotJS: A native Node.js library for controlling the mouse, keyboard, and retrieving pixel color data.
- HTML/CSS/JavaScript: Standard web technologies used for building the application's user interface.

## Installation

To set up the project locally, follow these steps:

1. Clone the repository:
    git clone <YOUR_REPOSITORY_URL>

2. Navigate to the project directory:
    cd Electron_Robotjs_Tesseract

3. Install the dependencies:
    npm install

4. Rebuild the RobotJS module:
    npx electron-rebuild

5. Run the application:
    npm start

## Usage

1. Launch the application.
2. The pixel color at the specified coordinates will be monitored and updated every second.
3. The current color will be displayed in the "Color at (x, y): <color>" format in the application window.

## Configuration
You can modify the pixel coordinates in the main.js file to monitor different pixels. Look for the following section:

    const { x, y } = { x: 100, y: 100 }; // Change as needed

## Troubleshooting
- If you encounter issues with the RobotJS module, ensure you have the correct Python version (Python 2.7) and build tools installed on your system.
- Refer to the RobotJS documentation for additional troubleshooting steps.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements
- Electron
- RobotJS