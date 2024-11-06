const robot = require('robotjs');

// Get the color of the pixel at (100, 100)
setInterval(() => {
    const color = robot.getPixelColor(100, 100);
    console.log(`Color at (100, 100): ${color}`);
}, 3000);