<template>
  <div class="container mt-4">
    <h1 class="mb-3">Automation</h1>
    <b-row>

      <!-- Left column with listbox of alerts -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div 
          class="list-group listbox-container" 
          style="max-height: 460px; overflow-y: auto;"
        >
          <!-- Render active alert buttons -->
          <button
            v-for="region in automationList.regions"
            :key="region"
            @click="regionChange(region)"
            :class="['list-group-item', { active: region === automationList.regionSelected }, 'text-center', 'bold-btn']"
          >
            {{ region }}
          </button>

          <!-- Render "empty" placeholders for remaining slots up to 11 -->
          <button
            v-for="index in Math.max(0, 11 - automationList.regions.length)"
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
          Add Automation
        </button>

        <!-- Render the "Delete Region" button always visible below the list -->
        <button
          @click="deleteRegion"
          class="list-group-item list-group-item-action text-center delete-region-btn bold-btn mt-2"
          style="margin-top: 25px; background-color: #dc3545; width: 100%;"
        >
          Delete Automation
        </button>
      </b-col>

      <!-- All other content in component -->
      <b-col cols="6" md="6">
        <div class="operations-config">
          <!-- GCD Input -->
          <div class="gcd-input">
            <label :class="{ 'invalid-label': automationConfig.gcdError }" for="gcd"
                   :style="{ fontSize: '18px', fontWeight: 'bold' }"
            >
              Global Cooldown (seconds):
              <span v-if="automationConfig.gcdError" class="error-text">{{ automationConfig.gcdError }}</span>
            </label>
            <input
              id="gcd"
              v-model="automationConfig.gcd"
              type="number"
              step="0.1"
              min="0"
              placeholder="Enter GCD value"
              @input="validateGCD"
              :style="{ marginBottom: '20px' }"
            />
          </div>

          <!-- Operations List -->
          <div class="operations-list">
            <div
              class="operation-item"
              v-for="(operation, operationIndex) in automationConfig.operationsList.slice(0, -1)"
              :key="operationIndex"
            >
              <h3>Operation {{ operationIndex + 1 }}</h3>

              <!-- Alerts Section -->
              <div class="alerts-section">
                <div
                  class="alert-item"
                  v-for="(alert, alertIndex) in operation[0]"
                  :key="alertIndex"
                >
                  <label :for="`alert-${operationIndex}-${alertIndex}`"
                         :style="{ fontSize: '20px', fontWeight: 'bold' }"
                  >
                    {{ alertIndex + 1 }}: 
                  </label>
                  <select
                    :id="`alert-${operationIndex}-${alertIndex}`"
                    v-model="automationConfig.operationsList[operationIndex][0][alertIndex]"
                  >
                    <option
                      v-for="alertOption in automationList.alertRegions"
                      :key="alertOption"
                      :value="alertOption"
                    >
                      {{ alertOption }}
                    </option>
                  </select>
                </div>

                <!-- Add Alert Button -->
                <b-button
                  type="button"
                  @click="addAlert(operationIndex)"
                  class="add-alert-btn"
                  size="sm"
                  variant="success"
                >
                  Add Alert
                </b-button>

                <!-- Remove Alert Button -->
                <b-button
                  type="button"
                  @click="deleteAlert(operationIndex)"
                  class="delete-alert-btn"
                  size="sm"
                  variant="success"
                  :disabled="operation[0].length === 1"
                >
                  Remove Alert
                </b-button>
              </div>

              <!-- Condition Input -->
              <div class="condition-input">
                <label
                  :for="`condition-${operationIndex}`"
                  :class="{ 'invalid-label': automationConfig.conditionErrors[operationIndex] }"
                >
                  Logical Expression: 
                  <span v-if="automationConfig.conditionErrors[operationIndex]" class="error-text">
                    {{ automationConfig.conditionErrors[operationIndex] }}
                  </span>
                </label>
                <input
                  :id="`condition-${operationIndex}`"
                  v-model="automationConfig.operationsList[operationIndex][1]"
                  @input="validateCondition(operationIndex)"
                  type="text"
                  placeholder="Enter condition (e.g., '1 and 2')"
                />
              </div>

              <!-- Button Choice Input -->
              <div class="button-input">
                <label :for="`button-${operationIndex}`">Button to Press: </label>
                <input
                  :id="`button-${operationIndex}`"
                  v-model="automationConfig.operationsList[operationIndex][2]"
                  type="text"
                  placeholder="Enter button action"
                  :style="{ marginBottom: '20px' }"
                />
              </div>
            </div>

            <!-- Add Operation Button -->
            <b-button
              type="button"
              @click="addOperation"
              class="add-operation-btn"
              variant="success"
            >
              Add Operation
            </b-button>

            <!-- Delete Operation Button -->
            <b-button
              type="button"
              @click="deleteOperation()"
              class="delete-operation-btn"
              variant="success"
              :disabled="automationConfig.operationsList.length === 1"
            >
              Remove Operation
            </b-button>

            <!-- Default Operation -->
            <div class="operation-item default-operation">
              <h3>Default Operation</h3>
              <div class="button-input">
                <label
                  :for="'default-button'"
                  :class="{ 'invalid-label': automationConfig.defaultButtonError }"
                >
                  Default Button: 
                  <span v-if="automationConfig.defaultButtonError" class="error-text">
                    {{ automationConfig.defaultButtonError }}
                  </span>
                </label>
                <input
                  id="default-button"
                  v-model="automationConfig.operationsList[automationConfig.operationsList.length - 1][2]"
                  @input="validateDefaultButton"
                  type="text"
                  placeholder="Enter default button action"
                />
              </div>
            </div>
          </div>
        </div>
        
      </b-col>
      <b-col cols="3" md="3">
        <h3>Operation example</h3>
        <span>1: alert3<br></span>
        <span>2: alert5<br></span>
        <span>3: alert6<br></span>
        <span>Logical Expression: (1 or 2) and not 3<br></span>
        <span>Button to Press: f<br></span>

        <!-- Toggle overlay button -->
        <b-button 
          @click="toggleGameModeOverlay" 
          variant="warning" 
          :style="{ width: 'auto', marginTop: '50px' }"
        >
          Toggle Alerts
        </b-button>
        <p>Shortcut: Ctrl-Shift-S</p>

        <!-- Start Automation Button -->
        <b-button
          type="button"
          @click="startAutomation"
          class="start-automation-btn"
          variant="warning"
          :style="{ width: 'auto', marginTop: '20px' }"
        >
          Toggle Automation
        </b-button>
        <p>Currently selected automation will be used. <br>Shortcut: Ctrl-Shift-A</p>
      </b-col>
    </b-row>
  </div>
