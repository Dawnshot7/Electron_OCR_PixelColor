<template>
  <div class="container mt-4">
    <h1 class="mb-3">Conditions Builder</h1>
    <b-row>

      <!-- Left column with listbox of conditions -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div 
          class="list-group listbox-container" 
          style="max-height: 460px; overflow-y: auto;"
        >
          <!-- Render active conditions buttons -->
          <button
            v-for="region in conditionList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === conditionList.regionSelected }, 'text-center', 'bold-btn']"
          >
            {{ region }}
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 11 -->
          <button
            v-for="index in Math.max(0, 11 - conditionList.regions.length)"
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
          Add Condition
        </button>

        <!-- Render the "Delete Region" button always visible below the list -->
        <button
          @click="deleteRegion"
          class="list-group-item list-group-item-action text-center delete-region-btn bold-btn mt-2"
          style="margin-top: 25px; background-color: #dc3545; width: 100%;"
        >
          Delete Condition
        </button>
      </b-col>

      <!-- All other content in component -->
      <b-col cols="9" md="9" class="image-region"> 
        <b-row>

          <!-- Left column with add/select pixel conditions fields, and button to toggle game-mode overlay running condition evaluator in main.js setinterval  -->
          <b-col cols="6" md="6">
            <h4>Pixel Conditions</h4>

            <!-- Dynamic pixel selector fields appear for each time addPixelCoord button below is clicked -->
            <div>
              <div
              v-for="(coord, index) in conditionConfig.pixelCoords"
              :key="`pixel-${index}`"
              class="mb-2"
              >
              <b-row>
                <b-col cols="6">
                <b-form-select
                  v-model="conditionConfig.pixelCoords[index]"
                  :options="conditionList.pixelRegions"
                ></b-form-select>
                </b-col>
                <b-col cols="6">
                <b-form-select
                  v-model="conditionConfig.pixelComparison[index]"
                  :options="['equals', 'notEquals']"
                ></b-form-select>
                </b-col>
              </b-row>
              </div>

              <!-- Add and delete pixel condition buttons -->
              <b-button @click="addPixelCoord" variant="success" size="sm" :style="{ marginRight: '10px'}">Add Pixel</b-button>
              <b-button @click="deletePixelCoord" variant="success" size="sm" >Remove Pixel</b-button>
            </div>

            <!-- Select alert that will be shown when condition is true -->
            <h4 :style="{ marginTop: '20px' }">Alert Choice</h4>
            <b-form-group label="Alert">
              <b-form-select
              v-model="conditionConfig.alert"
              :options="conditionList.alertRegions"
              ></b-form-select>
            </b-form-group>

            <!-- Select alert that will be shown when condition is true -->
            <h4 :style="{ marginTop: '20px' }">Suppression Option</h4>
            <b-form-group label="Condition hides alert for this many seconds">
              <b-form-input v-model="conditionConfig.timer" placeholder="">0</b-form-input>
            </b-form-group>

            <!-- Toggle overlay button -->
            <b-row class="d-flex justify-content-center">
              <b-button @click="toggleGameModeOverlay" variant="warning" :style="{ width: 'auto', marginTop: '20px' }">Toggle Game-mode Overlay</b-button>
            </b-row>

          </b-col>

          <!-- Right column with add/select ocr condition fields, and alert selection field  -->
          <b-col cols="6" md="6">

            <!-- Add and delete ocr condition buttons -->
            <h4>OCR Conditions</h4>
            <b-button @click="conditionConfig.ocrRegions = conditionList.ocrRegions[0]" variant="success" size="sm" :style="{ marginRight: '10px'}">Add OCR</b-button>
            <b-button @click="conditionConfig.ocrRegions = ''" variant="success" size="sm">Remove OCR</b-button>
            
            <!-- Dynamic ocr selector fields appear below when the Add OCR button above is clicked -->
            <div v-if="conditionConfig.ocrRegions !== ''">

              <!-- Select OCR Region from dropdown -->
              <b-form-group label="OCR Region">
                <b-form-select
                v-model="conditionConfig.ocrRegions"
                :options="conditionList.ocrRegions"
                ></b-form-select>
              </b-form-group>

              <!-- Regex Input -->
              <b-form-group label="Regex Pattern">
                <b-form-input v-model="conditionConfig.regex" placeholder=""></b-form-input>
              </b-form-group>

              <!-- User inputs for match comparison type and match text for each match group in regex (Dynamic fields can be added with the add matches button below) -->
              <div>
                <h5>Matches</h5>
                <div
                v-for="(match, index) in conditionConfig.matches"
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

                <!-- Add and delete matches buttons -->
                <b-button @click="addMatch" variant="success" size="sm" :style="{ marginRight: '10px'}">Add Match Group</b-button>
                <b-button @click="deleteMatch" variant="success" size="sm">Remove Match Group</b-button>
              </div>
            </div>

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
      conditionList: {
        profile: '',
        regions: [''],
        ocrRegions: [''],
        pixelRegions: [''],
        alertRegions: [''],
        regionSelected: '',
        live: false
      },
      conditionConfig: {
        ocrRegions: '',
        regex: '',
        matches: [],
        pixelCoords: [''],
        pixelComparison: [],
        alert: '',
        timer: 0,
        startTime: 0,
        resetNeeded: false
      }
    };
  },
  methods: {
    regionChange(newSelection) {
      // Change condition being displayed and have main.js send back the new box's config data
      const serializableConfig = toRaw(this.conditionConfig);
      window.electronAPI.updateVariable('conditions', this.conditionList.regionSelected, serializableConfig );
      this.conditionList.regionSelected = newSelection;
      window.electronAPI.updateVariable('conditions', 'selected', { regionSelected: this.conditionList.regionSelected });
    },
    addRegion() {
      // Add a new condition to the listbox
      let lastNumber = 0;
      const lastItemName = this.conditionList.regions[this.conditionList.regions.length - 1];
      const match = lastItemName.match(/(\d+)$/);
      lastNumber = parseInt(match[1], 10);
      const newRegion = `condition${lastNumber + 1}`;
      this.conditionList.regions.push(newRegion);
      // Switch to new condition. Main.js will add a new condition in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    deleteRegion() {
      // Delete current condition from the listbox
      if (this.conditionList.regions.length > 1) {
        const index = this.conditionList.regions.findIndex(region => region === this.conditionList.regionSelected);
        this.conditionList.regions.splice(index, 1);
        const serializableRegions = toRaw(this.conditionList);
        // Sending conditionList with the current condition deleted, which will request main.js to delete the condition data from config.ini
        window.electronAPI.updateVariable('conditions', 'selected', serializableRegions);
      }  
    },
    addMatch() {
	  // Add new match field
      this.conditionConfig.matches.push(['','','']);
    },
    deleteMatch() {
	  // Delete bottom match field
      this.conditionConfig.matches.pop();
    },    
	  addPixelCoord() {
    // Add new pixel coordinate
      this.conditionConfig.pixelCoords.push('');
      this.conditionConfig.pixelComparison.push('');
    },
	  deletePixelCoord() {
    // Delete bottom pixel coordinate
      this.conditionConfig.pixelCoords.pop();
    },
	  toggleGameModeOverlay() {
      // Display overlay.html in game-mode (ignoreMouseEvents=true, running condition evaluator in main.js setinterval)
      const serializableConfig = toRaw(this.conditionConfig);
      // Submits all fields and sends to main.js to update config.ini
      window.electronAPI.updateVariable('conditions', this.conditionList.regionSelected, serializableConfig );
      // Requests main.js to show/hide the overlay
      window.electronAPI.toggleGameModeOverlay();
      console.log('Toggled game-mode overlay');
    }
  },
  mounted() {
    // Trigger main.js to send conditionList and conditionConfig on component load (whenever 'selected' is sent by updateVariable as second parameter)
    window.electronAPI.updateVariable('conditions', 'selected', {});
    
    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ selectedValues }) => {
      if (selectedValues) {
        // Populate fields from selectedValues
        this.conditionConfig = { ...this.conditionConfig, ...selectedValues };
        console.log(`received config`, selectedValues.color);
      }
    });

    // Listen for updates to populate the list box 
    window.electronAPI.onupdateList(({ selectedList }) => {
      if (selectedList) {
        // Populate fields from selectedList
        this.conditionList = { ...this.conditionList, ...selectedList };
        console.log('received list');
      }
    }); 
  },
  unmounted() {
    // Submits all fields and sends to main.js to update config.ini
    const serializableConfig = toRaw(this.conditionConfig);
    window.electronAPI.updateVariable('conditions', this.conditionList.regionSelected, serializableConfig );
  }
};
</script>
  
<style scoped>
.bold-btn {
  font-weight: bold; /* Force bold text on listbox items */
}
</style>