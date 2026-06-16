import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/process-api': 'http://localhost:8090',
      '/platform-api': 'http://localhost:8090',
      '/core-api': 'http://localhost:8090',
      '/idm-api': 'http://localhost:8090',
      '/my-custom-api': 'http://localhost:8090',
    },
  },
})
