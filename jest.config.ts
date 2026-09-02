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
    /*
      앱은 metro 의 `react-native-svg-transformer` 로 SVG 를 컴포넌트로 받는다. jest 에는
      그것이 없어서, SVG 를 (전이적으로라도) import 하는 모듈을 들여오는 테스트가
      **스위트째로 죽는다**. 타입 쪽은 `tsconfig.test.json` 의 include 에 있는
      `src/types/svg.d.ts` 가 담당한다 — 둘 중 하나만 있으면 여전히 죽는다.
    */
    "^.+\\.svg$": "<rootDir>/tests/helpers/svgTransformer.js",
    /*
      `markdown-it-cjk-friendly` 와 그것이 쓰는 `get-east-asian-width` 는 ESM 으로만
      배포된다. jest 의 CJS 런타임은 그것을 그대로 못 읽으므로 이 두 패키지의 JS 만
      babel 로 CJS 로 내려 받는다 — 아래 `transformIgnorePatterns` 와 한 벌이다.
      (ts-jest 는 `.mjs` 를 ESM 그대로 내보내서 쓸 수 없었다.) 플러그인이 import 하는
      `markdown-it/lib/common/utils.mjs` 는 다시 ESM 전용 `mdurl`·`uc.micro` 를 끌고
      오므로 그 사슬은 따라가지 않고, 같은 헬퍼를 가진 CJS 빌드의 `utils` 로 매핑한다
      (`tests/helpers/markdownItUtilsStub.js`). 상담 말풍선의 파서가 이 플러그인을
      쓰므로 플러그인 자체를 스텁으로 바꾸면 "한국어 굵게가 안 먹는" 회귀를 못 본다.
    */
    "^.+\\.m?js$": [
      "babel-jest",
      {
        babelrc: false,
        configFile: false,
        plugins: ["@babel/plugin-transform-modules-commonjs"],
      },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(markdown-it-cjk-friendly|get-east-asian-width)/)",
  ],
  moduleNameMapper: {
    // 래스터 자산(입체 카테고리 아이콘 등)은 로드만 되면 된다 — 숫자 스텁으로 치환.
    // **`^@/` 별칭보다 먼저** 서야 한다. jest 는 첫 매칭 규칙만 적용하므로, 뒤에 두면
    // `@/assets/....png` 가 별칭 규칙에 먼저 잡혀 실제 PNG 바이트를 파싱하다 죽는다.
    "\\.(png|jpg|jpeg|gif|webp)$": "<rootDir>/tests/helpers/assetStub.js",
    // `react-native` 는 Flow 문법이라 이 프리셋에서 파싱이 안 된다 — 스텁으로 바꾼다
    // (이유와 한계는 그 파일 머리말). 지금까지는 RN 을 들여오는 테스트가 없어서
    // 안 보이던 벽이고, 공용 계측이 그 체인을 공유 모듈까지 끌고 왔다.
    "^react-native$": "<rootDir>/tests/helpers/reactNativeStub.js",
    /*
      `expo-linear-gradient` 도 같은 벽이다(네이티브 뷰 선언 + ESM). 목을 각 테스트가
      손으로 다는 방법도 되지만, 이 그라디언트는 **전이적으로** 딸려 온다 —
      `CategoryChipRail` → `EdgeFade` → 여기. 화면 하나를 부르는 스위트가 그 사슬을
      모른 채 로드에 실패하는 자리라, 목은 스위트마다 잊히고 매퍼는 안 잊힌다.
      (개별 `jest.mock` 은 여전히 이 매퍼보다 우선한다.)
    */
    "^expo-linear-gradient$": "<rootDir>/tests/helpers/linearGradientStub.js",
    /*
      `react-native-purchases` 도 같은 벽이다. 사슬이 짧아서 특히 넓게 번진다 —
      `sessionCleanup` 이 결제 모듈을 들여오고, 그 세션 정리는 결제와 무관한 스위트가
      잔뜩 들여온다(그 파일 머리말 참고).
    */
    "^react-native-purchases$": "<rootDir>/tests/helpers/purchasesStub.js",
    // ESM 전용 유틸을 CJS 빌드의 같은 헬퍼로 — 위 transform 주석 참고.
    "^markdown-it/lib/common/utils\\.mjs$":
      "<rootDir>/tests/helpers/markdownItUtilsStub.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFiles: ["<rootDir>/tests/setup.ts"],
  testTimeout: 30000,
  verbose: true,
}

export default config
