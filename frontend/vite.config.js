import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/proxies': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/transit-ips': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/user-login-details': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/network-usage': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
    }
  }
});
