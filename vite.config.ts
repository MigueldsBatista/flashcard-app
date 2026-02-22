import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      manifestFilename: 'manifest.webmanifest',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: "Ultra Focus",
        short_name: "Ultra Focus",
        description: "Estude smarter com flashcards e IA",
        theme_color: "#3B82F6",
        background_color: "#0F172A",
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        shortcuts: [
          {
            name: "Estudar agora",
            short_name: "Estudar",
            description: "Inicie uma sessão de estudo",
            url: "/study",
            icons: [{ src: "/icons/shortcut-study.png", sizes: "96x96" }]
          },
          {
            name: "Meus Baralhos",
            short_name: "Baralhos",
            description: "Gerencie seus baralhos",
            url: "/decks",
            icons: [{ src: "/icons/shortcut-decks.png", sizes: "96x96" }]
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
