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
