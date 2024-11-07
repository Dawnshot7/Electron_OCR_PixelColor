<!-- src/components/App.vue -->
<template>
    <div id="app">
      <h1>Pixel Color Data with OCR</h1>
      <button @click="startCapture">Start OCR Region Capture</button>
      <div id="color-info">{{ colorInfo }}</div>
      <div id="ocrText">{{ ocrText }}</div>
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
        window.electronAPI.startCapture();
      },
    },
    mounted() {
      window.electronAPI.onPixelColor((event, pixelData) => {
        const { x, y, color, ocrText } = pixelData;
        this.colorInfo = `Color at (${x}, ${y}): ${color}`;
        this.ocrText = `Text in box: ${ocrText || 'No text found'}`;
      });
    },
  };
  </script>
  
  <style scoped>
  #app {
    font-family: Arial, sans-serif;
  }
  </style>
  