<template>
  <div class="container mt-4">
    <h1 class="mb-3">Pixel Selector</h1>
    <b-row>

      <!-- Left Column with Listbox of Pixel Regions -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div 
          class="list-group listbox-container" 
          style="max-height: 460px; overflow-y: auto;"
        >
          <!-- Render active OCR region buttons -->
          <button
            v-for="region in pixelList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === pixelList.regionSelected }, 'text-center', 'bold-btn']"
          >
            {{ region }}
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 12 -->
          <button
            v-for="index in Math.max(0, 11 - pixelList.regions.length)"
            :key="'empty-' + index"
            class="list-group-item text-center empty-btn"
            style="background-color: #d3d3d3;"
            disabled
          >
            Empty
          </button>
        </div>

        <!-- Render the "Add Region" button always visible below the list -->
        <button
          @click="addRegion"
          class="list-group-item list-group-item-action text-center add-region-btn bold-btn bg-light mt-2"
          style="background-color: #797979; width: 100%;"
        >
          Add Region
        </button>

        <!-- Render the "Delete Region" button always visible below the list -->
        <button
          @click="deleteRegion"
          class="list-group-item list-group-item-action text-center delete-region-btn bold-btn mt-2"
          style="margin-top: 25px; background-color: #dc3545; width: 100%;"
        >
          Delete Region
        </button>
      </b-col>

      <!-- All other content in component -->
      <b-col cols="9" md="9" class="image-region"> 
        
        <!-- Main row with Pixel Configuration Fields in Columns -->
        <b-row>
       
          <!-- Left column with box position, capture coords, show overlay, rename, new region, delete region -->
          <b-col cols="6" md="6">

            <!-- Image of pixel location -->
            <b-row class="align-items-center justify-content-center mb-3" style="height: 116px;">
              <div class="d-flex justify-content-center">
                <b-img id='pixelImage' src='' alt="Pixel Image" class="img-fluid" ></b-img>
              </div>
            </b-row>

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
            <b-row class="d-flex justify-content-center">
                <b-button @click="startCapturePixel" variant="warning" :style="{ width: 'auto', marginTop: '20px' }">Start Coordinate Capture</b-button>
            </b-row>

          </b-col>

          <b-col cols="6" md="6">

            <!-- Pixel color  -->
            <b-row class="align-items-center justify-content-center mb-3" style="width: 90%; height: 116px;">
              <div 
                  id="color-info" 
                  class="mt-1 pixelText" 
                  :style="{ color: pixelConfig.liveColor }"
                  v-html="colorInfo"
                >
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
        color: '000000',
        liveColor: '000000'
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
      let lastNumber = 0;
      const lastItemName = this.pixelList.regions[this.pixelList.regions.length - 1];
      const match = lastItemName.match(/(\d+)$/);
      lastNumber = parseInt(match[1], 10);
      const newRegion = `pixel${lastNumber + 1}`;
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
        this.pixelConfig.liveColor = this.pixelConfig.color;
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
    window.electronAPI.onpixelColor(({ liveColor }) => {
      if (liveColor) {
        // Populate fields from selectedValues
        this.pixelConfig.liveColor = `#${liveColor}`;
        const match = (this.pixelConfig.liveColor === this.pixelConfig.color);
        this.colorInfo = `Color at (${this.pixelConfig.x}, ${this.pixelConfig.y}): ${this.pixelConfig.liveColor}<br>Match status: ${match}`;
      }
    }); 

    // Listen for the images message
    window.electronAPI.onupdatePixelImages(({ imageData }) => {
      const unmodifiedBlob = new Blob([imageData], { type: 'image/png' });
      document.getElementById('pixelImage').src = URL.createObjectURL(unmodifiedBlob);
    });
  },
};
</script>
  
<style scoped>
#color-info {
  font-weight: bold;
}

.fixed-width-input {
  width: 7ch; /* Makes input wide enough for 3 characters */
  padding: 0; /* Removes all padding */
  text-align: center;
}

.bold-btn {
  font-weight: bold; /* Force bold text */
}

</style>