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
  },
  moduleNameMapper: {
    // 래스터 자산(입체 카테고리 아이콘 등)은 로드만 되면 된다 — 숫자 스텁으로 치환.
    // **`^@/` 별칭보다 먼저** 서야 한다. jest 는 첫 매칭 규칙만 적용하므로, 뒤에 두면
    // `@/assets/....png` 가 별칭 규칙에 먼저 잡혀 실제 PNG 바이트를 파싱하다 죽는다.
    "\\.(png|jpg|jpeg|gif|webp)$": "<rootDir>/tests/helpers/assetStub.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFiles: ["<rootDir>/tests/setup.ts"],
  testTimeout: 30000,
  verbose: true,
}

export default config
