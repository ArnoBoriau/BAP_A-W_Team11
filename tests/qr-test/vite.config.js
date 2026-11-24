import { defineConfig } from 'vite'
import { voteServer } from './vote-server.js'

export default defineConfig({
  // host: true → reachable from phones on the same Wi-Fi, not only localhost
  server: { host: true },
  preview: { host: true },
  plugins: [voteServer()],
  build: {
    rollupOptions: {
      input: { screen: 'index.html', phone: 'phone.html' },
    },
  },
})
