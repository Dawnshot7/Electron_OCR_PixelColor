<template>
  <div class="container mt-4">
    <h1 class="mb-3">Pixel Selector</h1>
    <b-row>

    <!-- Left Column with Listbox of OCR Regions -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div class="list-group">

          <!-- Render active OCR region buttons -->
          <button
            v-for="region in pixelList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === pixelList.regionSelected }, 'text-center', 'pixel-btn']"
          >
            {{ region }}
          </button>

          <!-- Render the "Add Region" button in the next available slot -->
          <button
            v-if="pixelList.regions.length < 15"
            @click="addRegion()"
            class="list-group-item list-group-item-action text-center add-region-btn bg-light"
            style="background-color: #797979;"
          >
            Add Region
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 15 -->
          <button
            v-for="index in 15 - pixelList.regions.length - 1"
            :key="'empty-' + index"
            class="list-group-item text-center empty-btn"
            style="background-color: #d3d3d3;"
            disabled
          >
            Empty
          </button>
        </div>
      </b-col>

      <!-- All other content in component -->
      <b-col cols="9" md="9" class="image-region"> 
        
        <!-- Main row with Pixel Configuration Fields in Columns -->
        <b-row>

        <!-- Delete region button -->

          <!-- Left column with box position, capture coords, show overlay, rename, new region, delete region -->
          <b-col cols="4" md="4">
            <b-button @click="deleteRegion" variant="success" size="sm">Delete Region</b-button>

            <!-- Position Fields -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <label for="input-x">  X:</label>
                <b-form-input
                  id="input-x"
                  v-model="pixelConfig.x"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
                <label for="input-y">  Y:</label>
                <b-form-input
                  id="input-y"
                  v-model="pixelConfig.y"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
              </div>
            </b-row>

            <!-- Button to start OCR region capture -->
            <b-row class="mt-3">
              <div class="container mt-4">
                <b-button @click="startCapturePixel" variant="warning">Start Coordinate Capture</b-button>
              </div>
            </b-row>
          </b-col>

          <!-- Second column with pixel color and replace color button-->
          <b-col cols="4" md="4">

            <!-- Display pixel color and OCR text -->
            <b-row class="mt-3">
              <div 
                id="color-info" 
                class="mt-1 pixelText" 
                :style="{ color: pixelConfig.color }"
              >
                {{ colorInfo }}
              </div>
            </b-row>

            <!-- Live pixel color checkbox -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <b-form-checkbox v-model="pixelList.live" @change="toggleLive">Live pixel color</b-form-checkbox>
              </div>
            </b-row>

          </b-col>
        </b-row>
      </b-col>
    </b-row>
  </div>
</template>

<script>
import { toRaw } from 'vue';
export default {
  data() {
    return {
      pixelList: {
        profile: 'initial',
        regions: ['initial'],
        regionSelected: 'initial',
        live: false
      },
      colorInfo: "Start color",
      pixelConfig: {
        x: 0,
        y: 0,
        color: '000000'
      },
    };
  },
  methods: {
    startCapturePixel() {
      // Communicate with Electron to start OCR region capture
      window.electronAPI.runAhkScript('getPixelCoords', '', '');
    },
    regionChange(newSelection) {
      // Change ocr box being displayed and have main.js send the new box's config data
      this.pixelList.regionSelected = newSelection;
      window.electronAPI.updateVariable('pixelCoords', 'selected', { regionSelected: newSelection });
      window.electronAPI.updateVariable('pixelCoords', 'selected', { regions: this.pixelList.regions });
    },
    addRegion() {
      // Add a new OCR region to the list 
      const newRegion = `pixelCoord${this.pixelList.regions.length + 1}`;
      this.pixelList.regions.push(newRegion);
      // Switch to new region and have main.js create a new region in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    deleteRegion() {
      if (this.pixelList.regions.length > 1) {
        const index = this.pixelList.regions.findIndex(region => region === this.pixelList.regionSelected);
        this.pixelList.regions.splice(index, 1);
        console.log(`pixel regions: ${this.pixelList.regions}, selection: ${this.pixelList.regionSelected}`)
        const serializableRegions = toRaw(this.pixelList);
        window.electronAPI.updateVariable('pixelCoords', 'selected', serializableRegions);
      }  
    },
    toggleLive() {
      // Turns on/off OCR being performed in setinterval in main.js and result sent back every second 
      window.electronAPI.updateVariable('pixelCoords', 'selected', { live: this.pixelList.live });
    }
  },
  mounted() {
    // Trigger main.js to send list, config and images on component load 
    window.electronAPI.updateVariable('pixelCoords', 'selected', { live: false });
    
    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ selectedValues }) => {
      if (selectedValues) {
        // Populate fields from selectedValues
        selectedValues.color = `#${selectedValues.color}`
        this.pixelConfig = { ...this.pixelConfig, ...selectedValues };
        console.log(`received config`, selectedValues.color);
        this.colorInfo = `Color at (${this.pixelConfig.x}, ${this.pixelConfig.y}): ${this.pixelConfig.color}`;
      }
    });

    // Listen for updates to populate the list box on component load
    window.electronAPI.onupdateList(({ selectedList }) => {
      if (selectedList) {
        // Populate fields from selectedValues
        this.pixelList = { ...this.pixelList, ...selectedList };
        console.log('received list');
      }
    }); 

    // Listen for updates to populate the list box on component load
    window.electronAPI.onpixelColor(({ selectedList }) => {
      if (selectedList) {
        // Populate fields from selectedValues
        this.pixelConfig = { ...this.pixelConfig, ...selectedList };
        console.log('received color');
      }
    }); 
  },
};
</script>
  
<style scoped>
#color-info {
  font-weight: bold;
}

.pixel-btn {
  font-weight: bold; /* Force bold text */
}
</style>