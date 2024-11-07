<!-- src/components/App.vue -->
<template>
  <div id="app" class="container mt-4">
    <h1 class="mb-3">Pixel Color Data with OCR</h1>
    <!-- Use a BootstrapVue button component -->
    <b-button @click="startCapture" variant="primary">Start OCR Region Capture</b-button>
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
