import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 300000,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['shared/**/*.ts', 'server/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts', 'server/index.ts', 'server/test-scenarios/**'],
    },
  },
});
