import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // `--mode native` produces the bundle embedded in the native Android/iOS app
  // via `cap sync`. Capacitor serves that bundle from https://localhost, where
  // a Workbox service worker DOES register and persists across app updates —
  // so a stale precache would keep serving the previous build's index.html and
  // asset hashes after every sync, breaking the app. Native builds therefore
  // ship no service worker at all; UpdateToast is also not mounted there (see
  // App.tsx). Web builds keep the full offline PWA behaviour.
  const isNativeBuild = mode === 'native';

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        disable: isNativeBuild,
        // 'prompt' = new service worker downloads and WAITS; the app shows an
        // "Update available" toast (UpdateToast.tsx) and applies it on click.
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          name: 'Hostel Finder',
          short_name: 'Hostels',
          description: 'Find and manage hostels near you',
          // Toolbar colour of the installed PWA: the app's own background
          // (ink-950), matching <meta name="theme-color"> in index.html and
          // android's `app_background`, so the OS chrome blends into the app.
          theme_color: '#09090e',
          // Splash colour while the PWA loads — deliberately the brand plate
          // (#0f172a) the launcher icon and the Android splash sit on, not the
          // page background.
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
  }
})
