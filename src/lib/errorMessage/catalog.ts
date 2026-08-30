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
  /**
   * 페이월을 연다. **이동형이 아니다** — 화면을 바꾸는 대신 시트를 얹는다.
   * 실행은 `present.ts` 의 페이월 갈래가 직접 한다(`resolveErrorAction` 을 안 탄다).
   */
  | "openPaywall"

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
 *
 * `info` 는 셋째 갈래다 — 아래 `INFO_CODES` 참고.
 */
export type ErrorSurface = "toast" | "dialog" | "info" | "paywall"

export type ErrorBehavior = {
  action: ErrorActionId | null
  surface: ErrorSurface
}

/**
 * **"이미 했어요" 는 실패가 아니다** — 붉은 오류가 아니라 안내로 담는 코드.
 *
 * 기준은 하나다: 사용자가 원하던 상태가 **이미 이루어져 있는가.** 신고 버튼은 목록·상세·
 * 스토리에 흩어져 있고 접수 여부가 화면에 남지 않아서, 같은 글을 두 번 신고하는 것은
 * 실수가 아니라 정상 동선이다. 그때 "접수된 신고를 확인하고 있어요" 라는 **안심시키는
 * 문장**을 경고색으로 띄우면, 사용자는 자기가 뭘 잘못했는지 찾다가 실제로 다시 신고한다.
 *
 * 없는 글·지워진 댓글(`001`·`008`)은 여기 들어오지 않는다. 그건 원하던 일이 일어나지
 * **않은** 것이고, 새로고침이라는 할 일이 남아 있다.
 *
 * ■ 왜 화면(`communityError.ts`)이 아니라 카탈로그에 있나
 *
 * 예전에는 커뮤니티 유틸이 `presentError` **앞에서** 이 세 코드를 가로채 `showInfoToast`
 * 로 보냈다. 색은 맞았지만 그 갈래는 `app_error_presented` 를 한 행도 남기지 않았다 —
 * 그 이벤트를 쏘는 지점은 `present.ts` 하나뿐이고(`tests/analyticsCrossCutting.test.ts`
 * 의 "통로는 하나다"), 유틸에서 한 번 더 쏘면 그 계약이 깨진다. 그래서 "이미 했어요"
 * 는 **판정**이고 판정은 카탈로그에 산다. `present.ts` 가 이 판정을 `showInfoToast`
 * 로 보내면 통로 하나로 계측까지 따라온다.
 *
 * `COMMUNITY_ERROR_005`(이미 참여한 투표)에 `refresh` 액션이 붙어 있는 것은 문구가
 * "결과는 바로 아래에서 볼 수 있어요" 라고 약속하기 때문이다. 그 약속을 지키려면
 * 화면이 지금 상태를 다시 받아야 한다 — `present.ts` 가 안내 갈래에서 호출부의
 * `refresh` 를 **버튼으로 미루지 않고 그 자리에서** 돌린다.
 */
const INFO_CODES = new Set([
  "COMMUNITY_ERROR_003", // 이미 신고한 글
  "COMMUNITY_ERROR_005", // 이미 참여한 투표
  "COMMUNITY_ERROR_011", // 이미 신고한 댓글
])

/**
 * **결제하면 열리는 실패.** 오류가 아니라 제안이라 토스트를 띄우지 않는다 —
 * 페이월 자체가 응답이다.
 *
 * 왜 여기(카탈로그)에 있나: `INFO_CODES` 와 같은 이유다. 화면마다 402 를 가로채면
 * `app_error_presented` 가 한 행도 안 남아서, **어떤 잠금이 결제를 만드는지**를 셀 수
 * 없게 된다. 통로를 지나게 두면 `present.ts` 의 계측이 그 수를 그냥 세어 준다.
 *
 * 502(`BILLING_ERROR_003`)는 여기 없다. 그건 "구독이 없다" 가 아니라 **"확인하지
 * 못했다"** 이고, 그때 페이월을 띄우면 이미 돈을 낸 사람에게 결제를 또 권하는 것이 된다.
 */
const PAYWALL_CODES = new Set([
  "BILLING_ERROR_001", // 구독 필요
  "BILLING_ERROR_002", // 무료 횟수 소진
])

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
  // 안내 갈래(`INFO_CODES`)의 `refresh` 는 버튼이 아니라 **지금 도는 것**이다.
  COMMUNITY_ERROR_005: "refresh",
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

  BILLING_ERROR_001: "openPaywall",
  BILLING_ERROR_002: "openPaywall",
  // 확인하지 못한 것이지 구독이 없는 것이 아니다 — 다시 해 보는 것이 유일한 할 일이다.
  BILLING_ERROR_003: "retry",
}

/** 이 코드를 어느 그릇에 담는가. 안내가 다이얼로그·토스트보다 앞선다. */
function surfaceFor(code: string): ErrorSurface {
  if (PAYWALL_CODES.has(code)) return "paywall"
  if (INFO_CODES.has(code)) return "info"
  return DIALOG_CODES.has(code) ? "dialog" : "toast"
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
    surface: surfaceFor(code),
  }
}
