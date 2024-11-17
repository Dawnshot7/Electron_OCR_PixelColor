<template>
  <div class="container mt-4">
    <h1 class="mb-3">Alert Designer</h1>
    <b-row>
      <!-- Left Column with Listbox of Pixel Regions -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div 
          class="list-group listbox-container" 
          style="max-height: 460px; overflow-y: auto;"
        >
          <!-- Render active OCR region buttons -->
          <button
            v-for="region in alertsList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === alertsList.regionSelected }, 'text-center', 'bold-btn']"
          >
            {{ region }}
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 12 -->
          <button
            v-for="index in Math.max(0, 11 - alertsList.regions.length)"
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

      <!-- Main column with Alert Configuration Fields -->
      <b-col cols="9" md="9">
        
        <!-- Alert Preview -->
        <b-row class="align-items-center mb-3">
          <div 
            class="d-flex justify-content-center align-items-center" 
            :style="{ whiteSpace: 'nowrap', overflow: 'hidden', height: '100px', color: alertsConfig.color, fontSize: alertsConfig.textSize + 'px' }"
            >{{ alertsConfig.content }}
          </div>
        </b-row>
         
        <!-- Alert Configuration Fields -->
        <b-row class="mt-3">
          <!-- Left column: Position Controls, Overlay Toggle -->
          <b-col cols="6" md="6">
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <label for="input-x">  X:</label>
                <b-form-input id="input-x" v-model="alertsConfig.x" type="number" class="fixed-width-input" readonly></b-form-input>
                <label for="input-y">  Y:</label>
                <b-form-input id="input-y" v-model="alertsConfig.y" type="number" class="fixed-width-input" readonly></b-form-input>
              </div>
            </b-row>
            
            <!-- Toggle Overlay Button -->
            <b-row class="d-flex justify-content-center">
                <b-button @click="showDraggableOverlay" variant="warning" :style="{ width: 'auto', marginTop: '20px' }">View and Move Alerts</b-button>
            </b-row>

          </b-col>

          <!-- Middle column: Text, Font Size, and Color -->
          <b-col cols="6" md="6">
            <!-- Alert Text Editbox -->
            <b-row class="mt-3">
              <b-form-group label="Alert Text" label-for="alertText">
                <div class="d-flex align-items-center">
                  <b-form-input id="alertText" v-model="alertsConfig.content" placeholder="Enter alert text"></b-form-input>
                  <b-button @click="updateAlertText(alertsConfig.content)" variant="success">Submit</b-button>
                </div>
              </b-form-group>
            </b-row>

            <!-- Font Size Controls -->
            <b-row class="mt-3">
              <b-form-group label="Font Size" label-align="center" label-for="textSize">
                <div class="d-flex justify-content-center">
                  <b-button @click="adjustFontSize(-4)" variant="outline-secondary">-</b-button>
                  <b-form-input id="textSize" v-model="alertsConfig.textSize" type="number" class="fixed-width-input" readonly></b-form-input>
                  <b-button @click="adjustFontSize(4)" variant="outline-secondary">+</b-button>
                </div>
              </b-form-group>
            </b-row>

            <!-- Font Color Listbox -->
            <b-row class="mt-3">
              <b-form-group label="Font Color" label-for="fontColor">
                <b-form-select
                  id="fontColor"
                  v-model="alertsConfig.color"
                  :options="fontColors"
                   @input="updateAlertColor(alertsConfig.color)"
                ></b-form-select>
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
      alertsList: {
        profile: 'initial',
        regions: ['initial'],
        regionSelected: 'initial',
        live: false,
      },
      alertsConfig: {
        x: 0,
        y: 0,
        content: 'initial',      // Alert text
        textSize: 24,  // Font size for the alert text
        color: 'Green', // Default color for font
      },
      fontColors: [
        { value: 'Black', text: 'Black' },
        { value: 'Red', text: 'Red' },
        { value: 'Green', text: 'Green' },
        { value: 'Blue', text: 'Blue' },
        { value: 'Yellow', text: 'Yellow' },
      ],
    };
  },
  methods: {
    regionChange(newSelection) {
      this.alertsList.regionSelected = newSelection;
      window.electronAPI.updateVariable('alerts', 'selected', { regionSelected: newSelection });
      window.electronAPI.updateVariable('alerts', 'selected', { regions: this.alertsList.regions });
    },
    addRegion() {
      // Add a new OCR region to the list 
      let lastNumber = 0;
      const lastItemName = this.alertsList.regions[this.alertsList.regions.length - 1];
      const match = lastItemName.match(/(\d+)$/);
      lastNumber = parseInt(match[1], 10);
      const newRegion = `alert${lastNumber + 1}`;
      this.alertsList.regions.push(newRegion);
      // Switch to new region and have main.js create a new region in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    deleteRegion() {
      if (this.alertsList.regions.length > 1) {
        const index = this.alertsList.regions.findIndex(region => region === this.alertsList.regionSelected);
        this.alertsList.regions.splice(index, 1);
        const serializableRegions = toRaw(this.alertsList);
        window.electronAPI.updateVariable('alerts', 'selected', serializableRegions);
      }  
    },
    showDraggableOverlay() {
      window.electronAPI.showDraggableOverlay();
      console.log('Showed draggable overlay');
    },
    updateAlertText(text) {
      window.electronAPI.updateVariable('alerts', this.alertsList.regionSelected, { content: text });
    },    
    updateAlertColor(color) {
      window.electronAPI.updateVariable('alerts', this.alertsList.regionSelected, { color: color });
    },
    adjustFontSize(delta) {
      this.alertsConfig.textSize = Math.max(12, Math.min(192, this.alertsConfig.textSize + delta));
      window.electronAPI.updateVariable('alerts', this.alertsList.regionSelected, { textSize: this.alertsConfig.textSize });
    },
  },
  mounted() {
    window.electronAPI.updateVariable('alerts', 'selected', { live: false });
    window.electronAPI.onupdateConfig(({ selectedValues }) => {
      if (selectedValues) {
        this.alertsConfig = { ...this.alertsConfig, ...selectedValues };
        console.log('Received config');
      }
    });
    window.electronAPI.onupdateList(({ selectedList }) => {
      if (selectedList) {
        this.alertsList = { ...this.alertsList, ...selectedList };
        console.log('Received list');
      }
    });
  },
};
</script>

<style scoped>
.fixed-width-input {
  width: 7ch; /* Makes input wide enough for 3 characters */
  padding: 0; /* Removes all padding */
  text-align: center;
}

.container .img-fluid {
  max-width: 100%;
  height: auto;
}

.bold-btn {
  font-weight: bold; /* Force bold text */
}
</style>
