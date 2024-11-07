import { createApp } from 'vue';
import App from '../components/App.vue';
import BootstrapVue from 'bootstrap-vue-3'; // Import BootstrapVue
import 'bootstrap/dist/css/bootstrap.css'; // Import Bootstrap CSS
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'; // Import BootstrapVue CSS

const app = createApp(App);
app.use(BootstrapVue); // Use BootstrapVue plugin

app.mount('#app');