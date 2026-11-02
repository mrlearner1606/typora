import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// `base: './'` keeps asset URLs relative so the build works from a GitHub Pages
// project path (https://<user>.github.io/<repo>/) without configuration.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
