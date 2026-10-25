import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // build: đặt outDir ngoài client/ để Vercel tìm dễ hơn (tuỳ chọn)
  // build: { outDir: '../dist' },
  server: {
    port: 3000,
    // Proxy chỉ dùng khi dev local (VITE_SOCKET_URL chưa set)
    proxy: process.env.VITE_SOCKET_URL ? {} : {
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
})
