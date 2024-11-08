<template>
    <div class="container mt-4">
      <h1 class="mb-3">OCR Configurator</h1>
      <!-- Button to start OCR region capture -->
      <b-button @click="startCaptureBox" variant="primary">Start OCR Region Capture</b-button>
  
      <!-- Display pixel color and OCR text -->
      <div id="ocrText" class="mt-1">{{ ocrText }}</div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        ocrText: "Start OCR",
      };
    },
    methods: {
      startCaptureBox() {
        // Communicate with Electron to start OCR region capture
        window.electronAPI.startCaptureBox();
      },
    },
    mounted() {
      // Handle the event when pixel color data is received from the Electron process
      window.electronAPI.onOCRText((event, ocrData) => {
        const { ocrText } = ocrData;
        this.ocrText = `Text in box: ${ocrText || 'No text found'}`;
      });
    },
  };
  </script> 
  