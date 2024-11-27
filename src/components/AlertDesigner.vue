<template>
  <div class="container mt-4">
    <h1 class="mb-3">Alert Designer</h1>
    <b-row>

      <!-- Left column with listbox of alerts -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div 
          class="list-group listbox-container" 
          style="max-height: 460px; overflow-y: auto;"
        >
          <!-- Render active alert buttons -->
          <button
            v-for="region in alertList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === alertList.regionSelected }, 'text-center', 'bold-btn']"
          >
            {{ region }}
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 11 -->
          <button
            v-for="index in Math.max(0, 11 - alertList.regions.length)"
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
          Add Alert
        </button>

        <!-- Render the "Delete Region" button always visible below the list -->
        <button
          @click="deleteRegion"
          class="list-group-item list-group-item-action text-center delete-region-btn bold-btn mt-2"
          style="margin-top: 25px; background-color: #dc3545; width: 100%;"
        >
          Delete Alert
        </button>
      </b-col>

      <!-- All other content in component -->
      <b-col cols="9" md="9">
        
        <!-- Alert Preview (alert text displayed in the intended color and size, and a fixed height container of 100px) -->
        <b-row class="align-items-center mb-3">
          <div 
            class="d-flex justify-content-center align-items-center" 
            :style="{ whiteSpace: 'nowrap', overflow: 'hidden', height: '100px', color: alertConfig.color, fontSize: alertConfig.textSize + 'px' }"
            >{{ alertConfig.content }}
          </div>
        </b-row>
         
        <!-- Alert Configuration Fields -->
        <b-row class="mt-3">

          <!-- Left column: Position fields and overlay toggle for dragging alerts to new positions -->
          <b-col cols="6" md="6">

            <!--Postion fields -->
            <b-row class="mt-3">
              <div class="d-flex justify-content-center">
                <label for="input-x">  X:</label>
                <b-form-input id="input-x" v-model="alertConfig.x" type="number" class="fixed-width-input" readonly></b-form-input>
                <label for="input-y">  Y:</label>
                <b-form-input id="input-y" v-model="alertConfig.y" type="number" class="fixed-width-input" readonly></b-form-input>
              </div>
            </b-row>
            
            <!-- Toggle Overlay Button -->
            <b-row class="d-flex justify-content-center">
                <b-button @click="showDraggableOverlay" variant="warning" :style="{ width: 'auto', marginTop: '20px' }">View and Move Alerts</b-button>
                <div class="d-flex justify-content-center">
                  <p :style="{ textAlign: 'center', width: '75%' }">Drag alerts to desired location then click the Hide Overlay button on the top left of the screen</p>
                </div>
            </b-row>

          </b-col>

          <!-- Middle column: Text, Font Size, and Color -->
          <b-col cols="6" md="6">

            <!-- Alert Text Editbox -->
            <b-row class="mt-3">
              <b-form-group label="Alert Text" label-for="alertText">
                <div class="d-flex align-items-center">
                  <b-form-input id="alertText" v-model="alertConfig.content" placeholder="Enter alert text"></b-form-input>
                  <b-button @click="updateAlertText(alertConfig.content)" variant="success">Submit</b-button>
                </div>
              </b-form-group>
            </b-row>

            <!-- Font Size Controls -->
            <b-row class="mt-3">
              <b-form-group label="Font Size" label-align="center" label-for="textSize">
                <div class="d-flex justify-content-center">
                  <b-button @click="adjustFontSize(-4)" variant="outline-secondary">-</b-button>
                  <b-form-input id="textSize" v-model="alertConfig.textSize" type="number" class="fixed-width-input" readonly></b-form-input>
                  <b-button @click="adjustFontSize(4)" variant="outline-secondary">+</b-button>
                </div>
              </b-form-group>
            </b-row>

            <!-- Font Color Listbox -->
            <b-row class="d-flex justify-content-center mt-3">
              <b-form-group label="Font Color" label-for="fontColor" style="max-width: 50%">
                <b-form-select
                  id="fontColor"
                  v-model="alertConfig.color"
                  :options="fontColors"
                   @input="updateAlertColor(alertConfig.color)"
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
import { toRaw } from 'vue'; //used for serializing arrays sent to main.js over ipc
export default {
  data() {
    return {
      alertList: {
        profile: '',
        regions: [''],
        regionSelected: '',
        live: false,
      },
      alertConfig: {
        x: 0,
        y: 0,
        content: '',   // Alert text
        textSize: 24,  
        color: '', 
      },
      fontColors: [  // Dropdown values for user to select
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
      // Change alert being displayed and have main.js send back the new alert's config data
      this.alertList.regionSelected = newSelection;
      window.electronAPI.updateVariable('alerts', 'selected', { regionSelected: newSelection });
    },
    addRegion() {
      // Add a new alert to the listbox
      let lastNumber = 0;
      const lastItemName = this.alertList.regions[this.alertList.regions.length - 1];
      const match = lastItemName.match(/(\d+)$/);
      lastNumber = parseInt(match[1], 10);
      const newRegion = `alert${lastNumber + 1}`;
      this.alertList.regions.push(newRegion);
      // Switch to new alert. Main.js will add a new alert in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    deleteRegion() {
      // Delete current alert from the listbox
      if (this.alertList.regions.length > 1) {
        const index = this.alertList.regions.findIndex(region => region === this.alertList.regionSelected);
        this.alertList.regions.splice(index, 1);
        const serializableRegions = toRaw(this.alertList);
        // Sending alertList with the current alert deleted, which will request main.js to delete the alert data from config.ini
        window.electronAPI.updateVariable('alerts', 'selected', serializableRegions);
      }  
    },
    showDraggableOverlay() {
      // Display overlay.html with all alerts clickable and draggable. Dropping an alert sends new coords to main.js to update config.ini
      window.electronAPI.showDraggableOverlay();
      console.log('Showed draggable overlay');
    },
    updateAlertText(text) {
      // After user clicks submit button to change alert text, send new text to main.js to update config.ini
      window.electronAPI.updateVariable('alerts', this.alertList.regionSelected, { content: text });
    },    
    updateAlertColor(color) {
      // After user selects new alert color, send new color to main.js to update config.ini
      window.electronAPI.updateVariable('alerts', this.alertList.regionSelected, { color: color });
    },
    adjustFontSize(delta) {
      // After user clicks increment font size buttons, send new size to main.js to update config.ini
      this.alertConfig.textSize = Math.max(12, Math.min(192, this.alertConfig.textSize + delta));
      window.electronAPI.updateVariable('alerts', this.alertList.regionSelected, { textSize: this.alertConfig.textSize });
    },
  },
  mounted() {
    // Trigger main.js to send alertList and alertConfig on component load (whenever 'selected' is sent by updateVariable as second parameter)
    window.electronAPI.updateVariable('alerts', 'selected', { live: false });

    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ component, selectedValues }) => {
      if (selectedValues && component === 'alerts') {
        // Populate fields from selectedList
        this.alertConfig = { ...this.alertConfig, ...selectedValues };
        console.log('Received config');
      }
    });

    // Listen for updates to populate the list box 
    window.electronAPI.onupdateList(({ component, selectedList }) => {
      if (selectedList && component === 'alerts') {
        this.alertList = { ...this.alertList, ...selectedList };
        console.log('Received list');
      }
    });
  },
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
</style>
