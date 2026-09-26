import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const DEFAULT_PROXY_TARGET = 'http://localhost:8787'
const DEFAULT_DEV_PORT = 5173

function readConfig() {
  const configPath = path.resolve(__dirname, 'config.json')
  if (!existsSync(configPath)) {
    return {}
  }

  try {
    const raw = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch (error: any) {
    console.warn(`[config] Impossible de lire config.json: ${error?.message}`)
    return {}
  }
}

function readProxyTarget(config: any) {
  const target = config?.client?.proxyTarget
  if (typeof target === 'string' && target.trim() !== '') {
    return target.trim()
  }
  return DEFAULT_PROXY_TARGET
}

function readDevPort(config: any) {
  const raw = config?.client?.devPort
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_DEV_PORT
  }

  const numericValue = Number(raw)
  if (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue > 65535) {
    console.warn(`[config] devPort invalide dans config.json (${raw}), utilisation de ${DEFAULT_DEV_PORT}.`)
    return DEFAULT_DEV_PORT
  }

  return Math.round(numericValue)
}

const projectConfig = readConfig()
const proxyTarget = readProxyTarget(projectConfig)
const devPort = readDevPort(projectConfig)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'OmegaRoleGameEditor',
        short_name: 'OmegaRoleGameEditor',
        description: 'Éditeur de jeu de rôle et table virtuelle',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: devPort,
    strictPort: false,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
  },
})
