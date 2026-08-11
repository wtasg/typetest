import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
    plugins: [solidPlugin()],
    // VITE_BASE is set to /typetest/ by the GitHub Actions publish workflow
    base: process.env.VITE_BASE ?? '/',
    server: { port: 30002 },
    build: { target: 'esnext' },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
