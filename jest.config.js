/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    "\\.ts$": "ts-jest",
    "\\.js$": "babel-jest",
  },
  automock: false,
  setupFiles: [
    '<rootDir>/src/__mocks__/setupJestMock.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts'
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/__mocks__/fileMock.js',
    '\\.(css|less|scss)$': '<rootDir>/src/__mocks__/styleMock.js'
  }
};
