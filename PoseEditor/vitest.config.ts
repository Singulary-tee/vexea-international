import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['PoseEditor/tests/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 60000,
    setupFiles: ['./tests/setup.ts'],
  },
});
