import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd())
    void env

    return {
        plugins: [
            react(),
            svgr({
                svgrOptions: {
                    exportType: 'named',
                    ref: true,
                    svgo: false,
                    titleProp: true,
                },
                include: '**/*.svg',
            }),
        ],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@hooks': path.resolve(__dirname, './src/hooks'),
                '@utils': path.resolve(__dirname, './src/utils'),
                '@styles': path.resolve(__dirname, './src/styles'),
                '@types': path.resolve(__dirname, './src/types'),
                '@constants': path.resolve(__dirname, './src/constants'),
                '@assets': path.resolve(__dirname, './src/assets'),
                '@models': path.resolve(__dirname, './src/models'),
                '@api': path.resolve(__dirname, './src/api'),
            },
        },

        server: {
            port: 3002,
            strictPort: true,
            host: '0.0.0.0',
            proxy: {
                '/api': {
                    target: 'http://localhost:8001',
                    changeOrigin: true,
                    secure: false,
                }
            }
        },
    }
})
