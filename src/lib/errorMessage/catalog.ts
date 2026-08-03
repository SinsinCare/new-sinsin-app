/**
 * 서버 에러 코드 → **무엇을 보여주고 무엇을 누르게 할지.**
 *
 * ## 왜 클라이언트가 카탈로그를 또 갖는가
 *
 * 서버(`sinsin-be-bun/src/http/codes.generated.ts`)도 코드마다 ko/en 문구를 갖고 있고
 * 앱은 그걸 그대로 보여줬다. 그런데 그 문구는 **상태 보고**다 — "이미 가입된 이메일입니다.",
 * "CODEF 요청에 실패했습니다." 처럼 무슨 일이 있었는지만 말하고 다음에 뭘 하면 되는지는
 * 말하지 않는다. 토스트에 그 한 줄만 뜨면 사용자가 할 수 있는 건 같은 값으로 다시
 * 눌러 보는 것뿐이다.
 *
 * 그리고 **해결책은 서버가 알 수 없다.** "로그인하러 가기" 버튼이 어디로 가야 하는지,
 * 지금 이 실패를 토스트로 담을지 다이얼로그로 담을지는 화면의 문제다. 그래서 문구
 * (`locales/{lang}/errors.json`)와 행동(이 파일)을 클라이언트에 두고, 서버 문구는 **우리가
 * 모르는 코드**(신규 배포로 늘어난 코드)의 폴백으로만 쓴다.
 *
 * ## 갱신 방법
 *
 * 서버에 에러 코드가 늘면 `tests/errorGuidance.test.ts` 가 깨진다(코드 목록 대조).
 * 그때 `locales/ko/errors.json` · `locales/en/errors.json` 에 문구를, 이 파일에 행동을
 * 추가한다. 문구만 있고 행동이 없으면 `action: null`(버튼 없음)이 기본이다.
 */

/**
 * 버튼 하나로 끝낼 수 있는 해결책.
 *
 * 두 갈래다.
 *  - **이동형**(`goLogin` 등): 목적지가 앱 전역에 하나뿐이라 여기서 바로 실행한다.
 *  - **맥락형**(`retry`·`refresh`·`resendCode`·`goBack`): 무엇을 다시 할지는 호출부만
 *    안다. 호출부가 핸들러를 주지 않으면 버튼은 그리지 않는다 — 눌러도 아무 일 없는
 *    버튼이 "해결할 수 있다"고 거짓말하는 것보다 없는 편이 낫다.
 *
 * `goBack` 이 맥락형인 것은 **뒤로가기가 화면 밖에서 안전하지 않기 때문**이다.
 * 안전한 뒤로가기(`useGoBack`)는 현재 세그먼트를 봐야 해서 훅이다. 여기서 싱글턴
 * `router.back()` 을 부르면 딥링크로 진입했을 때 아무 일도 하지 않는 버튼이 되고,
 * `tests/navigationBackGuard.test.ts` 가 정확히 그것을 막는다.
 */
export type ErrorActionId =
  | "retry"
  | "refresh"
  | "resendCode"
  | "goBack"
  | "goHome"
  | "goLogin"
  | "goSignup"
  | "resetPassword"
  | "completeProfile"
  | "openInquiry"

/** 호출부가 핸들러를 줘야만 살아나는 액션. */
export const CONTEXTUAL_ACTIONS = new Set<ErrorActionId>([
  "retry",
  "refresh",
  "resendCode",
  "goBack",
])

/**
 * 어느 그릇에 담을지 — 토스 원칙 2("상황과 이유, 해결책을 충분히 설명할 수 있는 용기").
 *
 * 기본은 `toast` 다. `dialog` 는 **사용자가 진짜 고를 게 있거나**(가입된 이메일 → 로그인),
 * **인지하지 못하면 계속 같은 벽에 부딪히는**(탈퇴·정지 계정) 실패에만 준다.
 */
