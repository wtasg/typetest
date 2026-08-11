import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
    plugins: [solidPlugin()],
    // VITE_BASE is set to /typetest/ for gh-pages deployment (npm run predeploy)
    base: process.env.VITE_BASE ?? '/',
    server: { port: 30002 },
    build: { target: 'esnext' },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
