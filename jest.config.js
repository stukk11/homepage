const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleDirectories: ["node_modules"],
  moduleNameMapper: {
    "^components/(.*)$": "<rootDir>/src/components/$1",
    "^utils/(.*)$": "<rootDir>/src/utils/$1",
    "^widgets/(.*)$": "<rootDir>/src/widgets/$1",
  },
  transformIgnorePatterns: ["/node_modules/"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "config/"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  clearMocks: true,
};

module.exports = createJestConfig(customJestConfig);