</template>

<script>
import { toRaw } from 'vue'; //used for serializing arrays sent to main.js over ipc
export default {
  data() {
    return {
      automationList: {
        profile: '',
        regions: [''],
        alertRegions: [''],
        regionSelected: '',
        live: false,
      },
      automationConfig: {
        gcd: '', // Default GCD value
        operationsList: [[[''], '', 'defaultButton']], // Default operation
        conditionErrors: [], // Track condition errors for each operation
        gcdError: '',
        defaultButtonError: '',
      },
    };
  },
  methods: {
    regionChange(newSelection) {
      // Submits all fields and sends to main.js to update config.ini
      const serializableConfig = toRaw(this.automationConfig);
      console.log(`sent config: `, JSON.stringify(serializableConfig));
      window.electronAPI.updateVariable('automation', this.automationList.regionSelected, serializableConfig );

      // Change automation being displayed and have main.js send back the new automation's config data
      this.automationList.regionSelected = newSelection;
      window.electronAPI.updateVariable('automation', 'selected', { regionSelected: newSelection });
    },
    addRegion() {
      // Add a new automation to the listbox
      let lastNumber = 0;
      const lastItemName = this.automationList.regions[this.automationList.regions.length - 1];
      const match = lastItemName.match(/(\d+)$/);
      lastNumber = parseInt(match[1], 10);
      const newRegion = `automation${lastNumber + 1}`;
      this.automationList.regions.push(newRegion);
      // Switch to new automation. Main.js will add a new automation in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    deleteRegion() {
      // Delete current automation from the listbox
      if (this.automationList.regions.length > 1) {
        const serializableRegions = toRaw(this.automationList);
        console.log(`Before: `, JSON.stringify(serializableRegions));
        const index = this.automationList.regions.findIndex(region => region === this.automationList.regionSelected);
        this.automationList.regions.splice(index, 1);
        const serializableRegions2 = toRaw(this.automationList);
        console.log(`After: `, JSON.stringify(serializableRegions2));

        // Sending automationList with the current automation deleted, which will request main.js to delete the alert data from config.ini
        window.electronAPI.updateVariable('automation', 'selected', serializableRegions2);
      }  
    },
    addAlert(operationIndex) {
      this.automationConfig.operationsList[operationIndex][0].push('');
    },
    deleteAlert(operationIndex) {
      const alerts = this.automationConfig.operationsList[operationIndex][0];
      if (alerts.length > 1) {
        alerts.splice(alerts.length - 1, 1);
      } 
    },
    addOperation() {
      // Validate current conditions before adding a new operation
      const lastIndex = this.automationConfig.operationsList.length - 1;
      const hasError = this.automationConfig.conditionErrors.some((error) => error !== '');

      if (hasError) {
        alert('Please fix all condition errors before adding a new operation.');
        return;
      }

      this.automationConfig.operationsList.splice(lastIndex, 0, [[''], '', '']);
      this.automationConfig.conditionErrors.splice(lastIndex, 0, ''); // Add placeholder for error tracking
    },
    deleteOperation() {
      const isLastNonDefault = this.automationConfig.operationsList.length === 1;
      if (isLastNonDefault) {
        return;
      }

      this.automationConfig.operationsList.splice(this.automationConfig.operationsList.length - 2, 1);
      this.automationConfig.conditionErrors.splice(this.automationConfig.operationsList.length - 2, 1); // Remove corresponding error tracking
    },
    validateCondition(operationIndex) {
      const conditionString = this.automationConfig.operationsList[operationIndex][1];
      const validPattern = /^[\d\s()]+(?:and|or|not|[\d\s()])*$/gi;

      this.automationConfig.conditionErrors[operationIndex] = validPattern.test(conditionString)
        ? ''
        : 'User entry is not proper syntax.';
    },
    validateGCD() {
      this.automationConfig.gcdError = this.automationConfig.gcd >= 0.5 ? '' : 'GCD must be a positive number greater than or equal to 0.5';
    },
    validateDefaultButton() {
      const defaultButton = this.automationConfig.operationsList[this.automationConfig.operationsList.length - 1][2];
      this.automationConfig.defaultButtonError = defaultButton
        ? ''
        : 'Default button cannot be empty.';
    },
    toggleGameModeOverlay() {
      // Display overlay.html in game-mode (ignoreMouseEvents=true, running condition evaluator in main.js setinterval)
      const serializableConfig = toRaw(this.automationConfig);
      window.electronAPI.updateVariable('automation', this.automationList.regionSelected, serializableConfig );
      
      // Requests main.js to show/hide the overlay
      window.electronAPI.toggleGameModeOverlay();
      console.log('Toggled game-mode overlay');
    },
    startAutomation() {
      // Validate GCD and default button
      if (!this.automationList.live) {
        this.validateGCD();
        this.validateDefaultButton();

        if (this.automationConfig.gcdError || this.automationConfig.defaultButtonError) {
          return;
        }
        // Submits all fields and sends to main.js to update config.ini
        const serializableConfig = toRaw(this.automationConfig);
        window.electronAPI.updateVariable('automation', this.automationList.regionSelected, serializableConfig );

      }
      // Toggles the use of automation in parallel with toggling the overlay
      this.automationList.live = !this.automationList.live;
      window.electronAPI.updateVariable('automation', 'selected', { live: this.automationList.live });
    }
  },
  mounted() {
    // Trigger main.js to send alertList and alertConfig on component load (whenever 'selected' is sent by updateVariable as second parameter)
    window.electronAPI.updateVariable('automation', 'selected', { live: false });

    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ component, selectedValues }) => {
      if (selectedValues && component === 'automation') {
        // Populate fields from selectedList
        this.automationConfig = { ...this.automationConfig, ...selectedValues };
        console.log('Received config');
      }
    });

    // Listen for updates to populate the list box 
    window.electronAPI.onupdateList(({ component, selectedList }) => {
      if (selectedList && component === 'automation') {
        this.automationList = { ...this.automationList, ...selectedList };
        console.log('Received list');
      }
    });
  },
  unmounted() {
    // Submits all fields and sends to main.js to update config.ini
    const serializableConfig = toRaw(this.automationConfig);
    console.log(`sent config: `, JSON.stringify(serializableConfig));
    window.electronAPI.updateVariable('automation', this.automationList.regionSelected, serializableConfig );
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

.invalid-label {
  color: red;
}

.error-text {
  color: red;
  font-size: 0.9em;
  margin-left: 5px;
}

.operations-config {
  margin: 20px;
}

.default-operation {
  padding-top: 10px;
}

.add-alert-btn,
.delete-alert-btn,
.add-operation-btn,
.delete-operation-btn,
.start-automation-btn {
  margin-top: 10px;
}
</style>
