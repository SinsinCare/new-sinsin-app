import type { Config } from "jest"

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  setupFiles: ["<rootDir>/tests/setup.ts"],
  testTimeout: 30000,
  verbose: true,
}

export default config
