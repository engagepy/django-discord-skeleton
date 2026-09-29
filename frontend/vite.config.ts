import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Django runs on :8000 while developing; everything that isn't the React app goes to it.
const DJANGO = 'http://127.0.0.1:8000'

// The built app is served by Django: index.html becomes a template, assets are static files
// under /static/. The landing and sign-in pages are Django templates and use public.css from the same build,
// under a fixed name so a template can point at it (collectstatic still hashes it for caching).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/static/' : '/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: { app: 'index.html', public: 'src/styles/public.css' },
      output: {
        assetFileNames: (asset) =>
          asset.names.includes('public.css') ? 'assets/public.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    proxy: Object.fromEntries(['/api', '/accounts', '/admin', '/media', '/static'].map((p) => [p, DJANGO])),
  },
}))
