import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' = new service worker downloads and WAITS; the app shows an
      // "Update available" toast (UpdateToast.tsx) and applies it on click.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Hostel Finder',
        short_name: 'Hostels',
        description: 'Find and manage hostels near you',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        // index.html is precached with a content revision: every deploy that
        // changes it produces a new sw.js, so the browser detects the update
        // on the next visit and UpdateToast offers a one-tap Refresh.
        // No manual "clear site data" ever needed (which is what used to wipe
        // the IndexedDB hostel data).
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[acdlmt]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 30 },
            },
          },
        ],
      },
    }),
  ],
})
