import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

declare const process: { cwd: () => string }

const projectRoot = process.cwd()

export default defineConfig(({ mode }) => ({
  root: projectRoot,
  plugins: [
    react(),
    ...(mode === 'test' ? [] : [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'NHS SignBridge student prototype',
        short_name: 'SignBridge',
        description: 'A student prototype for accessible BSL healthcare conversations.',
        theme_color: '#005eb8',
        background_color: '#f4f7f9',
        display: 'standalone',
        orientation: 'landscape-primary',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,json}']
      }
    })])
  ],
  test: {
    environment: 'jsdom',
    setupFiles: `${projectRoot}/src/test/setup.ts`,
    css: true
  }
}))
