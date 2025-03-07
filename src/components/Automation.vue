<template>
  <div class="container mt-4">
    <!-- Component Heading -->
    <div class="d-flex align-items-center">
      <h1 class="mb-3">Automation: </h1>

      <!-- Currently selected item name -->
      <b-form-input 
        v-model="renameRegionValue" 
        class="ml-2" 
        style="max-width: 150px; max-height: 40px; margin-bottom: 10px; margin-left: 10px" 
        :placeholder="automationList.regionSelected"
        maxlength="20">
      </b-form-input>

      <!-- Rename Button -->
      <b-button 
        class="ml-2" 
        @click="renameRegion(renameRegionValue)"
        style="max-height: 40px; margin-bottom: 10px;" 
        size="sm"
        variant="light">
        Rename
      </b-button>
    </div>
    <b-row>

      <!-- Left column with listbox of automations -->
      <b-col cols="3" md="3" style="min-width: 200px;">
        <div 
          class="list-group listbox-container" 
          style="max-height: 460px; overflow-y: auto;"
        >
          <!-- Render active automation buttons -->
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

              <!-- Tooltip -->
              <i 
                id="tooltipIcon" 
                class="ml-2 question-mark"  
                v-b-tooltip.hover 
                title="Interval between buttons that will be 
pressed to simulate user input in the
game. All conditions are evaluated
each interval, and based on alerts
displayed, tasks below will be 
evaluated, in order, to decide button 
choice. 0.5s is the minimum possible 
interval.">?
              </i>

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
              <h3>Task {{ operationIndex + 1 }}</h3>

              <!-- Buttons Section -->
              <div>

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

                <!-- Add Task Button -->
                <b-button
                  type="button"
                  @click="addOperation(operationIndex)"
                  class="add-operation-btn"
                  size="sm"
                  variant="success"
                >
                  Add Task
                </b-button>

                <!-- Remove Task Button -->
                <b-button
                  type="button"
                  @click="deleteOperation(operationIndex)"
                  class="delete-operation-btn"
                  size="sm"
                  variant="success"
                  :disabled="automationConfig.operationsList.length === 1"
                >
                  Remove Task
                </b-button>
              </div>

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
                    @change="alertSelected()"
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
                <label 
                  :for="`button-${operationIndex}`"
                  :class="{ 'invalid-label': automationConfig.buttonErrors[operationIndex] }"
                >
                  Button to Press: 
                </label>
                <span v-if="automationConfig.buttonErrors[operationIndex]" class="error-text">
                  {{ automationConfig.buttonErrors[operationIndex] }}
                </span>
                <input
                  :id="`button-${operationIndex}`"
                  v-model="automationConfig.operationsList[operationIndex][2]"
                  @input="validateButton(operationIndex)"
                  type="text"
                  placeholder="Enter button action"
                  :style="{ marginBottom: '20px' }"
                />
              </div>
            </div>

            <!-- Add Operation Button -->
            <b-button
              type="button"
              @click="addOperation(automationConfig.operationsList.length)"
              class="add-operation-btn"
              variant="success"
            >
              Add Operation
            </b-button>

            <!-- Delete Operation Button -->
            <b-button
              type="button"
              @click="deleteOperation(automationConfig.operationsList.length-1)"
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

        <div style="display: flex; align-items: center;">
          <h3>Task example</h3>
        
          <!-- Tooltip -->
          <i 
            id="tooltipIcon" 
            class="ml-2 question-mark"  
            v-b-tooltip.hover 
            title="Each alert chosen represents the output  
