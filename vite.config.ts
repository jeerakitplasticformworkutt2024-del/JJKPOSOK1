import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': __dirname,
      },
    },
    server: {
      // เปิด HMR ไว้เสมอ เพื่อให้ Google AI Studio Preview รีเฟรชเมื่อแก้ไฟล์
      hmr: true,
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
  };
});
