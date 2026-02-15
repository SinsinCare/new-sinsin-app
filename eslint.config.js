const { defineConfig } = require("eslint/config")
const expoConfig = require("eslint-config-expo/flat")
const prettier = require("eslint-plugin-prettier")
const prettierConfig = require("eslint-config-prettier")

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    plugins: {
      prettier,
    },
    rules: {
      "prettier/prettier": "warn",
    },
  },
  {
    ignores: [
      "node_modules/",
      "dist/",
      ".expo/",
      "web-build/",
      "ios/",
      "android/",
    ],
  },
])
