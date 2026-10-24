import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Pure business logic and server code run in Node without booting Nuxt.
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    globalSetup: ['tests/setup/mongo.global.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
