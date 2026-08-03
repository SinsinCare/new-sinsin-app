/**
 * 해결 버튼의 **실행부.** 문구·판정(`resolve.ts`)과 갈라 둔 이유는 두 가지다.
 *
 *  - 여기만 `expo-router` 를 들여온다. 판정은 순수 함수로 남아 네이티브 모듈 없이
 *    테스트된다(`tests/errorGuidance.test.ts`).
 *  - 목적지를 한곳에 모아 둬야, 라우트가 바뀔 때 78개 코드가 아니라 이 파일만 고친다.
 *
 * 토스 원칙 5 — "고객센터로 문의하세요" 라고 적는 대신 문의 화면으로 보내는 버튼을 준다.
 */

import { router } from "expo-router"
import { CONTEXTUAL_ACTIONS, type ErrorActionId } from "./catalog"

/**
 * 호출부가 채워 주는 맥락형 핸들러. 안 주면 그 버튼은 그리지 않는다.
 *
 * `goBack` 이 여기 있는 이유 — 안전한 뒤로가기는 `useGoBack()` 훅이고(현재 세그먼트를
 * 봐야 폴백 목적지를 안다), 이 모듈은 훅을 부를 수 없다. 화면에서 `goBack: goBack`
 * 한 줄만 넘겨 주면 된다.
 */
export type ErrorActionHandlers = Partial<
  Record<"retry" | "refresh" | "resendCode" | "goBack", () => void>
>

const NAVIGATE: Record<string, () => void> = {
  goHome: () => router.replace("/(tabs)/home"),
  goLogin: () => router.replace("/(auth)/login"),
  goSignup: () => router.push("/(auth)/signup-email"),
  resetPassword: () => router.push("/(auth)/forgot-password"),
  completeProfile: () => router.push("/onboarding"),
  openInquiry: () => router.push("/(settings)/inquiry"),
}

/**
 * 이 액션을 지금 실제로 누를 수 있는가.
 *
 * 맥락형(`retry`·`refresh`·`resendCode`)은 호출부가 핸들러를 줬을 때만 산다.
 * 눌러도 아무 일 없는 버튼은 "해결할 수 있다" 는 거짓말이라 아예 그리지 않는다.
 */
export function resolveErrorAction(
  action: ErrorActionId | null,
  handlers: ErrorActionHandlers = {},
): (() => void) | null {
  if (!action) return null
  if (CONTEXTUAL_ACTIONS.has(action)) {
    return handlers[action as keyof ErrorActionHandlers] ?? null
  }
  return NAVIGATE[action] ?? null
}
