import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'tests', '**/*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@lifestyle-app/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@lifestyle-app/backend': path.resolve(__dirname, 'packages/backend/src'),
    },
  },
});
