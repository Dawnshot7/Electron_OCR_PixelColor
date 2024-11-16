<template>
  <div class="container mt-4">
    <h1 class="mb-3">Alert Designer</h1>
    <b-row>

      <!-- Left Column with Listbox of alerts -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div class="list-group">
          <button
            v-for="region in alertsList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === alertsList.regionSelected }, 'text-center', 'alert-btn']"
          >
            {{ region }}
          </button>
          <button
            v-if="alertsList.regions.length < 15"
            @click="addRegion()"
            class="list-group-item list-group-item-action text-center add-region-btn bg-light"
            style="background-color: #797979;"
          >
            Add Region
          </button>
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

      <!-- Main column with Alert Configuration Fields -->
      <b-col cols="9" md="9">
        
        <!-- Delete region button -->
        <b-button @click="deleteRegion" variant="success" size="sm">Delete Region</b-button>

        <!-- Alert Preview -->
        <b-row class="align-items-center mb-3">
          <div 
            class="d-flex justify-content-center align-items-center" 
            :style="{ whiteSpace: 'nowrap', overflow: 'hidden', height: '175px', color: alertsConfig.color, fontSize: alertsConfig.textSize + 'px' }"
            >{{ alertsConfig.content }}
          </div>
        </b-row>
         
        <!-- Alert Configuration Fields -->
        <b-row class="mt-3">
          <!-- Left column: Position Controls, Overlay Toggle -->
          <b-col cols="4" md="4">
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <label for="input-x">  X:</label>
                <b-form-input id="input-x" v-model="alertsConfig.x" type="number" class="fixed-width-input" readonly></b-form-input>
                <label for="input-y">  Y:</label>
                <b-form-input id="input-y" v-model="alertsConfig.y" type="number" class="fixed-width-input" readonly></b-form-input>
              </div>
            </b-row>
            
            <!-- Toggle Overlay Button -->
            <b-row class="mt-3">
              <b-col cols="12" md="12">
                <b-button @click="showDraggableOverlay" variant="warning">View and Move Alerts</b-button>
              </b-col>
            </b-row>
          </b-col>

          <!-- Middle column: Text, Font Size, and Color -->
          <b-col cols="4" md="4">
            <!-- Alert Text Editbox -->
            <b-row class="mt-3">
              <b-form-group label="Alert Text" label-for="alertText">
                <b-form-input id="alertText" v-model="alertsConfig.content" placeholder="Enter alert text"></b-form-input>
                <b-button @click="updateAlertText(alertsConfig.content)" variant="success">Submit</b-button>
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
      const newRegion = `alert${this.alertsList.regions.length + 1}`;
      this.alertsList.regions.push(newRegion);
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
