import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { edgeTtsDevPlugin } from './vite-plugin-edge-tts';
import { whisperDevProxyPlugin } from './vite-plugin-whisper-proxy';

export default defineConfig({
  plugins: [react(), tailwindcss(), edgeTtsDevPlugin(), whisperDevProxyPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
