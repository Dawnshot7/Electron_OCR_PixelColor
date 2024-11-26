<template>
  <div class="container mt-4">
    <h1 class="mb-3">OCR Configurator</h1>
    <b-row>

      <!-- Left column with listbox of OCR regions -->
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

          <!-- Render "empty" placeholders for remaining slots up to 11 -->
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
          Add OCR Box
        </button>

        <!-- Render the "Delete Region" button always visible below the list -->
        <button
          @click="deleteRegion"
          class="list-group-item list-group-item-action text-center delete-region-btn bold-btn mt-2"
          style="margin-top: 25px; background-color: #dc3545; width: 100%;"
        >
          Delete OCR Box
        </button>
      </b-col>



      <!-- All other content in component -->
      <b-col cols="9" md="9" class="image-region">
        
        <!-- Top row to display unmodified image and modified image with a max row height -->
        <b-row class="align-items-center justify-content-center mb-3" style="height: 100px;">

          <!-- Images Side by Side, centered within their column, with object-fit: contain and max-height of 100px -->
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

          <!-- Left column with box position and capture coordinates button -->
          <b-col cols="6" md="6">

            <!-- Position Fields with coordinates displayed in read-only input fields -->
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

          </b-col>

           <!-- Middle column with OCR text output and image modification fields (Invert, brightness, contrast) -->
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
import { toRaw } from 'vue'; //used for serializing arrays sent to main.js over ipc
export default {
  data() {
    return {
      ocrList: {
        profile: '',
        regions: [''],
        regionSelected: '',
        live: false
      },
      ocrText: '',
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
      // Change OCR region being displayed and have main.js send back the new box's config data
      this.ocrList.regionSelected = newSelection;
      window.electronAPI.updateVariable('ocrRegions', 'selected', { regionSelected: newSelection });
    },
    addRegion() {
      // Add a new OCR region to the listbox
      let lastNumber = 0;
      const lastItemName = this.ocrList.regions[this.ocrList.regions.length - 1];
      const match = lastItemName.match(/(\d+)$/);
      lastNumber = parseInt(match[1], 10);
      const newRegion = `ocr${lastNumber + 1}`;
      this.ocrList.regions.push(newRegion);
      // Switch to new region. Main.js will add a new region in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    deleteRegion() {
      // Delete current OCR region from the listbox
      if (this.ocrList.regions.length > 1) {
        const index = this.ocrList.regions.findIndex(region => region === this.ocrList.regionSelected);
        this.ocrList.regions.splice(index, 1);
        const serializableRegions = toRaw(this.ocrList);
        // Sending ocrList with the current region deleted, which will request main.js to delete the region data from config.ini
        window.electronAPI.updateVariable('ocrRegions', 'selected', serializableRegions);
      }   
    },
    toggleLive() {
      // Turns on/off OCR being performed in setinterval in main.js which sends back the result every second for display
      window.electronAPI.updateVariable('ocrRegions', 'selected', { live: this.ocrList.live });
    }
  },
  mounted() {
    // Trigger main.js to send ocrList, ocrConfig and images on component load (whenever 'selected' is sent by updateVariable as second parameter)
    window.electronAPI.updateVariable('ocrRegions', 'selected', { live: false });

    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ component, selectedValues }) => {
      if (selectedValues && component === 'ocrRegions') {
        // Populate fields from selectedValues
        this.ocrConfig = { ...this.ocrConfig, ...selectedValues };
        console.log('received config');
      }
    });

    // Listen for updates to populate the list box
    window.electronAPI.onupdateList(({ component, selectedList }) => {
      if (selectedList && component === 'ocrRegions') {
        // Populate fields from selectedList
        this.ocrList = { ...this.ocrList, ...selectedList };
        console.log('received list');
      }
    }); 

    // Listen for the combined images message and update them in the html
    window.electronAPI.onupdateImages(({ unmodifiedImageData, modifiedImageData }) => {
      const unmodifiedBlob = new Blob([unmodifiedImageData], { type: 'image/png' });
      document.getElementById('unmodifiedImage').src = URL.createObjectURL(unmodifiedBlob);

      const modifiedBlob = new Blob([modifiedImageData], { type: 'image/png' });
      document.getElementById('modifiedImage').src = URL.createObjectURL(modifiedBlob);
    });

    // Listen for OCR text result to populate field in the html
    window.electronAPI.onOCRText((event, ocrData) => {
      const { ocrText } = ocrData;
      this.ocrText = `${ocrText || 'No text found'}`;
    });
  }
};
</script>

<style scoped>
.bold-btn {
  font-weight: bold; /* Force bold text on listbox items */
}

.img-fluid {
  object-fit: contain; /* Makes images always fit in 100px height */
  max-height: 100px;
}

.fixed-width-input {
  width: 7ch; /* Makes form field inputs wide enough for 4 characters */
  padding: 0; 
  text-align: center;
}

#ocrText {
  background-color: #fff; /* White background for info boxes */
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-top: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow for the text boxes */
}
</style>
