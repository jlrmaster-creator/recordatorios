import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/recordatorios/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.3.0')
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      injectManifest: {
        globPatterns: ['**/*.{js,css,svg,png,webmanifest}'],
        globIgnores: ['**/node_modules/**/*', 'index.html'],
      },
      manifest: {
        name: 'Recordatorios',
        short_name: 'Recordatorios',
        description: 'Gestor de recordatorios personales y grupales en tiempo real',
        theme_color: '#0F0F1A',
        background_color: '#0F0F1A',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
