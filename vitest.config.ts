import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Git-spawning tests exceed the 5s default when 20 workers run in
    // parallel on a loaded machine; the 5s budget made the suite flaky.
    testTimeout: 20_000,
    coverage: {
      include: ['src/**/*.ts'],
      reporter: ['text', 'html']
    }
  }
});
