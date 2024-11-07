<template>
    <div class="container mt-4">
      <h1 class="mb-3">Pixel Color Data with OCR</h1>
      <!-- Button to start OCR region capture -->
      <b-button @click="startCapture" variant="primary">Start OCR Region Capture</b-button>
  
      <!-- Display pixel color and OCR text -->
      <div id="color-info" class="mt-3">{{ colorInfo }}</div>
      <div id="ocrText" class="mt-1">{{ ocrText }}</div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        colorInfo: "Start color",
        ocrText: "Start OCR",
      };
    },
    methods: {
      startCapture() {
        // Communicate with Electron to start OCR region capture
        window.electronAPI.startCapture();
      },
    },
    mounted() {
      // Handle the event when pixel color data is received from the Electron process
      window.electronAPI.onPixelColor((event, pixelData) => {
        const { x, y, color, ocrText } = pixelData;
        this.colorInfo = `Color at (${x}, ${y}): ${color}`;
        this.ocrText = `Text in box: ${ocrText || 'No text found'}`;
      });
    },
  };
  </script>
  
  <style scoped>
  /* Scoped styles for OCRConfigurator */
  #app {
    font-family: Arial, sans-serif;
  }
  </style>
  