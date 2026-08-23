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
      // 바텀시트 계보는 하나다: `V2BottomSheet`(역학은 @gorhom/bottom-sheet).
      // 한때 Tamagui `Sheet` 로 만든 `AppBottomSheet` 가 나란히 살았는데, 프레임이
      // **최대 스냅 높이로 눕는** 구조라 CTA·마지막 행이 화면 밖에 남는 사고가
      // 반복됐다(1.1.28, 2026-08-02 QA). 2026-08-17 에 소비처를 모두 옮기고 지웠다 —
      // docs/design/bottom-sheet-consolidation.md.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tamagui/sheet",
              message:
                "바텀시트는 @/src/design-system-v2 의 V2BottomSheet 하나로 씁니다(스크롤은 V2SheetScrollView, 입력은 V2SheetTextInput). docs/design/bottom-sheet-consolidation.md",
            },
          ],
          patterns: [
            {
              group: ["@tamagui/sheet/*"],
              message:
                "바텀시트는 @/src/design-system-v2 의 V2BottomSheet 하나로 씁니다. docs/design/bottom-sheet-consolidation.md",
            },
          ],
        },
      ],
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
        {
          // iOS 의 UIRefreshControl 은 스크롤뷰가 맨 위에서 **더 당겨질 때만** 발동한다.
          // bounces={false} 는 그 여지를 없애므로 RefreshControl 이 렌더는 되지만
          // onRefresh 가 영원히 안 불린다 — 안드로이드는 SwipeRefreshLayout 이 부모라
          // 멀쩡해서 한 플랫폼에서만 죽고, 그래서 커뮤니티 피드에서 오래 안 들켰다.
          selector:
            "JSXOpeningElement:has(JSXAttribute[name.name='refreshControl']) > JSXAttribute[name.name='bounces'] > JSXExpressionContainer > Literal[value=false]",
          message:
            "RefreshControl 과 bounces={false} 를 같이 주면 iOS 에서 당겨서 새로고침이 죽습니다. src/shared/refresh 의 useRefreshable 이 주는 scrollProps 를 통째로 펼치세요.",
        },
      ],
    },
  },
  // ── 디자인 계보 래칫 (2026-08-17)
  //
  // 앱에는 UI 계보가 넷 있었다: v2(정본) · surface · tamagui · 인라인 hex.
  // 색·타이포의 **정의부**는 전부 v2 에서 파생하도록 옮겼지만(theme/surface.ts,
  // theme/tokens.ts, theme/themes.ts), 화면 안에 남은 tamagui 임포트와 리터럴 hex 는
  // 아직 수백 곳이다. 그걸 한 번에 error 로 세우면 lint 가 통째로 빨개져서
  // 아무도 안 보게 된다 — 그래서 **이미 정리된 구역만 error 로 못 박고
  // 나머지는 warn** 으로 둔다. 구역이 비는 대로 아래 files 목록에 추가한다.
  //
  // 진행 상황과 남은 웨이브: docs/design/2026-08-17-design-consistency-plan.md
  {
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    ignores: [
      "src/theme/tokens.ts",
      "src/theme/themes.ts",
      "src/design-system-v2/tokens/**",
    ],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@tamagui/sheet",
              message:
                "바텀시트는 @/src/design-system-v2 의 V2BottomSheet 하나로 씁니다(스크롤은 V2SheetScrollView, 입력은 V2SheetTextInput). docs/design/bottom-sheet-consolidation.md",
            },
            {
              name: "tamagui",
              message:
                "새 화면은 @/src/design-system-v2 의 V2* 컴포넌트를 씁니다. tamagui 계보는 걷는 중입니다 — docs/design/2026-08-17-design-consistency-plan.md",
            },
          ],
          patterns: [
            {
              group: ["@tamagui/sheet/*"],
              message:
                "바텀시트는 @/src/design-system-v2 의 V2BottomSheet 하나로 씁니다. docs/design/bottom-sheet-consolidation.md",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "warn",
        {
          // 리터럴 hex. 같은 역할에 다른 값이 생기는 통로가 여기 하나다.
          // 색이 필요하면 useV2Theme()/useSurface() 에서 가져오고, 정본에 없으면
          // 토큰을 먼저 정한다(design-system-v2/tokens).
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            "리터럴 hex 대신 디자인 토큰을 쓰세요 — useV2Theme().colors / useSurface(). 정본에 없는 색이면 토큰부터 정합니다.",
        },
      ],
    },
  },
  {
    // 이미 v2 로 옮긴 구역. 여기서는 되돌아가는 것을 막는다.
    files: [
      "src/design-system-v2/components/**/*.tsx",
      "src/features/restaurant/**/*.{ts,tsx}",
      "src/theme/surface.ts",
    ],
    ignores: ["src/features/restaurant/map/mapFont.generated.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "tamagui",
              message:
                "이 구역은 v2 로 정리가 끝났습니다. tamagui 를 다시 들이지 마세요.",
            },
            {
              name: "@tamagui/sheet",
              message:
                "바텀시트는 V2BottomSheet 하나입니다. docs/design/bottom-sheet-consolidation.md",
            },
          ],
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
      // 폰트 base64 가 든 생성물. 손으로 고치지 않으므로 포맷 규칙을 물릴 이유가 없다
      // (만드는 곳은 scripts/build-map-font.py).
      "src/features/restaurant/map/mapFont.generated.ts",
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
