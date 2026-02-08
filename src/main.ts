import './styles/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

import { useAuthStore } from './stores/auth'
import { GesturePlugin } from '@vueuse/gesture'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(GesturePlugin)

const authStore = useAuthStore()
authStore.initializeAuth().then(() => {
    app.mount('#app')
})
