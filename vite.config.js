import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Forward API calls to the CortexIE backend.
      '/api': 'http://127.0.0.1:4000',
    },
  },
})
