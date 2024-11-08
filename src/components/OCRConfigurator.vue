<template>
  <div class="container mt-4">
    <h1 class="mb-3">OCR Configurator</h1>
    
    <!-- Display OCR text output -->
    <div id="ocrText" class="mt-1">{{ ocrText }}</div>
    
    <!-- Button to start OCR region capture -->
    <b-button @click="startCaptureBox" variant="primary">Start OCR Region Capture</b-button>
  
    <!-- OCR region configuration fields -->
    <div class="mt-4">
      <h3>OCR Region Settings</h3>

      <!-- X Position Field -->
      <b-form-group label="X Position" label-for="x-pos">
        <b-form-input
          id="x-pos"
          v-model="ocrConfig.x"
          type="number"
          placeholder="Enter X position"
          readonly
        ></b-form-input>
      </b-form-group>

      <!-- Y Position Field -->
      <b-form-group label="Y Position" label-for="y-pos">
        <b-form-input
          id="y-pos"
          v-model="ocrConfig.y"
          type="number"
          placeholder="Enter Y position"
          readonly
        ></b-form-input>
      </b-form-group>

      <!-- Width Field -->
      <b-form-group label="Width" label-for="width">
        <b-form-input
          id="width"
          v-model="ocrConfig.width"
          type="number"
          placeholder="Enter width"
          readonly
        ></b-form-input>
      </b-form-group>

      <!-- Height Field -->
      <b-form-group label="Height" label-for="height">
        <b-form-input
          id="height"
          v-model="ocrConfig.height"
          type="number"
          placeholder="Enter height"
          readonly
        ></b-form-input>
      </b-form-group>

      <!-- Brightness Control -->
      <b-form-group label="Brightness" label-for="brightness">
        <div class="d-flex align-items-center">
          <b-button @click="adjustBrightness(-0.1)" variant="outline-secondary">-</b-button>
          <b-form-input
            id="brightness"
            v-model="ocrConfig.brightness"
            type="number"
            :step="0.1"
            readonly
          ></b-form-input>
          <b-button @click="adjustBrightness(0.1)" variant="outline-secondary">+</b-button>
        </div>
      </b-form-group>

      <!-- Contrast Control -->
      <b-form-group label="Contrast" label-for="contrast">
        <div class="d-flex align-items-center">
          <b-button @click="adjustContrast(-0.1)" variant="outline-secondary">-</b-button>
          <b-form-input
            id="contrast"
            v-model="ocrConfig.contrast"
            type="number"
            :step="0.1"
            readonly
          ></b-form-input>
          <b-button @click="adjustContrast(0.1)" variant="outline-secondary">+</b-button>
        </div>
      </b-form-group>

      <!-- Invert Toggle -->
      <b-form-group label="Invert Colors" label-for="invert">
        <b-form-checkbox
          id="invert"
          v-model="ocrConfig.invert"
          switch
        >Invert</b-form-checkbox>
      </b-form-group>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      ocrList: {
        regions: ['ocrRegion1', 'ocrRegion2'],
        regionSelected: 'ocrRegion1',
      },
      ocrText: 'Start OCR',
      ocrConfig: {
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        invert: false,
        contrast: 0.5,
        brightness: 0.5,
      }
    };
  },
  methods: {
    startCaptureBox() {
      window.electronAPI.startCaptureBox();
    },
    adjustBrightness(delta) {
      this.ocrRegion.brightness = Math.max(0, this.ocrRegion.brightness + delta);
      window.electronAPI.updateVariable('ocrRegions', this.ocrList.regionSelected, { brightness: this.ocrConfig.brightness });
    },
    adjustContrast(delta) {
      this.ocrRegion.contrast = Math.max(0, this.ocrRegion.contrast + delta);
      window.electronAPI.updateVariable('ocrRegions', this.ocrList.regionSelected, { contrast: this.ocrRegion.contrast });
    },
    regionChange(newSelection) {
      window.electronAPI.updateVariable('ocrRegions', 'selected', { region: {newSelection} });
    }
  },
  mounted() {
    // Trigger initial selection update on component load
    window.electronAPI.updateVariable('ocrRegions', 'selected', {});

    // Handle OCR text event from Electron
    window.electronAPI.onOCRText((event, ocrData) => {
      const { ocrText } = ocrData;
      this.ocrText = `Text in box: ${ocrText || 'No text found'}`;
    });

    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ selectedValues }) => {
      if (selectedValues) {
        // Populate fields from selectedValues
        Object.assign(this.ocrConfig, selectedValues);
        this.ocrText = 'got data'
      }
    });

    // Listen for variable updates to populate the list box
    window.electronAPI.onupdateList(({ selectedValues }) => {
      if (selectedValues) {
        // Populate fields from selectedValues
        this.ocrList = { ...selectedValues };
      }
    });
  }
};
</script>

<style scoped>
.container {
  max-width: 600px;
}
</style>
