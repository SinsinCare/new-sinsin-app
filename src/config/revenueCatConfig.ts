/**
 * RevenueCat SDK 키.
 *
 * ## 이 값은 공개다 — 그래서 안전하다
 *
 * SDK 키는 앱 번들에 그대로 박혀 나간다. 그건 결함이 아니라 설계다 — 이 키로 할 수 있는
 * 것은 "이 사람의 구매 상태를 묻는 것"뿐이고, **권한을 만드는 것은 스토어 영수증**이다.
 * 서버 시크릿 키(`sk_…`)는 반대로 프로젝트 전체를 읽고 쓸 수 있어서 **앱에 절대 오면
 * 안 된다.** 이 파일에 `sk_` 로 시작하는 값이 들어오면 그건 사고다.
 *
 * ## Test Store
 *
 * 스토어 상품이 아직 없어서 개발은 Test Store 키(`test_…`)로 한다. 실제 App Store /
 * Play 앱이 RC 에 연결되면 `appl_…` / `goog_…` 키를 추가하기만 하면 되고, **코드는
 * 바뀌지 않는다.**
 *
 * 릴리스 빌드에서 Test Store 키가 쓰이면 결제가 가짜로 열린다 —
 * `scripts/check-release-config.js` 가 그 조합을 빌드 전에 막는다.
 */

import { Platform } from "react-native"

function trimmed(value: string | undefined): string {
  return (value ?? "").trim()
}

const IOS_KEY = trimmed(process.env.EXPO_PUBLIC_RC_IOS_KEY)
const ANDROID_KEY = trimmed(process.env.EXPO_PUBLIC_RC_ANDROID_KEY)
const TEST_KEY = trimmed(process.env.EXPO_PUBLIC_RC_TEST_KEY)

/**
 * 이 빌드가 쓸 키. 스토어 키가 있으면 그것을, 없으면 Test Store 키를 쓴다.
 *
 * **없으면 빈 문자열을 돌려주고 결제 기능이 통째로 꺼진다.** 예외를 던지지 않는 이유는
 * `appConfig.getBackendUrl` 과 반대다 — 백엔드 URL 이 없으면 앱이 아무것도 못 하지만,
 * 결제 키가 없어도 앱의 나머지는 전부 돈다. 결제만 "준비 안 됨" 으로 두는 편이
 * 앱을 벽돌로 만드는 것보다 낫다.
 */
export function getRevenueCatApiKey(): string {
  const storeKey =
    Platform.OS === "ios"
      ? IOS_KEY
      : Platform.OS === "android"
        ? ANDROID_KEY
        : ""
  return storeKey || TEST_KEY
}

/** 지금 Test Store 로 붙어 있는가. 화면에 개발 꼬리표를 붙일 때 쓴다. */
export function isTestStoreKey(): boolean {
  return getRevenueCatApiKey().startsWith("test_")
}

export function isRevenueCatConfigured(): boolean {
  return getRevenueCatApiKey() !== ""
}
