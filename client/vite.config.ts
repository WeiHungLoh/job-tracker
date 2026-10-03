import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5005';

    return {
        plugins: [react()],
        server: {
            proxy: {
                '/api-docs/openapi.json': {
                    target: proxyTarget,
                    changeOrigin: true,
                    rewrite: () => '/api-docs/openapi.json?proxy=true',
                },
                '/api-docs': {
                    target: proxyTarget,
                    changeOrigin: true,
                },
                '/api': {
                    target: proxyTarget,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        define: {
            'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api'),
        },
        test: {
            environment: 'jsdom',
            globals: true,
            setupFiles: './src/test/setup.ts',
            testTimeout: 10_000,
            coverage: {
                provider: 'v8',
                include: ['src/**/*.{ts,tsx}'],
                exclude: [
                    'src/**/*.test.{ts,tsx}',
                    'src/index.tsx',
                    'src/pages/dashboard/**',
                    'src/**/*.d.ts',
                    'src/types.ts',
                ],
                thresholds: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
    };
});
