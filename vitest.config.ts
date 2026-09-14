import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true, environment: 'node', testTimeout: 10 * 60 * 1000, hookTimeout: 15 * 60 * 1000, include: ['src/test/**/*.test.ts'], singleFork: true, fileParallelism: false } });