export type ErrorSurface = "toast" | "dialog"

export type ErrorBehavior = {
  action: ErrorActionId | null
  surface: ErrorSurface
}

const DIALOG_CODES = new Set([
  "SIGNUP_ERROR_001", // 이미 가입된 이메일 — 로그인이라는 선택지가 있다
  "SIGNUP_ERROR_004",
  "AUTH_ERROR_006", // 탈퇴한 계정
  "AUTH_ERROR_007", // 정지된 계정
  "AUTH_ERROR_008", // 탈퇴 진행 중
  "AUTH_ERROR_009", // 소셜로 가입된 이메일 — 연결할지 고른다
])

/** 코드 → 액션. 없으면 버튼 없이 문구만 (`errors.json` 의 body 가 방향을 준다). */
const ACTION_BY_CODE: Readonly<Record<string, ErrorActionId>> = {
  COMMON_ERROR_002: "goLogin",
  COMMON_ERROR_003: "openInquiry",
  COMMON_ERROR_004: "goBack",
  COMMON_ERROR_005: "retry",

  TOKEN_ERROR_001: "goLogin",
  TOKEN_ERROR_002: "goLogin",
  TOKEN_ERROR_003: "goLogin",
  TOKEN_ERROR_004: "goLogin",
  TOKEN_ERROR_005: "resendCode",
  TOKEN_ERROR_006: "resendCode",

  LOGIN_ERROR_001: "resetPassword",

  SIGNUP_ERROR_001: "goLogin",
  SIGNUP_ERROR_004: "goLogin",

  MAIL_ERROR_002: "resendCode",
  OTP_ERROR_002: "resendCode",

  AUTH_ERROR_001: "goSignup",
  AUTH_ERROR_002: "retry",
  AUTH_ERROR_004: "goSignup",
  AUTH_ERROR_005: "completeProfile",
  AUTH_ERROR_006: "goSignup",
  AUTH_ERROR_007: "openInquiry",
  AUTH_ERROR_010: "goHome",
  AUTH_ERROR_012: "goLogin",

  CHAT_ERROR_001: "goBack",

  ONBOARDING_ERROR_003: "goHome",
  WITHDRAW_ERROR_001: "goLogin",

  COMMUNITY_ERROR_001: "refresh",
  COMMUNITY_ERROR_004: "refresh",
  COMMUNITY_ERROR_006: "refresh",
  COMMUNITY_ERROR_008: "refresh",
  COMMUNITY_ERROR_010: "refresh",

  FOOD_CAMERA_004: "retry",
  FOOD_CAMERA_005: "retry",
  FOOD_CAMERA_006: "retry",
  FOOD_CAMERA_007: "goBack",
  FOOD_CAMERA_008: "retry",
  FOOD_CAMERA_013: "refresh",

  HC_ERROR_002: "retry",
  HC_ERROR_003: "retry",
  HC_ERROR_004: "goBack",
  HC_ERROR_005: "retry",
  HC_ERROR_007: "openInquiry",

  DOCTOR_ERROR_003: "refresh",
}

/**
 * 앱이 문구를 갖고 있는 코드 전부. `tests/errorGuidance.test.ts` 가 이 목록과
 * `errors.json` 의 키가 어긋나지 않는지 지킨다.
 *
 * **AUTH_ERROR_008·AUTH_ERROR_009 에는 액션이 없다.** 둘 다 화면이 이미 자기 흐름을
 * 갖고 있어서다(탈퇴 취소 확인, 이메일 로그인 연결). 여기서 일반 버튼을 얹으면 그
 * 흐름과 경쟁한다.
 */
export function getErrorBehavior(
  code: string | null | undefined,
): ErrorBehavior {
  if (!code) return { action: null, surface: "toast" }
  return {
    action: ACTION_BY_CODE[code] ?? null,
    surface: DIALOG_CODES.has(code) ? "dialog" : "toast",
  }
}
