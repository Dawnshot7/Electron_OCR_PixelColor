<template>
  <div class="app-container">
    <!-- Sidebar for tab switching -->
    <b-nav vertical class="sidebar">
      <b-nav-item @click="currentTab = 'OCRConfigurator'" :active="currentTab === 'OCRConfigurator'">
        OCR Configurator
      </b-nav-item>
      <b-nav-item @click="currentTab = 'PixelSelector'" :active="currentTab === 'PixelSelector'">
        Pixel Selector
      </b-nav-item>
    </b-nav>

    <!-- Main Content Area -->
    <div class="content-area">
      <component :is="currentTabComponent" />
    </div>
  </div>
</template>

<script>
import OCRConfigurator from './OCRConfigurator.vue';
import PixelSelector from './PixelSelector.vue';

export default {
  name: 'App',
  components: {
    OCRConfigurator,
    PixelSelector,
  },
  data() {
    return {
      currentTab: 'OCRConfigurator',
    };
  },
  computed: {
    currentTabComponent() {
      return this.currentTab === 'OCRConfigurator' ? OCRConfigurator : PixelSelector;
    },
  },
};
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px; /* Fixed width for sidebar (adjust if needed) */
  background-color: #f8f9fa;
  padding: 1rem;
  box-sizing: border-box;
  /* Prevent sidebar from shrinking */
  flex-shrink: 0;
}

.content-area {
  flex-grow: 1;
  padding: 1rem;
  overflow: auto;
}

b-nav-item {
  white-space: nowrap; /* Prevent text wrapping on buttons */
}
</style>
