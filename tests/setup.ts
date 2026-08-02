import * as dotenv from "dotenv"
import * as path from "path"

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "ko", languageTag: "ko-KR" }],
}))
jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
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
