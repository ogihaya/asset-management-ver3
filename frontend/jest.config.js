const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/page-components/(.*)$': '<rootDir>/src/page-components/$1',
    '^@/widgets/(.*)$': '<rootDir>/src/widgets/$1',
    '^@/features/(.*)$': '<rootDir>/src/features/$1',
    '^@/entities/(.*)$': '<rootDir>/src/entities/$1',
    '^@/shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@/store/(.*)$': '<rootDir>/src/store/$1',
    '^@/__mocks__/(.*)$': '<rootDir>/src/__mocks__/$1',
    '^@/__tests__/(.*)$': '<rootDir>/src/__tests__/$1',
    '^@/__tests__/testing-utils$': '<rootDir>/src/__tests__/testing-utils.tsx',
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    '^msw$': '<rootDir>/node_modules/msw/lib/core/index.js',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/__tests__/testing-utils.tsx',
  ],
};

module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)();
  // MSW の ESM モジュールをトランスパイルするため transformIgnorePatterns を上書き
  jestConfig.transformIgnorePatterns = [
    '/node_modules/(?!(msw|@mswjs|@bundled-es-modules|until-async)/)',
  ];
  // Jest が package.json exports を正しく解決するように設定
  jestConfig.testEnvironmentOptions = {
    ...jestConfig.testEnvironmentOptions,
    customExportConditions: ['node', 'node-addons'],
  };
  return jestConfig;
};
