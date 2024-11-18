<template>
  <div class="app-container">
    <!-- Sidebar for switching between tabs. Uses Bootstrap Vue's vertical navigation for layout -->
    <b-nav vertical class="sidebar">

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

export default {
  name: 'App', // Main application container
  components: {
    // Register the child components
    OCRConfigurator,
    PixelSelector,
    AlertDesigner,
    Conditions,
  },
  data() {
    return {
      // Tracks the currently selected tab (default is OCR Configurator)
      currentTab: 'OCRConfigurator',
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
        default:
          return null; // Fallback if no valid tab is selected
      }
    },
  },
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
  justify-content: top; /* Centers buttons vertically */
  align-items: center; /* Centers buttons horizontally */
  width: 250px; /* Adjust the width of the sidebar */
  padding: 10px; /* Optional padding for spacing */
  background-color: #f4f4f4; /* Background color for the sidebar */
  border-right: 1px solid #ddd; /* Light border on the right side */
  height: 100vh; /* Ensures the sidebar takes up the full height */
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
</style>
