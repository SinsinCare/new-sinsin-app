import type { EmailLoginLinkRequiredResult, SocialProvider } from "@/src/types"

/**
 * 인증번호 발송 실패 중 **화면이 자기 흐름으로 받아야 하는 것 하나**.
 *
 * `AUTH_ERROR_009`(소셜로 가입된 이메일)는 문구만으로 끝나지 않는다 — "본인 확인을
 * 마치고 이메일 로그인을 연결할까요?" 를 묻고, 사용자가 예라고 하면 같은 화면이
 * 연결용 인증번호를 다시 보낸다(`useSignupEmail.confirmEmailLoginLink`). 그 흐름에
 * 필요한 `email` · `providers` 를 봉투에서 꺼내는 것이 이 파일의 일이다.
 *
 * **나머지 실패는 여기 오지 않는다.** 예전에는 `SIGNUP_ERROR_001`(이미 가입된 이메일)도
 * 여기서 걸러 문구를 손으로 지어 토스트로 띄웠는데, 그 문구가 제보의 시작이었다 —
 * "다른 이메일을 입력하거나 로그인해 주세요" 는 두 선택지를 말만 하고 어느 쪽도
 * 눌러 주지 않았고, 진짜 원인(이미 가입돼 있다)은 끝내 말하지 않았다. 지금은
 * 카탈로그가 그 코드를 다이얼로그 + "로그인하기" 버튼으로 올린다.
 */
export type SignupEmailSendFailure = {
  status: "email_login_link_required"
} & EmailLoginLinkRequiredResult

function isSocialProvider(value: unknown): value is SocialProvider {
  return value === "google" || value === "apple" || value === "kakao"
}

export function mapSignupEmailSendFailure(
  error: unknown,
): SignupEmailSendFailure | null {
  if (!error || typeof error !== "object") return null

  const { code, result } = error as { code?: unknown; result?: unknown }
  if (code !== "AUTH_ERROR_009" || !result || typeof result !== "object") {
    return null
  }

  const { email, providers } = result as {
    email?: unknown
    providers?: unknown
  }
  if (
    typeof email !== "string" ||
    !Array.isArray(providers) ||
    !providers.every(isSocialProvider)
  ) {
    return null
  }

  return {
    status: "email_login_link_required",
    email,
    providers,
  }
}
