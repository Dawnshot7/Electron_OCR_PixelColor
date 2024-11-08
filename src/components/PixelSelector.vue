<template>
    <div class="container mt-4">
      <h1 class="mb-3">Pixel Selector</h1>
      <!-- Button to start OCR region capture -->
      <b-button @click="startCapturePixel" variant="primary">Start Pixel Coordinate Capture</b-button>
  
      <!-- Display pixel color and OCR text -->
      <div id="color-info" class="mt-1">{{ colorInfo }}</div>
    </div>
  </template>
  
  <script>
   export default {
    data() {
      return {
        colorInfo: "Start color",
      };
    },
    methods: {
      startCapturePixel() {
        // Communicate with Electron to start OCR region capture
        window.electronAPI.startCapturePixel();
      },
    },
    mounted() {
      // Handle the event when pixel color data is received from the Electron process
      window.electronAPI.onPixelColor((event, pixelData) => {
        const { x, y, color } = pixelData;
        this.colorInfo = `Color at (${x}, ${y}): ${color}`;
      });
    },
  };
  </script>
  