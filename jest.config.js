module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.before.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@react-native-firebase/.*)',
  ],
  moduleNameMapper: {
    '^expo/src/async-require/messageSocket$': '<rootDir>/__mocks__/messageSocket.js',
    '^expo/src/winter/(.*)$': '<rootDir>/__mocks__/winter.js',
    '^expo-asset$': '<rootDir>/__mocks__/expo-asset.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/expo-vector-icons.js',
  },
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js',
    '!**/.expo/**',
    '!**/index.js',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverage: false, // Set to true to collect coverage by default
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
