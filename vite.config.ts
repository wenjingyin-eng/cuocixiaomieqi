import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        // Manifest icons are added to the precache by vite-plugin-pwa itself.
        globIgnores: [
          '**/app-icon-192.png',
          '**/app-icon-512.png',
          '**/app-icon-maskable-512.png',
        ],
        runtimeCaching: [
          {
            urlPattern: /\.(?:woff2?|ttf|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'noto-sans-sc-fonts-v1',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      manifest: {
        id: '/',
        name: '错字消灭器',
        short_name: '错字消灭器',
        description: '记录、复习并消灭写错的中文词语。',
        theme_color: '#fffcf2',
        background_color: '#fffcf2',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'zh-CN',
        orientation: 'portrait',
        icons: [
          {
            src: '/app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/app-icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
