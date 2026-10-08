import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ViviendasLeón Guatemala',
        short_name: 'ViviendasLeón',
        description:
          'Plataforma para la gestión y monitoreo de programas sociales de ViviendasLeón Guatemala',
        lang: 'es-GT',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff,woff2}',
        ],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
