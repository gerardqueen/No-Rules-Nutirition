import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      // These Capacitor plugins only exist inside the native app shell.
      // The website never loads them (the dynamic import fails gracefully),
      // so we tell the web build to leave them unresolved instead of failing.
      external: ['@capacitor/status-bar', '@capacitor/splash-screen'],
    },
  },
})