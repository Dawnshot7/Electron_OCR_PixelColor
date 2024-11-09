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

        <!-- Display unmodified image, modified image and OCR text in a Row -->
        <b-row class="align-items-center mb-3">

          <!-- Images Side by Side -->
          <b-col cols="4" md="4">
            <img :src="ocrImages.unmodified" alt="Unmodified Image" class="img-fluid" />
          </b-col>
          <b-col cols="4" md="4">
            <img :src="ocrImages.modified" alt="Modified Image" class="img-fluid" />
          </b-col>

          <!-- OCR Text -->
          <b-col cols="4" md="4">
            <div id="ocrText" class="p-2">{{ ocrText }}</div>
          </b-col>
        </b-row>
         
        <!-- OCR Region Configuration Fields in Columns -->
        <b-row>

          <!-- Region name, position, save, delete and new region buttons -->
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
          </b-col>

           <!-- Image modification fields -->
          <b-col cols="4" md="4">
            
            <!-- Invert Checkbox -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <b-form-checkbox v-model="ocrConfig.invert">Invert image</b-form-checkbox>
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
                  <b-button @click="adjustContrast(+0.1)" variant="outline-secondary">+</b-button>
                  <b-form-input
                    v-model="ocrConfig.contrast"
                    type="number"
                    class="fixed-width-input"
                    readonly
                  ></b-form-input>
                  <b-button @click="adjustContrast(-0.1)" variant="outline-secondary">-</b-button>
                </div>
              </b-form-group>
            </b-row>
            
          </b-col>

          <!-- Placeholder column for other options -->
          <b-col cols="4" md="4">
            <img :src="unmodifiedImageSrc" alt="other options" class="img-fluid" />
          </b-col>
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
      },
      ocrImages: {
        unmodified: '', // Placeholder for unmodified image src
        modified: '',   // Placeholder for modified image src
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

    // IPC listener for image updates
    window.electronAPI.onupdateImages(({ unmodified, modified }) => {
      this.ocrImages = { unmodified, modified };
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
