// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, path.resolve(__dirname, '..'))

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
                '@layout': path.resolve(__dirname, './src/layout'),
                '@hooks': path.resolve(__dirname, './src/hooks'),
                '@utils': path.resolve(__dirname, './src/utils'),
                '@styles': path.resolve(__dirname, './src/styles'),
                '@types': path.resolve(__dirname, './src/types'),
                '@constants': path.resolve(__dirname, './src/constants'),
                '@assets': path.resolve(__dirname, './src/assets'),
                '@models': path.resolve(__dirname, './src/models'),
                '@api': path.resolve(__dirname, './src/api'),
                '@recoil': path.resolve(__dirname, './src/recoil'),

            },
        },

        envDir: path.resolve(__dirname, '..'),

        server: {
            port: 3001,       // 개발 서버 포트 고정
            strictPort: true, // 포트가 사용 중이면 에러로 중단 (기본은 false → 다음 가용 포트로 이동)
            host: '0.0.0.0',  // 외부에서 접속 가능하게 하려면 설정
            proxy: {
                '/api': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                    secure: false,
                }
            }
        },
    }
})
