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
      // Hermes 가 싣고 있는 Intl 생성자는 Collator·DateTimeFormat·NumberFormat 뿐이다.
      // 나머지는 undefined 라서 호출 즉시 크래시하는데, 타입 정의(lib.es20xx)에는
      // 멀쩡히 있어서 tsc 도 에디터도 잡아주지 않는다 — 실기기에서만 터진다.
      // 실제로 Intl.RelativeTimeFormat 이 커뮤니티 피드를 통째로 죽인 적이 있다.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='Intl'][property.name=/^(RelativeTimeFormat|PluralRules|ListFormat|DisplayNames|Segmenter|DurationFormat|Locale)$/]",
          message:
            "Hermes 에 없는 Intl API 입니다. 문자열은 i18n 리소스로 만들고, 날짜·숫자만 Intl.DateTimeFormat / Intl.NumberFormat 을 쓰세요.",
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/",
      "dist/",
      ".claude/",
      ".expo/",
      "web-build/",
      "ios/",
      "android/",
    ],
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        console: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
  },
])
