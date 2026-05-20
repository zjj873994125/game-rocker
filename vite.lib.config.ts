import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      formats: ['es'],
      fileName: () => 'index.mjs',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: ['vue', 'three'],
    },
  },
})
