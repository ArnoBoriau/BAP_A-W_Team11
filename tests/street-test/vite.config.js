import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { homeStore } from './home-store.js'

// `npm run dev`      → the street, plus the endpoint that saves homes (home-store.js)
// `npm run dev:lan`  → the same, reachable from other machines on the Wi-Fi (the game's laptop)
// `npm run build`    → a static site with every saved home baked in: host it anywhere
export default defineConfig({
  plugins: [react(), homeStore()],
  // relative paths, so the built site also works from a sub-folder (e.g. GitHub Pages)
  base: './',
})
