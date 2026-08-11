import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
    plugins: [solidPlugin()],
    server: { port: 30002 },
    build: { target: 'esnext' },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
