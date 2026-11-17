import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import { relay, lanAddresses } from './relay.js'

// `npm run dev`      → this Mac only (both windows side by side, http://localhost)
// `npm run dev:lan`  → also reachable from another MacBook on the same Wi-Fi.
//                      Served over https (self-signed): browsers only allow the
//                      camera on https or localhost.
export default defineConfig(({ mode }) => ({
  plugins: [react(), relay(), mode === 'lan' && basicSsl()],
  server: mode === 'lan' ? { host: true } : {},
  define: {
    __LAN_ADDRESSES__: JSON.stringify(lanAddresses()),
    __LAN_MODE__: JSON.stringify(mode === 'lan'),
  },
}))
