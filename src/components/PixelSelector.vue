<template>
  <div class="container mt-4">
    <!-- Component Heading -->
    <div class="d-flex align-items-center">
      <h1 class="mb-3">Pixel Selector: </h1>

      <!-- Currently selected item name -->
      <b-form-input 
        v-model="renameRegionValue" 
        class="ml-2" 
        style="max-width: 150px; max-height: 40px; margin-bottom: 10px; margin-left: 10px" 
        :placeholder="pixelList.regionSelected"
        maxlength="20">
      </b-form-input>

      <!-- Rename Button -->
      <b-button 
        class="ml-2" 
        @click="renameRegion(renameRegionValue)"
        style="max-height: 40px; margin-bottom: 10px;" 
        size="sm"
        variant="light">
        Rename
      </b-button>
    </div>
    <b-row>

      <!-- Left column with listbox of pixel coordinates -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div 
          class="list-group listbox-container" 
          style="max-height: 460px; overflow-y: auto;"
        >
          <!-- Render active pixel coordinate buttons -->
          <button
            v-for="region in pixelList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === pixelList.regionSelected }, 'text-center', 'bold-btn']"
          >
            {{ region }}
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 11 -->
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
          Add Pixel
        </button>

        <!-- Render the "Delete Region" button always visible below the list -->
        <button
          @click="deleteRegion"
          class="list-group-item list-group-item-action text-center delete-region-btn bold-btn mt-2"
          style="margin-top: 25px; background-color: #dc3545; width: 100%;"
        >
          Delete Pixel
        </button>
      </b-col>

      <!-- All other content in component -->
      <b-col cols="9" md="9" class="image-region"> 
        <b-row>
       
          <!-- Left column with screenshot image of position, pixel coordinate, and capture coordinate button -->
          <b-col cols="6" md="6">

            <!-- Image of pixel location with fixed height -->
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
              <div class="d-flex justify-content-center">
                <p :style="{ textAlign: 'center', width: '75%' }">Records next mouse button click for pixel coordinate</p>
              </div>
            </b-row>

          </b-col>

          <!-- Right column with pixel color in hex and colored text, and toggle live color feed checkbox -->
          <b-col cols="6" md="6">

            <!-- Pixel color div with fixed height -->
            <b-row class="align-items-center justify-content-center mb-3" style="width: 90%; height: 116px;">
              <div 
                  id="color-info" 
                  class="mt-1 pixelText" 
                  :style="{ color: pixelConfig.liveColor, fontWeight: 'bold' }"
                  v-html="colorInfo"
                >
              </div>
            </b-row>
            
            <!-- Live pixel color checkbox -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <b-form-checkbox v-model="pixelList.live" @change="toggleLive">Live pixel color</b-form-checkbox>

                <!-- Tooltip -->
                <i 
                  id="tooltipIcon" 
                  class="ml-2 question-mark"  
                  v-b-tooltip.hover 
                  title="For testing purposes, the color of 
