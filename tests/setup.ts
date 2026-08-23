import * as dotenv from "dotenv"
import * as path from "path"

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "ko", languageTag: "ko-KR" }],
}))
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)

// 프로젝트 루트 .env (EXPO_PUBLIC_BACKEND_URL 등)
dotenv.config({ path: path.resolve(__dirname, "../.env") })
// 테스트 전용 계정·오버라이드
dotenv.config({ path: path.resolve(__dirname, ".env.test"), override: true })

/*
  `react-native-toast-message` 는 미변환 ESM 이라 이걸 (전이적으로라도) import 하는
  모듈을 들여오는 스위트가 **파싱 단계에서 통째로 죽는다** — 테스트 0개로 실패하므로
  "무엇이 틀렸는지" 가 아니라 "아무것도 안 돌았다" 로 보인다. SVG 변환기를 둔 것과
  같은 이유의 같은 처방이다.
*/
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}))

/*
  `expo-secure-store` 도 같은 미변환 ESM 이다. 공용 계측(L2)이 들어오면서
  `trackAnalyticsEvent` → `transport` → `tokenService` → 여기까지 딸려 오므로,
  계측이 붙은 모듈을 하나라도 들여오는 스위트가 파싱 단계에서 죽는다.
  토큰을 실제로 읽을 일은 테스트에 없으니 빈 저장소로 세운다.
*/
jest.mock("expo-secure-store", () => ({
  __esModule: true,
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}))

/* 같은 이유(미변환 ESM). 기기 컨텍스트는 값이 무엇이든 계측 계약과 무관하다. */
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "0.0.0-test" } },
}))

/*
  `expo-router` 는 변환되지 않은 JSX 를 담고 있다. 분석 배럴(`features/analytics/index.ts`)이
  `useAnalyticsLifecycle` 을 통해 이걸 재수출하므로, **배럴을 쓰는 모듈은 전부** 여기 걸린다.
  라우팅 자체를 테스트할 방법은 이 저장소에 없다(렌더러 없음) — 그건 `navigationBackGuard`
  처럼 소스를 훑는 테스트가 맡는다. 그래서 여기서는 로드만 되게 세운다.
*/
jest.mock("expo-router", () => ({
  __esModule: true,
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useSegments: () => [],
  useNavigation: () => ({ addListener: () => () => {} }),
  useLocalSearchParams: () => ({}),
}))
