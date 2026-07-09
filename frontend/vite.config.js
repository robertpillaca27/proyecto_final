import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,           // Habilita los métodos globales como describe, test y vi
    environment: 'jsdom',    // Emula el entorno del navegador para React Testing Library
  },
})