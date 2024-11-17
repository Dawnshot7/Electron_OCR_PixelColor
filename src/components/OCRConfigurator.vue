<template>
  <div class="container mt-4">
    <h1 class="mb-3">OCR Configurator</h1>
    <b-row>

      <!-- Left Column with Listbox of Pixel Regions -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div 
          class="list-group listbox-container" 
          style="max-height: 460px; overflow-y: auto;"
        >
          <!-- Render active OCR region buttons -->
          <button
            v-for="region in ocrList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === ocrList.regionSelected }, 'text-center', 'bold-btn']"
          >
            {{ region }}
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 12 -->
          <button
            v-for="index in Math.max(0, 11 - ocrList.regions.length)"
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
        
        <!-- Display unmodified image, modified image and OCR text in top Row -->
        <b-row class="align-items-center justify-content-center mb-3" style="height: 100px;">

          <!-- Images Side by Side -->
          <b-col cols="6" md="6">
            <div class="d-flex justify-content-center">
              <b-img id='unmodifiedImage' src='' alt="Unmodified Image" class="img-fluid" ></b-img>
            </div>
          </b-col>
          <b-col cols="6" md="6">
            <div class="d-flex justify-content-center">
              <b-img id='modifiedImage' src='' alt="Modified Image" class="img-fluid" ></b-img>
            </div>
          </b-col>

        </b-row>
         
        <!-- Bottom row with OCR Configuration Fields in Columns -->
        <b-row>

          <!-- Left column with box position, capture coords, show overlay, rename, new region, delete region -->
          <b-col cols="6" md="6">

            <!-- Position Fields -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <label for="input-x">  X:</label>
                <b-form-input
                  id="input-x"
                  v-model="ocrConfig.x"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
                <label for="input-y">  Y:</label>
                <b-form-input
                  id="input-y"
                  v-model="ocrConfig.y"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
                <label for="input-w">  W:</label>
                <b-form-input
                  id="input-w"
                  v-model="ocrConfig.width"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
                <label for="input-h">  H:</label>
                <b-form-input
                  id="input-h"
                  v-model="ocrConfig.height"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
              </div>
            </b-row>
            
            <!-- Button to start OCR region capture -->
            <b-row class="d-flex justify-content-center">
              <b-button @click="startCaptureBox" variant="warning" :style="{ width: 'auto', marginTop: '20px' }">Start Coordinate Capture</b-button>
            </b-row>

            <!-- Button to show current ocr box on overlay -->
            <!-- Edit box to change region name  -->
            <!-- Button to create a new region with default settings -->
            <!-- Button to delete current region from the list -->
          </b-col>

           <!-- Middle column with image modification fields (Invert, brightness, contrast) -->
          <b-col cols="6" md="6">
            
            <!-- OCR Text -->
            <b-row class="d-flex justify-content-center mt-3">
              <label for="ocrText" style="width: 80%">OCR results text:</label>
              <div id="ocrText" style="width: 80%" class="p-2">{{ ocrText }}</div>
            </b-row>

            <!-- Live OCR text checkbox -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <b-form-checkbox v-model="ocrList.live" @change="toggleLive">Live OCR</b-form-checkbox>
              </div>
            </b-row>

            <!-- Invert Checkbox -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <b-form-checkbox v-model="ocrConfig.invert" @change="toggleInvert">Invert image</b-form-checkbox>
              </div>
            </b-row>

            <!-- Brightness Controls -->
            <b-row class="mt-3">
              <b-form-group label="Brightness" label-align="center" label-for="brightness">
                <div class="d-flex justify-content-center">
                  <b-button @click="adjustBrightness(-0.1)" variant="outline-secondary">-</b-button>
                  <b-form-input
                    v-model="ocrConfig.brightness"
                    type="number"
                    class="fixed-width-input"
                    readonly
                  ></b-form-input>
                  <b-button @click="adjustBrightness(0.1)" variant="outline-secondary">+</b-button>
                </div>
              </b-form-group>
            </b-row>

            <!-- Contrast Controls -->
            <b-row class="mt-3">
              <b-form-group label="Contrast" label-align="center" label-for="contrast">
                <div class="d-flex justify-content-center">
                  <b-button @click="adjustContrast(-0.1)" variant="outline-secondary">-</b-button>
                  <b-form-input
                    v-model="ocrConfig.contrast"
                    type="number"
                    class="fixed-width-input"
                    readonly
                  ></b-form-input>
                  <b-button @click="adjustContrast(0.1)" variant="outline-secondary">+</b-button>
                </div>
              </b-form-group>
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
      ocrList: {
        profile: 'initial',
        regions: ['initial'],
        regionSelected: 'initial',
        live: false
      },
      ocrText: 'initial',
      ocrConfig: {
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        invert: false,
        contrast: 0.5,
        brightness: 0.5
      },
    };
  },
  methods: {
    startCaptureBox() {
      // Runs getBoxCoords.ahk to collect new (x1,y1) and (x2,y2) of the box and save to config.ini
      window.electronAPI.runAhkScript('getBoxCoords', '', '');
    },
    toggleInvert() {
      // Update config.ini with new invert image variable state 
      window.electronAPI.updateVariable('ocrRegions', this.ocrList.regionSelected, { invert: this.ocrConfig.invert });
    },
    adjustBrightness(delta) {
      // Increment or decrement brightness and update config.ini
      this.ocrConfig.brightness = Math.min(1, Math.max(0, parseFloat((this.ocrConfig.brightness + delta).toFixed(1))));
      window.electronAPI.updateVariable('ocrRegions', this.ocrList.regionSelected, { brightness: this.ocrConfig.brightness });
    },
    adjustContrast(delta) {
      // Increment or decrement contrast and update config.ini
      this.ocrConfig.contrast = Math.min(1, Math.max(0, parseFloat((this.ocrConfig.contrast + delta).toFixed(1))));
      window.electronAPI.updateVariable('ocrRegions', this.ocrList.regionSelected, { contrast: this.ocrConfig.contrast });
    },
    regionChange(newSelection) {
      // Change ocr box being displayed and have main.js send the new box's config data
      this.ocrList.regionSelected = newSelection;
      window.electronAPI.updateVariable('ocrRegions', 'selected', { regionSelected: newSelection });
      window.electronAPI.updateVariable('ocrRegions', 'selected', { regions: this.ocrList.regions });
    },
    addRegion() {
      // Add a new OCR region to the list 
      let lastNumber = 0;
      const lastItemName = this.ocrList.regions[this.ocrList.regions.length - 1];
      const match = lastItemName.match(/(\d+)$/);
      lastNumber = parseInt(match[1], 10);
      const newRegion = `ocr${lastNumber + 1}`;
      this.ocrList.regions.push(newRegion);
      // Switch to new region and have main.js create a new region in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    deleteRegion() {
      if (this.ocrList.regions.length > 1) {
        const index = this.ocrList.regions.findIndex(region => region === this.ocrList.regionSelected);
        this.ocrList.regions.splice(index, 1);
        const serializableRegions = toRaw(this.ocrList);
        window.electronAPI.updateVariable('ocrRegions', 'selected', serializableRegions);
      }   
    },
    toggleLive() {
      // Turns on/off OCR being performed in setinterval in main.js and result sent back every second 
      window.electronAPI.updateVariable('ocrRegions', 'selected', { live: this.ocrList.live });
    },
    toggleOverlay() {
      window.electronAPI.toggleOverlay();
      console.log('toggled overlay')
    }
  },
  mounted() {
    // Trigger main.js to send list, config and images on component load 
    window.electronAPI.updateVariable('ocrRegions', 'selected', { live: false });

    // Handle OCR text event from Electron
    window.electronAPI.onOCRText((event, ocrData) => {
      const { ocrText } = ocrData;
      this.ocrText = `${ocrText || 'No text found'}`;
    });

    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ selectedValues }) => {
      if (selectedValues) {
        // Populate fields from selectedValues
        this.ocrConfig = { ...this.ocrConfig, ...selectedValues };
        console.log('received config');
      }
    });

    // Listen for updates to populate the list box on component load
    window.electronAPI.onupdateList(({ selectedList }) => {
      if (selectedList) {
        // Populate fields from selectedValues
        this.ocrList = { ...this.ocrList, ...selectedList };
        console.log('received list');
      }
    }); 

    // Listen for the combined images message
    window.electronAPI.onupdateImages(({ unmodifiedImageData, modifiedImageData }) => {
      const unmodifiedBlob = new Blob([unmodifiedImageData], { type: 'image/png' });
      document.getElementById('unmodifiedImage').src = URL.createObjectURL(unmodifiedBlob);

      const modifiedBlob = new Blob([modifiedImageData], { type: 'image/png' });
      document.getElementById('modifiedImage').src = URL.createObjectURL(modifiedBlob);
    });
  }
};
</script>

<style scoped>
#ocrText {
  font-weight: bold;
}

.fixed-width-input {
  width: 7ch; /* Makes input wide enough for 3 characters */
  padding: 0; /* Removes all padding */
  text-align: center;
}

.container .img-fluid {
  max-width: 100%;
  object-fit: contain;
  max-height: 100px;
}

.bold-btn {
  font-weight: bold; /* Force bold text */
}
</style>
