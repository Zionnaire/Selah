import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // sqlite-wasm loads its own .wasm next to its module; prebundling breaks that lookup.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  server: { port: 5173 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['brand/*.svg', 'brand/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm}'],
        // Bible files are fetched on demand and stored in SQLite, not in the HTTP cache.
        globIgnores: ['bibles/**'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/bibles/'),
            handler: 'CacheFirst',
            options: { cacheName: 'selah-bibles', expiration: { maxEntries: 8 } },
          },
        ],
      },
      manifest: {
        name: 'SELAH',
        short_name: 'SELAH',
        description: 'Scripture study and sermon preparation that works without internet.',
        theme_color: '#0B1F44',
        background_color: '#0B1F44',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
