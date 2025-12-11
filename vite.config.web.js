import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    root: 'src/renderer',
    base: './',
    build: {
        outDir: '../../dist_web',
        emptyOutDir: true
    },
    resolve: {
        alias: {
            '@renderer': resolve(__dirname, 'src/renderer/src')
        }
    },
    plugins: [react()]
})
