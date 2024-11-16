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

        <!-- Top row with delete, rename region, toggle overlay -->
        <b-row class="mt-3">

          <b-col cols="6" md="6">
            <!-- Delete region button -->
            <b-button @click="deleteRegion" variant="success" size="sm">Delete Region</b-button>
          </b-col>
          <b-col cols="6" md="6">
            <!-- Toggle overlay button -->
            <b-button @click="toggleGameModeOverlay" variant="warning">Toggle Game-mode Overlay</b-button>
          </b-col>

        </b-row>

        <!-- Main row with Condition Configuration Fields in Columns -->
        <b-row>

          <!-- Left column with  -->
          <b-col cols="6" md="6">
            <h4>OCR Configuration</h4>

            <!-- Select OCR Region -->
            <b-form-group label="OCR Region">
              <b-form-select
              v-model="conditionsConfig.ocrRegions"
              :options="conditionsList.ocrRegions"
              ></b-form-select>
            </b-form-group>

            <!-- Regex Input -->
            <b-form-group label="Regex Pattern">
              <b-form-input v-model="conditionsConfig.regex" placeholder="(.*)"></b-form-input>
            </b-form-group>

            <!-- Matches (Dynamic Fields) -->
            <div>
              <h5>Matches</h5>
              <div
              v-for="(match, index) in conditionsConfig.matches"
              :key="`match-${index}`"
              class="mb-2"
              >
              <b-row>
                <b-col cols="4">
                <b-form-select
                  v-model="match[0]"
                  :options="['equals', 'notEquals', 'lessThan', 'greaterThan', 'between']"
                ></b-form-select>
                </b-col>
                <b-col cols="4">
                <b-form-input
                  v-model="match[1]"
                  placeholder="value"
                ></b-form-input>
                </b-col>
                <b-col cols="4">
                  <div
                  v-if="match[0] === 'between'"
                  class="mb-2"
                  >
                  <b-form-input
                    v-model="match[2]"
                    placeholder="value"
                  ></b-form-input>
                </div>
                </b-col>
              </b-row>
              </div>
              <b-button @click="addMatch" variant="success" size="sm" :style="{ marginRight: '10px'}">Add Match Group</b-button>
              <b-button @click="deleteMatch" variant="success" size="sm">Delete Match Group</b-button>
            </div>

            <h4></h4>
            <h4></h4>
            <h4>Alert Choice</h4>

            <!-- Select OCR Region -->
            <b-form-group label="Alert">
              <b-form-select
              v-model="conditionsConfig.alert"
              :options="conditionsList.alertRegions"
              ></b-form-select>
            </b-form-group>
          </b-col>

          <!-- Right column with  -->
          <b-col cols="6" md="6">
            <h4>Pixel Configuration</h4>

            <!-- Dynamic Pixel Coordinates -->
            <div>
              <div
              v-for="(coord, index) in conditionsConfig.pixelCoords"
              :key="`pixel-${index}`"
              class="mb-2"
              >
              <b-row>
                <b-col cols="4">
                <b-form-select
                  v-model="conditionsConfig.pixelCoords[index]"
                  :options="conditionsList.pixelRegions"
                ></b-form-select>
                </b-col>
                <b-col cols="4">
                <b-form-select
                  v-model="conditionsConfig.pixelComparison[index]"
                  :options="['equals', 'notEquals']"
                ></b-form-select>
                </b-col>
              </b-row>
              </div>
              <b-button @click="addPixelCoord" variant="success" size="sm" :style="{ marginRight: '10px'}">Add Pixel</b-button>
              <b-button @click="deletePixelCoord" variant="success" size="sm" >Delete Pixel</b-button>
            </div>

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
      const serializableConfig = toRaw(this.conditionsConfig);
      window.electronAPI.updateVariable('conditions', this.conditionsList.regionSelected, serializableConfig );
      this.conditionsList.regionSelected = newSelection;
      window.electronAPI.updateVariable('conditions', 'selected', { regionSelected: this.conditionsList.regionSelected });
    },
    addRegion() {
      // Add a new OCR region to the list 
      const newRegion = `condition${this.conditionsList.regions.length + 1}`;
      this.conditionsList.regions.push(newRegion);
      // Switch to new region and have main.js create a new region in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    deleteRegion() {
      if (this.conditionsList.regions.length > 1) {
        const index = this.conditionsList.regions.findIndex(region => region === this.conditionsList.regionSelected);
        this.conditionsList.regions.splice(index, 1);
        const serializableRegions = toRaw(this.conditionsList);
        window.electronAPI.updateVariable('conditions', 'selected', serializableRegions);
      }  
    },
    addMatch() {
	  // Add new match field
      this.conditionsConfig.matches.push({ value: '', comparison: '' });
    },
    deleteMatch() {
	  // Delete bottom match field
      this.conditionsConfig.matches.pop();
    },    
	  addPixelCoord() {
    // Add new pixel coordinate
      this.conditionsConfig.pixelCoords.push('');
      this.conditionsConfig.pixelComparison.push('');
    },
	  deletePixelCoord() {
    // Delete bottom pixel coordinate
      this.conditionsConfig.pixelCoords.pop();
    },
	  toggleGameModeOverlay() {
      const serializableConfig = toRaw(this.conditionsConfig);
      window.electronAPI.updateVariable('conditions', this.conditionsList.regionSelected, serializableConfig );
      window.electronAPI.toggleGameModeOverlay();
      console.log('Toggled game-mode overlay');
    }
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
  unmounted() {
    const serializableConfig = toRaw(this.conditionsConfig);
    window.electronAPI.updateVariable('conditions', this.conditionsList.regionSelected, serializableConfig );
  }
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