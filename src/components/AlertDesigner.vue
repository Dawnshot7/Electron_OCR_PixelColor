<template>
  <div class="container mt-4">
    <h1 class="mb-3">Alert Designer</h1>
    <b-row>

      <!-- Left Column with Listbox of alerts -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div class="list-group">
          <!-- Render active alert buttons -->
          <button
            v-for="region in alertsList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === alertsList.regionSelected }, 'text-center', 'alert-btn']"
          >
            {{ region }}
          </button>

          <!-- Render the "Add Region" button in the next available slot -->
          <button
            v-if="alertsList.regions.length < 15"
            @click="addRegion()"
            class="list-group-item list-group-item-action text-center add-region-btn bg-light"
            style="background-color: #797979;"
          >
            Add Region
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 15 -->
          <button
            v-for="index in 15 - alertsList.regions.length - 1"
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
        <!-- Display alert preview in top Row -->
        <b-row class="align-items-center mb-3">

          <!-- Images Side by Side -->
          <b-col cols="4" md="4">
            <b-img id='unmodifiedImage' src='' alt="Unmodified Image" class="img-fluid" ></b-img>
          </b-col>
        </b-row>
         
        <!-- Bottom row with Alert Configuration Fields in Columns -->
        <b-row>

          <!-- Left column with alert position, show overlay, rename, new region, delete region -->
          <b-col cols="4" md="4">

            <!-- Position Fields -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <label for="input-x">  X:</label>
                <b-form-input
                  id="input-x"
                  v-model="alertsConfig.x"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
                <label for="input-y">  Y:</label>
                <b-form-input
                  id="input-y"
                  v-model="alertsConfig.y"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
                <label for="input-w">  W:</label>
                <b-form-input
                  id="input-w"
                  v-model="alertsConfig.width"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
                <label for="input-h">  H:</label>
                <b-form-input
                  id="input-h"
                  v-model="alertsConfig.height"
                  type="number"
                  class="fixed-width-input"
                  readonly
                ></b-form-input>
              </div>
            </b-row>
            
            <!-- Button to show overlay in edit mode -->
            <b-row>
              <b-col cols="12" md="12">
                <b-button @click="toggleOverlay">Show Overlay in Edit Mode</b-button>
              </b-col>
            </b-row>

            <!-- Edit box to change alert name  -->
            <!-- Button to create a new alert with default settings -->
            <!-- Button to delete current alert from the list -->
          </b-col>

           <!-- Middle column with image modification fields (Invert, brightness, contrast) -->
          <b-col cols="4" md="4">
            
            <!-- Invert Checkbox -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <b-form-checkbox v-model="alertsConfig.invert" @change="toggleInvert">Invert image</b-form-checkbox>
              </div>
            </b-row>

            <!-- Brightness Controls -->
            <b-row class="mt-3">
              <b-form-group label="Brightness" label-align="center" label-for="brightness">
                <div class="d-flex justify-content-center">
                  <b-button @click="adjustBrightness(-0.1)" variant="outline-secondary">-</b-button>
                  <b-form-input
                    v-model="alertsConfig.brightness"
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
                    v-model="alertsConfig.contrast"
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
      alertsList: {
        profile: 'initial',
        regions: ['initial'],
        regionSelected: 'initial',
        live: false
      },
      alertsConfig: {
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
    toggleInvert() {
      // Update config.ini with new invert image variable state 
      window.electronAPI.updateVariable('alerts', this.alertsList.regionSelected, { invert: this.alertsConfig.invert });
    },
    adjustContrast(delta) {
      // Increment or decrement contrast and update config.ini
      this.alertsConfig.contrast = Math.min(1, Math.max(0, parseFloat((this.alertsConfig.contrast + delta).toFixed(1))));
      window.electronAPI.updateVariable('alerts', this.alertsList.regionSelected, { contrast: this.alertsConfig.contrast });
    },
    regionChange(newSelection) {
      // Change alert being displayed and have main.js send the new box's config data
      this.alertsList.regionSelected = newSelection;
      window.electronAPI.updateVariable('alerts', 'selected', { regionSelected: newSelection });
    },
    addRegion() {
      // Add a new alert to the list 
      const newRegion = `alerts${this.alertsList.regions.length + 1}`;
      this.alertsList.regions.push(newRegion);
      // Switch to new region and have main.js create a new region in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    toggleOverlay() {
      window.electronAPI.toggleOverlay();
      console.log('toggled overlay')
    }
  },
  mounted() {
    // Trigger main.js to send list, config and images on component load 
    window.electronAPI.updateVariable('alerts', 'selected', { live: false });

    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ selectedValues }) => {
      if (selectedValues) {
        // Populate fields from selectedValues
        this.alertsConfig = { ...this.alertsConfig, ...selectedValues };
        console.log('received config');
      }
    });

    // Listen for updates to populate the list box on component load
    window.electronAPI.onupdateList(({ selectedList }) => {
      if (selectedList) {
        // Populate fields from selectedValues
        this.alertsList = { ...this.alertsList, ...selectedList };
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
.fixed-width-input {
  width: 5ch; /* Makes input wide enough for 3 characters */
  padding: 0; /* Removes all padding */
  text-align: center;
}

.container .img-fluid {
  max-width: 100%;
  height: auto;
}

.alert-btn {
  font-weight: bold; /* Force bold text */
}
</style>
