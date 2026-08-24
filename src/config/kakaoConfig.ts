import expoConfig from "../../app.json"

type KakaoPluginOptions = {
  nativeAppKey?: unknown
}

const kakaoPlugin = (expoConfig.expo.plugins as unknown[]).find(
  (entry): entry is [string, KakaoPluginOptions] =>
    Array.isArray(entry) && entry[0] === "@react-native-kakao/core",
)
const configuredKey = kakaoPlugin?.[1]?.nativeAppKey

if (
  typeof configuredKey !== "string" ||
  !/^[a-f0-9]{32}$/u.test(configuredKey)
) {
  throw new Error("app.json Kakao native app key is missing or malformed")
}

/** Expo native callback scheme와 JavaScript SDK 초기화가 공유하는 단일 정본. */
export const KAKAO_NATIVE_APP_KEY = configuredKey
