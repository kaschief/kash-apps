import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Pinned ports so consistency-tracker and income-tracker never collide.
// strictPort: true fails loudly if the port is taken instead of silently
// hopping onto the other app's port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
