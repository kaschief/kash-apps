import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pinned ports so income-tracker and consistency-tracker never collide.
// strictPort: true fails loudly if the port is taken instead of silently
// hopping onto the other app's port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
})
