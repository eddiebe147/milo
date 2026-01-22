import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Standalone Vite config for web/PWA builds
 * Used by: npm run dev:web, npm run build:web
 * 
 * This is separate from electron.vite.config.ts which handles the Electron build
 */
export default defineConfig({
    plugins: [react()],
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist-web',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@components': resolve(__dirname, 'src/components'),
            '@hooks': resolve(__dirname, 'src/hooks'),
            '@stores': resolve(__dirname, 'src/stores'),
            '@lib': resolve(__dirname, 'src/lib'),
            '@styles': resolve(__dirname, 'src/styles'),
            '@types': resolve(__dirname, 'src/types')
        }
    },
    server: {
        port: 5173,
        host: true, // Allow access from network (for testing on phone)
        open: true
    },
    preview: {
        port: 4173,
        host: true
    }
})