of a condition evaluating true. Any
amount of alerts can be used together
to decide if a button should be 
pressed. Use the logical expression
to state how the alerts should 
contribute to each decision. Alerts
are enumerated in this expression. The 
tasks will be evaluated from
top to bottom, and the first to
evaluate true will be the button
chosen. If none evaluate true then
the default button will be pressed. 
Multiple characters can be entered as 
button to press, and they will be sent 
to the game window in immediate 
succession. If you enter the strings: 
enter, space, tab, backspace, delete, 
up, down, left, right, home, end, pgup, 
pgdn, esc, f1, or f2, the respective 
button will be sent to the game window 
in place of the string of characters.">?
          </i>
        </div>

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
        <p>Shortcut: Ctrl-Shift-A<br>
          Currently selected automation will be used if no error messages.<br>
          Hold Ctrl or Shift to pause 
        </p>
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
        gcd: '', 
        operationsList: [[[''], '', 'defaultButton']], // Default operation structure
        conditionErrors: [], // Track condition errors for each operation
        buttonErrors: [], // Track button errors for each operation
        gcdError: '',
        defaultButtonError: '',
      },
      renameRegionValue: ''
    };
  },
  methods: {
    saveConfig() {
      // Submits all automationConfig data from selected automation to main.js before start of automation 
      const serializableConfig = toRaw(this.automationConfig);
      window.electronAPI.updateVariable('update', 'automation', this.automationList.regionSelected, serializableConfig );
    },
    regionChange(newSelection) {
      // Submits all automationConfig data from previously selected automation to main.js to update config.ini
      this.saveConfig();

      // Change automation being displayed and signal main.js to send back the new automation's config data
      this.automationList.regionSelected = newSelection;
      window.electronAPI.updateVariable('update', 'automation', 'selected', { regionSelected: newSelection });
      this.renameRegionValue = '';
    },
    addRegion() {
      // Find the highest number at the end of existing alert names, create new unique alert name, add to regions list
      let highestNumber = 0;
      this.automationList.regions.forEach(region => {
        const match = region.match(/automation(\d+)$/); // Match names ending in 'alert<number>'
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > highestNumber) {
            highestNumber = number;
          }
        }
      });
      const newRegion = `automation${highestNumber + 1}`;
      this.automationList.regions.push(newRegion);
      // Switch to new automation. Main.js will add a new automation in config.ini and send back default config settings
      this.automationList.regionSelected = newRegion;
      window.electronAPI.updateVariable('add', 'automation', 'selected', { regionSelected: newRegion });      
    },
    deleteRegion() {
      // Delete currently selected automation from the listbox
      if (this.automationList.regions.length > 1) {
        const index = this.automationList.regions.findIndex(region => region === this.automationList.regionSelected);
        this.automationList.regions.splice(index, 1);

        // Variable must be serialized before sending over IPC
        const serializableRegions = toRaw(this.automationList);

        // Sending automationList with the current automation deleted, which will request main.js to delete the alert data from config.ini
        window.electronAPI.updateVariable('delete', 'automation', 'selected', serializableRegions);
        console.log(`Sent automationList: `, JSON.stringify(serializableRegions));
      }  
    },
    renameRegion(newName) {
      const serializableConfig = toRaw(this.automationConfig);
      window.electronAPI.updateVariable('rename', 'automation', newName, serializableConfig );
      this.renameRegionValue = '';
    },
    addAlert(operationIndex) {
      // Add alert to respective operation. Operation's v-for loop will display a new listbox for alert selection.
      const defaultAlert = this.automationList.alertRegions[0] || ''; 
      this.automationConfig.operationsList[operationIndex][0].push(defaultAlert);
      this.saveConfig();
    },
    deleteAlert(operationIndex) {
      // Delete last alert in list from respective operation. Index 0 in operationsList[operationIndex] represents the list of alerts.
      const alerts = this.automationConfig.operationsList[operationIndex][0];
      
      // At least 1 alert per operation required
      if (alerts.length > 1) {
        alerts.splice(alerts.length - 1, 1);
      } 
      this.saveConfig();
    },
    alertSelected() {
      // Save after every change to automation config
      this.saveConfig();
    },
    addOperation(operationIndex) {
      // Add operation to end of list of operations (before default) and error tracking list. A v-for loop will display the new operation's config fields.
      const defaultAlert = this.automationList.alertRegions[0] || ''; 
      this.automationConfig.operationsList.splice(operationIndex, 0, [[defaultAlert], '', '']);
      this.automationConfig.conditionErrors.splice(operationIndex, 0, '');
      this.automationConfig.buttonErrors.splice(operationIndex, 0, '');
      
      // Set error labels for empty fields
      this.validateCondition(operationIndex);
      this.validateButton(operationIndex);
      this.saveConfig();
    },
    deleteOperation(operationIndex) {
      // Must be a minimum of one operation besides the default
      const isLastNonDefault = this.automationConfig.operationsList.length === 1;
      if (isLastNonDefault) {
        return;
      }

      // Remove automation from list of automations and error tracking list
      this.automationConfig.operationsList.splice(operationIndex, 1);
      this.automationConfig.conditionErrors.splice(operationIndex, 1); 
      this.automationConfig.buttonErrors.splice(operationIndex, 1); 
      this.saveConfig();
    },
    validateCondition(operationIndex) {
      // Condition is validated after every character typed, and errors stored. Index 1 in operationsList[operationIndex] represents the logical expression condition.
      const conditionString = this.automationConfig.operationsList[operationIndex][1];
      
      // Test pattern representing acceptable logical expression terms
      const validPattern = /^[\d\s()]+(?:and|or|not|[\d\s()])*$/gi;

      // Error text is displayed in red above the field and stored
      this.automationConfig.conditionErrors[operationIndex] = validPattern.test(conditionString)
        ? ''
        : 'User entry is not proper syntax.';
      this.saveConfig();
    },
    validateButton(operationIndex) {
      // Condition is validated after every character typed, and errors stored. Index 1 in operationsList[operationIndex] represents the logical expression condition.
      const buttonString = this.automationConfig.operationsList[operationIndex][2];

      // Error text is displayed in red above the field and stored
      this.automationConfig.buttonErrors[operationIndex] = buttonString
        ? ''
        : 'Button cannot be empty.';
      this.saveConfig();
    },
    validateGCD() {
      // Error text is displayed in red above the field and stored
      this.automationConfig.gcdError = this.automationConfig.gcd >= 0.5 ? '' : 'GCD must be a positive number greater than or equal to 0.5';
      this.saveConfig();
    },
    validateDefaultButton() {
      // Default operation must contain a button to be pressed each cycle in case other operations evaluate false. Index 2 in operationsList[operationIndex] represents button to be pressed.
      const defaultButton = this.automationConfig.operationsList[this.automationConfig.operationsList.length - 1][2];
      
      // Error text is displayed in red above the field and stored
      this.automationConfig.buttonErrors[this.automationConfig.operationsList.length - 1] = defaultButton
        ? ''
        : 'Default button cannot be empty.';
      this.automationConfig.defaultButtonError = defaultButton
        ? ''
        : 'Default button cannot be empty.';
      this.saveConfig();
    },
    toggleGameModeOverlay() {
      // Submits all automationConfig data from selected automation to main.js  
      this.saveConfig();
      
      // Requests main.js to show/hide the alerts overlay (overlay.html) in game-mode (ignoreMouseEvents=true, running condition evaluator in main.js setinterval)
      window.electronAPI.toggleGameModeOverlay();
      console.log('Toggled game-mode overlay');
    },
    startAutomation() {
      // Verifies that there are no errors in automation config before starting automation. Keyboard shortcut defined in main.js also requires no errors in operationsList
      if (!this.automationList.live) {
        // Exit if any of the three error variables contain errors
        if (this.automationConfig.gcdError || this.automationConfig.buttonErrors.some(err => err.trim() !== '') || this.automationConfig.conditionErrors.some(err => err.trim() !== '')) {
          return;
        }

        // Submits all automationConfig data from selected automation to main.js before start of automation 
        this.saveConfig();
      }
      // Toggles the activation of automation in the main.js setInterval. Main.js will display the alert overlay when automation starts if it isn't already visible.
      this.automationList.live = !this.automationList.live;
      window.electronAPI.updateVariable('update', 'automation', 'selected', { live: this.automationList.live });
    }
  },
  mounted() {
    // Signals main.js to send automationList and automationConfig on component load (whenever 'selected' is sent by updateVariable as second parameter)
    window.electronAPI.updateVariable('update', 'automation', 'selected', { live: false });

    // Listen for variable updates to populate the automationConfig data and the component's form fields
    window.electronAPI.onupdateConfig(({ component, selectedValues }) => {
      if (selectedValues && component === 'automation') {
        // Populate fields from selectedValues
        this.automationConfig = { ...this.automationConfig, ...selectedValues };
        console.log('Received config');
      }
    });

    // Listen for updates to populate the automationList data and the component list box 
    window.electronAPI.onupdateList(({ component, selectedList }) => {
      if (selectedList && component === 'automation') {
        // Populate fields from selectedList
        this.automationList = { ...this.automationList, ...selectedList };
        console.log('Received list');
      }
    });
  },
  unmounted() {
    // Submits all automationConfig data from selected automation to main.js to update config.ini
    const serializableConfig = toRaw(this.automationConfig);
    window.electronAPI.updateVariable('update', 'automation', this.automationList.regionSelected, serializableConfig );
    console.log(`sent config: `, JSON.stringify(serializableConfig));
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
