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
        <div class="operations-config">
          <!-- GCD Input -->
          <div class="gcd-input">
            <label :class="{ 'invalid-label': automationConfig.gcdError }" for="gcd">
              Global Cooldown (GCD):
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
            />
          </div>

          <!-- Operations List -->
          <div class="operations-list">
            <h2>Operations</h2>
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
                  <label :for="`alert-${operationIndex}-${alertIndex}`">
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
                <button
                  type="button"
                  @click="addAlert(operationIndex)"
                  class="add-alert-btn"
                  size="sm"
                  variant="success"
                >
                  Add Alert
                </button>
              </div>

              <!-- Condition Input -->
              <div class="condition-input">
                <label
                  :for="`condition-${operationIndex}`"
                  :class="{ 'invalid-label': automationConfig.conditionErrors[operationIndex] }"
                >
                  Condition:
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
                <label :for="`button-${operationIndex}`">Button to Press:</label>
                <input
                  :id="`button-${operationIndex}`"
                  v-model="automationConfig.operationsList[operationIndex][2]"
                  type="text"
                  placeholder="Enter button action"
                />
              </div>
            </div>

            <!-- Add Operation Button -->
            <button
              type="button"
              @click="addOperation"
              class="add-operation-btn"
              variant="success"
            >
              Add Operation
            </button>

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

          <!-- Start Automation Button -->
          <button
            type="button"
            @click="startAutomation"
            class="start-automation-btn"
            variant="warning"
          >
            Start Automation
          </button>
        </div>
        
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
        gcdError: null,
        defaultButtonError: null,
      },
    };
  },
  methods: {
    regionChange(newSelection) {
      // Change alert being displayed and have main.js send back the new alert's config data
      this.automationList.regionSelected = newSelection;
      window.electronAPI.updateVariable('automation', 'selected', { regionSelected: newSelection });
      window.electronAPI.updateVariable('automation', 'selected', { regions: this.automationList.regions });
    },
    addRegion() {
      // Add a new alert to the listbox
      let lastNumber = 0;
      const lastItemName = this.automationList.regions[this.automationList.regions.length - 1];
      const match = lastItemName.match(/(\d+)$/);
      lastNumber = parseInt(match[1], 10);
      const newRegion = `automation${lastNumber + 1}`;
      this.automationList.regions.push(newRegion);
      // Switch to new alert. Main.js will add a new alert in config.ini and send back default config settings
      this.regionChange(newRegion);
    },
    deleteRegion() {
      // Delete current alert from the listbox
      if (this.automationList.regions.length > 1) {
        const index = this.automationList.regions.findIndex(region => region === this.automationList.regionSelected);
        this.automationList.regions.splice(index, 1);
        const serializableRegions = toRaw(this.automationList);
        // Sending automationList with the current alert deleted, which will request main.js to delete the alert data from config.ini
        window.electronAPI.updateVariable('automation', 'selected', serializableRegions);
      }  
    },
    addAlert(operationIndex) {
      this.automationConfig.operationsList[operationIndex][0].push('');
    },
    addOperation() {
      // Validate current conditions before adding a new operation
      const lastIndex = this.automationConfig.operationsList.length - 1;
      const hasError = this.automationConfig.conditionErrors.some((error) => error !== null);

      if (hasError) {
        alert('Please fix all condition errors before adding a new operation.');
        return;
      }

      this.automationConfig.operationsList.splice(lastIndex, 0, [[''], '', '']);
      this.automationConfig.conditionErrors.splice(lastIndex, 0, null); // Add placeholder for error tracking
    },
    validateCondition(operationIndex) {
      const conditionString = this.automationConfig.operationsList[operationIndex][1];
      const validPattern = /^[\d\s()]+(and|or|not|[\d\s()])+$/gi;

      this.automationConfig.conditionErrors[operationIndex] = validPattern.test(conditionString)
        ? null
        : 'User entry is not proper syntax.';
    },
    validateGCD() {
      this.automationConfig.gcdError = this.automationConfig.gcd > 0 ? null : 'GCD must be a positive number.';
    },
    validateDefaultButton() {
      const defaultButton = this.automationConfig.operationsList[this.automationConfig.operationsList.length - 1][2];
      this.automationConfig.defaultButtonError = defaultButton
        ? null
        : 'Default button cannot be empty.';
    },
    startAutomation() {
      // Validate GCD and default button
      this.validateGCD();
      this.validateDefaultButton();

      if (this.automationConfig.gcdError || this.automationConfig.defaultButtonError) {
        alert('Please fix all errors before starting automation.');
        return;
      }

      // Send IPC command to main.js
      /*
      window.electronAPI.startAutomation({
        gcd: this.automationConfig.gcd,
        operationsList: this.automationConfig.operationsList,
      });
      */
      alert('Automation started successfully.');
    },
  },
  mounted() {
    // Trigger main.js to send alertList and alertConfig on component load (whenever 'selected' is sent by updateVariable as second parameter)
    window.electronAPI.updateVariable('automation', 'selected', { live: false });

    // Listen for variable updates to populate the form fields
    window.electronAPI.onupdateConfig(({ selectedValues }) => {
      if (selectedValues) {
        // Populate fields from selectedList
        console.log('Incoming selectedValues:', selectedValues);
        console.log('Current automationConfig:', this.automationConfig);
        this.automationConfig = { ...this.automationConfig, ...selectedValues };
        console.log('Received config');
        console.log('Updated automationConfig:', this.automationConfig);
        console.log('1 operation alerts:', this.automationConfig.operationsList[0][0]); // Should show the first alerts array
        console.log('2 operation alerts:', this.automationConfig.operationsList[1][0]); // Should show the first alerts array
        console.log('3 operation alerts:', this.automationConfig.operationsList[2][0]); // Should show the first alerts array

      }
    });

    // Listen for updates to populate the list box 
    window.electronAPI.onupdateList(({ selectedList }) => {
      if (selectedList) {
        this.automationList = { ...this.automationList, ...selectedList };
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
  border-top: 2px solid gray;
  padding-top: 10px;
}

.add-alert-btn,
.add-operation-btn,
.start-automation-btn {
  margin-top: 10px;
}
</style>