selected pixel will updated on this 
window every 0.5s and represented 
as the above font color and compared 
to the saved color.">?
                </i>
                
              </div>
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
      pixelList: {
        profile: '',
        regions: [''],
        regionSelected: '',
        live: false
      },
      colorInfo: "",
      pixelConfig: {
        x: 0,
        y: 0,
        color: '000000',
        liveColor: '000000'
      },
      renameRegionValue: ''
    };
  },
  methods: {
    startCapturePixel() {
      // Runs getPixelCoords.ahk to collect new (x1,y1) of the pixel and save to config.ini
      window.electronAPI.runAhkScript('getPixelCoords', '', '');
    },
    regionChange(newSelection) {
      // Change pixel coordinate being displayed and have main.js send back the new pixel's config data
      this.pixelList.regionSelected = newSelection;
      window.electronAPI.updateVariable('update', 'pixelCoords', 'selected', { regionSelected: newSelection });
      this.renameRegionValue = '';
    },
    addRegion() {
      // Find the highest number at the end of existing alert names, create new unique alert name, add to regions list
      let highestNumber = 0;
      this.pixelList.regions.forEach(region => {
        const match = region.match(/pixel(\d+)$/); // Match names ending in 'alert<number>'
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > highestNumber) {
            highestNumber = number;
          }
        }
      });
      const newRegion = `pixel${highestNumber + 1}`;
      this.pixelList.regions.push(newRegion);
      // Switch to new pixel. Main.js will add a new pixel in config.ini and send back default config settings
      this.pixelList.regionSelected = newRegion;
      window.electronAPI.updateVariable('add', 'pixelCoords', 'selected', { regionSelected: newRegion });
    },
    deleteRegion() {
      // Delete current pixel coordinate from the listbox
      if (this.pixelList.regions.length > 1) {
        const index = this.pixelList.regions.findIndex(region => region === this.pixelList.regionSelected);
        this.pixelList.regions.splice(index, 1);
        console.log(`pixel regions: ${this.pixelList.regions}, selection: ${this.pixelList.regionSelected}`)
        const serializableRegions = toRaw(this.pixelList);
        // Sending pixelList with the current pixel deleted, which will request main.js to delete the pixel data from config.ini
        window.electronAPI.updateVariable('delete', 'pixelCoords', 'selected', serializableRegions);
      }  
    },
    renameRegion(newName) {
      const serializableConfig = toRaw(this.pixelConfig);
      window.electronAPI.updateVariable('rename', 'pixelCoords', newName, serializableConfig );
      this.renameRegionValue = '';
    },
    toggleLive() {
      // Turns on/off pixel color capture being performed in setinterval in main.js which sends back the result every second for display
      window.electronAPI.updateVariable('update', 'pixelCoords', 'selected', { live: this.pixelList.live });
    }
  },
  mounted() {
    // Trigger main.js to send pixelList, pixelConfig and screenshot image on component load (whenever 'selected' is sent by updateVariable as second parameter)
    window.electronAPI.updateVariable('update', 'pixelCoords', 'selected', { live: false });
    
    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ component, selectedValues }) => {
      if (selectedValues && component === 'pixelCoords') {
        // Populate fields from selectedValues
        selectedValues.color = `#${selectedValues.color}`
        this.pixelConfig = { ...this.pixelConfig, ...selectedValues };
        console.log(`received config`, selectedValues.color);
        this.colorInfo = `Color at (${this.pixelConfig.x}, ${this.pixelConfig.y}): ${this.pixelConfig.color}`;
        this.pixelConfig.liveColor = this.pixelConfig.color;
      }
    });

    // Listen for updates to populate the list box 
    window.electronAPI.onupdateList(({ component, selectedList }) => {
      if (selectedList && component === 'pixelCoords') {
        // Populate fields from selectedList
        this.pixelList = { ...this.pixelList, ...selectedList };
        console.log('received list');
      }
    }); 

    // Listen for the image message and update image in the html
    window.electronAPI.onupdatePixelImages(({ imageData }) => {
      const unmodifiedBlob = new Blob([imageData], { type: 'image/png' });
      document.getElementById('pixelImage').src = URL.createObjectURL(unmodifiedBlob);
    });
    
    // Listen for pixel color result to populate field in the html
    window.electronAPI.onpixelColor(({ liveColor }) => {
      if (liveColor) {
        this.pixelConfig.liveColor = `#${liveColor}`;
        const match = (this.pixelConfig.liveColor === this.pixelConfig.color);
        this.colorInfo = `Color at (${this.pixelConfig.x}, ${this.pixelConfig.y}): ${this.pixelConfig.liveColor}<br>Match status: ${match}`;
      }
    }); 
  }
};
</script>
  
<style scoped>
.bold-btn {
  font-weight: bold; /* Force bold text on listbox items */
}

.fixed-width-input {
  width: 7ch; /* Makes input wide enough for 4 characters */
  padding: 0; 
  text-align: center;
}

#color-info {
  background-color: #fff; /* White background for info boxes */
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-top: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow for the text boxes */
}
</style>