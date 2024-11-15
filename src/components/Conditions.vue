<template>
  <div class="container mt-4">
    <h1 class="mb-3">Conditions Builder</h1>
    <b-row>

    <!-- Left Column with Listbox of OCR Regions -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div class="list-group">

          <!-- Render active OCR region buttons -->
          <button
            v-for="region in conditionsList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === conditionsList.regionSelected }, 'text-center', 'pixel-btn']"
          >
            {{ region }}
          </button>

          <!-- Render the "Add Region" button in the next available slot -->
          <button
            v-if="conditionsList.regions.length < 15"
            @click="addRegion()"
            class="list-group-item list-group-item-action text-center add-region-btn bg-light"
            style="background-color: #797979;"
          >
            Add Region
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 15 -->
          <button
            v-for="index in 15 - conditionsList.regions.length - 1"
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
        
        <!-- Main row with Condition Configuration Fields in Columns -->
        <b-row>

          <!-- Left column with rename, delete condition -->
          <b-col cols="4" md="4">

          </b-col>

          <!-- Second column with condition dropdown listboxes, checkboxes, edit fields -->
          <b-col cols="4" md="4">

          </b-col>

          <!-- Third column with toggle overlay in game-mode -->
          <b-col cols="4" md="4">

            <!-- Toggle Overlay Button -->
            <b-row class="mt-3">
              <b-col cols="12" md="12">
                <b-button @click="toggleGameModeOverlay">Toggle Game-mode Overlay</b-button>
              </b-col>
            </b-row>
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
      conditionsList: {
        profile: 'initial',
        regions: ['initial'],
        ocrRegions: ['initial'],
        pixelRegions: ['initial'],
        alertRegions: ['initial'],
        regionSelected: 'initial',
        live: false
      },
      conditionsConfig: {
        ocrRegions: '',
        regex: '',
        matches: [],
        pixelCoords: ['pixelCoord1'],
        pixelComparison: [],
        alert: ''
      },
    };
  },
  methods: {
    regionChange(newSelection) {
      // Change ocr box being displayed and have main.js send the new box's config data
      this.conditionsList.regionSelected = newSelection;
      window.electronAPI.updateVariable('conditions', 'selected', { regionSelected: newSelection });
    },
    addRegion() {
      // Add a new OCR region to the list 
      const newRegion = `pixelCoord${this.conditionsList.regions.length + 1}`;
      this.conditionsList.regions.push(newRegion);
      // Switch to new region and have main.js create a new region in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    toggleGameModeOverlay() {
      window.electronAPI.toggleGameModeOverlay();
      console.log('Toggled game-mode overlay');
    },
  },
  mounted() {
    // Trigger main.js to send list, config and images on component load 
    window.electronAPI.updateVariable('conditions', 'selected', {});
    
    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ selectedValues }) => {
      if (selectedValues) {
        // Populate fields from selectedValues
        this.conditionsConfig = { ...this.conditionsConfig, ...selectedValues };
        console.log(`received config`, selectedValues.color);
      }
    });

    // Listen for updates to populate the list box on component load
    window.electronAPI.onupdateList(({ selectedList }) => {
      if (selectedList) {
        // Populate fields from selectedValues
        this.conditionsList = { ...this.conditionsList, ...selectedList };
        console.log('received list');
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