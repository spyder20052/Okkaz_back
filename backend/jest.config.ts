import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  setupFiles: ['<rootDir>/__tests__/test-env.ts'],
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/singleton.ts'],
  testMatch: [
    '**/__tests__/unit/**/*.spec.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/app.ts',
    '!src/**/*.routes.ts', // Exclude pure route definitions from unit coverage to focus on controllers/services
  ],
};

export default config;
