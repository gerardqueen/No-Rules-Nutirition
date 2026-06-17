import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
 
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      // Capacitor plugins only exist inside the native app shell. The website
      // never loads them (dynamic imports fail gracefully and fall back to the
      // web scanner), so we tell the web build to leave them unresolved instead
      // of failing.
      external: [
        '@capacitor/core',
        '@capacitor/status-bar',
        '@capacitor/splash-screen',
        '@capacitor-mlkit/barcode-scanning',
      ],
    },
  },
})
 