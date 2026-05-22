import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 生产部署建议用同域 /api 反代到 Go 服务；开发环境由 Vite 转发到本地 Gin。
      '/api': 'http://127.0.0.1:8088',
    },
  },
})
