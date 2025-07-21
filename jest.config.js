module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 0.5,
      functions: 1,
      lines: 2,
      statements: 2
    }
  },
  // Set the root directory explicitly to avoid looking for parent package.json
  rootDir: '.',
  // Prevent Jest from looking for configuration in parent directories
  projects: undefined
};