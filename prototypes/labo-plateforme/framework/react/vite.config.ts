import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Production build only serves the lab: no dev-only tricks, default chunking, no preload polyfill
// (all target browsers support modulepreload), JSON imported as a JSON.parse string (cheaper parse).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  json: { stringify: true },
  build: {
    target: 'es2022',
    modulePreload: { polyfill: false },
    sourcemap: false,
    reportCompressedSize: true,
  },
  server: { fs: { allow: ['..'] } },
});
