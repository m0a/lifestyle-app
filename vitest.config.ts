import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
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
      '@lifestyle-app/frontend': path.resolve(__dirname, 'packages/frontend/src'),
      // pnpm's strict node_modules makes 'drizzle-orm/d1' unresolvable from
      // tests/ (it is only a dependency of packages/backend), so vi.mock in
      // unit tests would register under a different module id than the
      // backend's own import. Pin both to the same file.
      'drizzle-orm/d1': path.resolve(
        __dirname,
        'packages/backend/node_modules/drizzle-orm/d1/index.js'
      ),
    },
  },
});
