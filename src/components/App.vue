<template>
  <div class="app-container">
 
    <!-- Sidebar for switching between tabs. Uses Bootstrap Vue's vertical navigation for layout -->
    <b-nav vertical class="sidebar">

      <!-- Profile name / rename sits above main sidebar items -->
      <p class="profile-label" :style="{ textAlign: 'center', width: '100%', marginTop: '10px', marginBottom: '3px' }">Profile:</p>
      <div class="profile-section d-flex justify-content-center" style="margin-bottom: 40px; width: 100%;">
        <!-- Show Profile Name -->
        <div v-if="!isRenaming">
          <b-button 
            @click="toggleRename" 
            size="sm" 
            variant="light"
            style="font-size: 16px"
          >
          {{ currentProfile }}
          </b-button>
        </div>
        <!-- Show Rename Input -->
        <div v-else>
          <b-form-input 
            v-model="newProfileName" 
            placeholder="Enter new profile name" 
            size="sm"
            style="max-width: 200px;"
          />
          <b-button 
            @click="renameProfile" 
            variant="outline-success" 
            size="sm" 
            style="margin-left: 10px;"
          >
            Rename
          </b-button>
          <b-button 
            @click="cancelRename" 
            variant="outline-success" 
            size="sm" 
            style="margin-left: 5px;"
          >
            Cancel
          </b-button>
        </div>
      </div>
    
      <!-- Sidebar items -->
      <b-nav-item 
        @click="currentTab = 'OCRConfigurator'" 
        :active="currentTab === 'OCRConfigurator'"
      >
        OCR Configurator
      </b-nav-item>
      <b-nav-item 
        @click="currentTab = 'PixelSelector'" 
        :active="currentTab === 'PixelSelector'"
      >
        Pixel Selector
      </b-nav-item>
      <b-nav-item 
        @click="currentTab = 'AlertDesigner'" 
        :active="currentTab === 'AlertDesigner'"
      >
        Alert Designer
      </b-nav-item>
      <b-nav-item 
        @click="currentTab = 'Conditions'" 
        :active="currentTab === 'Conditions'"
      >
        Conditions
      </b-nav-item>
      <b-nav-item 
        @click="currentTab = 'Automation'" 
        :active="currentTab === 'Automation'"
      >
        Automation
      </b-nav-item>

    </b-nav>

    <!-- Main content area for displaying the selected component. Dynamically renders the component associated with the current tab -->
    <div class="content-area">
      <component :is="currentTabComponent" />
    </div>
  </div>
</template>

<script>
// Import the four child components for different functionalities
import OCRConfigurator from './OCRConfigurator.vue'; // Handles OCR region configuration for monitoring by conditions
import PixelSelector from './PixelSelector.vue'; // Manages pixel selection for color monitoring by conditions
import AlertDesigner from './AlertDesigner.vue'; // Designs on-screen alerts to be triggered by conditions 
import Conditions from './Conditions.vue'; // Configures logical conditions for display of alerts
import Automation from './Automation.vue'; // Sets up automation operations which will simulate user keystrokes

export default {
  name: 'App', // Main application container
  components: {
    // Register the child components
    OCRConfigurator,
    PixelSelector,
    AlertDesigner,
    Conditions,
    Automation,
  },
  data() {
    return {
      // Tracks the currently selected tab (default is OCR Configurator)
      currentTab: 'OCRConfigurator',
      currentProfile: 'Profile1',
      newProfileName: '',
      isRenaming: false
    };
  },
  computed: {
    // Dynamically resolves the component to render based on the selected tab
    currentTabComponent() {
      switch (this.currentTab) {
        case 'OCRConfigurator':
          return OCRConfigurator; 
        case 'PixelSelector':
          return PixelSelector; 
        case 'AlertDesigner':
          return AlertDesigner; 
        case 'Conditions':
          return Conditions; 
        case 'Automation':
          return Automation; 
        default:
          return null; // Fallback if no valid tab is selected
      }
    },
  },
  methods: {
    toggleRename() {
      this.isRenaming = true;
      this.newProfileName = this.currentProfile; // Prefill with the current profile name
    },
    renameProfile() {
      if (this.newProfileName.trim() !== '') {
        this.currentProfile = this.newProfileName.trim();
        const newProfile = `${this.currentProfile}.ini`;
        window.electronAPI.renameProfile(newProfile);
      }
      this.isRenaming = false; // Exit rename mode
    },
    cancelRename() {
      this.isRenaming = false; // Exit rename mode without saving changes
    },
  },
  mounted() {
    // Listen for updates to populate the list box 
    window.electronAPI.onupdateList(({ selectedList }) => {
      if (selectedList) {
        this.currentProfile = selectedList.profile;
        console.log('Received list');
      }
    });
  }
};
</script>

<style>
.app-container {
  display: flex;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #e1e1e1; /* Light grey background for the overall app */
}

.left-pane {
  display: flex; /* Enables Flexbox layout */
  flex-direction: column; /* Stack the buttons vertically */
  justify-content: center; /* Centers buttons vertically */
  align-items: center; /* Centers buttons horizontally */
  width: 250px; /* Adjust the width of the sidebar */
  padding: 10px; /* Optional padding for spacing */
  background-color: #f4f4f4; /* Background color for the sidebar */
  border-right: 1px solid #ddd; /* Light border on the right side */
  height: 100vh; /* Ensures the sidebar takes up the full height */
  object-fit: contain;
}

.content-area {
  flex-grow: 1;
  padding: 1rem;
  background-color: #f0f0f0; /* Lighter grey background */
  border-top: 2px solid #ccc; /* Border between the content and menu */
  border-left: 2px solid #ccc; /* Border between the content and sidebar */
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1); /* Slight inset shadow for the right area */
  overflow: auto;
}

a.nav-link {
  white-space: nowrap;
  margin-top: 10px;
  width: calc(200px - 8px); /* Adjust the width to account for the 4px padding on each side */
  border: 1px solid #ddd; /* Light grey border */
  padding: 10px;
  background-color: #f4f4f4; /* Light grey background for normal state */
  color: #000; /* Black text */
  border-color: #757575; /* Darker border for the active button */
  border-radius: 2px; /* Rounded corners */
  font-weight: bold;
  text-align: center; /* Center text inside buttons */
  transition: all 0.3s ease; /* Smooth transition for hover and active states */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Raised effect with shadow */
  padding-left: 20px; /* Outer padding (4px) on the left side */
  padding-right: 20px; /* Outer padding (4px) on the right side */
}

a.nav-link:hover {
  background-color: #ddd; /* Light grey on hover */
  color: #000; /* Black text */
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Stronger shadow on hover */
  border-color: #444; /* Darker border for the active button */
}

a.active.nav-link {
  background-color: #929292; /* Darker grey for active button */
  color: white; /* White text for the active state */
  box-shadow: none; /* Remove shadow to give it a flat appearance */
  border-color: #444; /* Darker border for the active button */
}

button {
  padding: 10px 20px;
  background-color: #007bff; /* Standard blue for buttons */
  color: white;
  border: none;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Button shadow for depth */
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

button:hover {
  background-color: #0056b3; /* Darker blue on hover */
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Stronger shadow on hover */
}

button:focus {
  outline: none; /* Remove default outline */
}

/* Question mark style */
.question-mark {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #ddd; /* Light gray background */
  color: #333; /* Dark text color */
  text-align: center;
  text-justify: center;
  margin-left: 5px;
  line-height: 20px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

.question-mark:hover {
  background-color: #bbb; /* Slightly darker background on hover */
}
</style>
