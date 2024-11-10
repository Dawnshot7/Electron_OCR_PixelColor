<template>
  <div class="container mt-4">
    <h1 class="mb-3">OCR Configurator</h1>
    <b-row>

      <!-- Left Column with Listbox of OCR Regions -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div class="list-group">
          <button
            v-for="region in ocrList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === ocrList.regionSelected }]"
          >
            {{ region }}
          </button>
        </div>
      </b-col>

      <!-- All other content in component -->
      <b-col cols="9" md="9">

        <!-- Display unmodified image, modified image and OCR text in top Row -->
        <b-row class="align-items-center mb-3">

          <!-- Images Side by Side -->
          <b-col cols="4" md="4">
            <b-img id='unmodifiedImage' src='' alt="Unmodified Image" class="img-fluid" ></b-img>
          </b-col>
          <b-col cols="4" md="4">
            <b-img id='modifiedImage' src='' alt="Modified Image" class="img-fluid" ></b-img>
          </b-col>

          <!-- OCR Text -->
          <b-col cols="4" md="4">
            <div id="ocrText" class="p-2">{{ ocrText }}</div>
          </b-col>
        </b-row>
         
        <!-- Bottom row with OCR Configuration Fields in Columns -->
        <b-row>

          <!-- Left column with box position, capture coords, show overlay, rename, new region, delete region -->
          <b-col cols="4" md="4">

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
            <b-row>
              <b-col cols="12" md="12">
                <b-button @click="startCaptureBox">Start Coordinate Capture</b-button>
              </b-col>
            </b-row>

            <!-- Button to show current ocr box on overlay -->
            <!-- Edit box to change region name  -->
            <!-- Button to create a new region with default settings -->
            <!-- Button to delete current region from the list -->
          </b-col>

           <!-- Middle column with image modification fields (Invert, brightness, contrast) -->
          <b-col cols="4" md="4">
            
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

          <!-- Placeholder column for other options -->
          <b-col cols="4" md="4">
            <!-- Live OCR text checkbox -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <b-form-checkbox v-model="ocrList.live" @change="toggleLive">Live OCR text</b-form-checkbox>
              </div>
            </b-row>          </b-col>
        </b-row>
      </b-col>
    </b-row>
  </div>
</template>

<script>
export default {
  data() {
    return {
      ocrList: {
        profile: 'initial',
        regions: ['ocrRegion1', 'ocrRegion2'],
        regionSelected: 'ocrRegion1',
        live: false
      },
      ocrText: 'Start OCR',
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
      window.electronAPI.startCaptureBox();
    },
    toggleInvert() {
      window.electronAPI.updateVariable('ocrRegions', this.ocrList.regionSelected, { invert: this.ocrConfig.invert });
    },
    adjustBrightness(delta) {
      this.ocrConfig.brightness = Math.min(1, Math.max(0, parseFloat((this.ocrConfig.brightness + delta).toFixed(1))));
      window.electronAPI.updateVariable('ocrRegions', this.ocrList.regionSelected, { brightness: this.ocrConfig.brightness });
    },
    adjustContrast(delta) {
      this.ocrConfig.contrast = Math.min(1, Math.max(0, parseFloat((this.ocrConfig.contrast + delta).toFixed(1))));
      window.electronAPI.updateVariable('ocrRegions', this.ocrList.regionSelected, { contrast: this.ocrConfig.contrast });
    },
    regionChange(newSelection) {
      this.ocrList.regionSelected = newSelection;
      window.electronAPI.updateVariable('ocrRegions', 'selected', { regionSelected: newSelection });
    },
    toggleLive() {
      window.electronAPI.updateVariable('ocrRegions', 'selected', { live: this.ocrList.live });
    }
  },
  mounted() {
    // Trigger initial selection update on component load and set live ocr to false
    window.electronAPI.updateVariable('ocrRegions', 'selected', {});

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
      }
    });

    // Listen for sent unmodified image
    window.electronAPI.onupdateUnmodifiedImage(({ buffer }) => {
      const blob = new Blob([buffer], { type: 'image/png' });
      document.getElementById('unmodifiedImage').src = URL.createObjectURL(blob);
    }); 
    
    // Listen for sent modified image
    window.electronAPI.onupdateModifiedImage(({ buffer }) => {
      const blob = new Blob([buffer], { type: 'image/png' });
      document.getElementById('modifiedImage').src = URL.createObjectURL(blob);
    }); 
    
    // Listen for updates to populate the list box on component load
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
#ocrText {
  font-weight: bold;
}

.fixed-width-input {
  width: 5ch; /* Makes input wide enough for 3 characters */
  padding: 0; /* Removes all padding */
  text-align: center;
}

.container .img-fluid {
  max-width: 100%;
  height: auto;
}

.list-group-item.active {
  background-color: #007bff;
  color: white;
}
</style>
