// renderer.js

// Listen for the 'pixelColor' event from the main process via the electronAPI
window.electronAPI.onPixelColor((event, pixelData) => {
    // Destructure pixel data to get the x, y coordinates and the color value
    const { x, y, color, ocrText } = pixelData;
  
    // Update the inner text of the color-info div with the pixel color information
    document.getElementById('color-info').innerText = `Color at (${x}, ${y}): ${color}`;
    document.getElementById('ocrText').innerText = `Text in box: ${ocrText || 'No text found'}`;
  });

// Reference to the start capture button
const startCaptureButton = document.getElementById('startCaptureButton');

// Event listener for the capture button
startCaptureButton.addEventListener('click', () => {
  window.electronAPI.startCapture();
});