/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
};
