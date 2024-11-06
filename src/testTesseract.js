const Tesseract = require('tesseract.js');

// Simple test to check if Tesseract can be initialized
Tesseract.recognize(
  // Provide an image path or URL here for testing
  'src/assets/HelloGoogle.tif', // Replace with a valid image path
  'eng', // Language
  {
    logger: info => console.log(info), // Log progress
  }
).then(({ data: { text } }) => {
  console.log('Recognized text:', text);
}).catch(error => {
  console.error('Error during Tesseract recognition:', error);
});