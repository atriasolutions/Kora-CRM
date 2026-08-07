import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'logo_kora_limpio.png',
        'pwa/icon-192.png',
        'pwa/icon-512.png',
        'pwa/maskable-192.png',
        'pwa/maskable-512.png',
        'push-sw.js',
      ],
      manifest: {
        name: 'Kora CRM',
        short_name: 'Kora',
        description:
          'Kora CRM — plataforma comercial y operativa para equipos en Chile y Latam.',
        lang: 'es',
        dir: 'ltr',
        start_url: '/login',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#ffffff',
        theme_color: '#7c3aed',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: '/pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Handlers push/notificationclick (Android PWA)
        importScripts: ['/push-sw.js'],
        // SPA: fallback to index.html for client routes
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/health/, /^\/ws/],
        // Bundle principal supera 2 MiB; permitido para instalar/abrir offline la shell
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // SPA + assets empaquetados; evita precachear capturas de marketing
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: ['**/marketing/**'],
        additionalManifestEntries: [
          { url: '/pwa/icon-192.png', revision: null },
          { url: '/pwa/icon-512.png', revision: null },
          { url: '/logo_kora_limpio.png', revision: null },
          { url: '/push-sw.js', revision: null },
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/') ||
              url.pathname.startsWith('/health') ||
              url.pathname.startsWith('/ws'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kora-images',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kora-static',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
      devOptions: {
        // Enable only when debugging SW; keep off by default in `vite`
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
      '/ws': { target: 'http://localhost:4000', changeOrigin: true, ws: true },
    },
  },
})
