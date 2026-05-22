import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@huggingface/transformers')) return 'transformers';
            if (id.includes('onnxruntime')) return 'transformers';
            if (id.includes('framer-motion')) return 'framer';
            if (id.includes('canvas-confetti')) return 'confetti';
            if (id.includes('react') || id.includes('scheduler')) return 'react';
            if (id.includes('zustand')) return 'zustand';
            return 'vendor';
          }
        },
      },
    },
  },
});
