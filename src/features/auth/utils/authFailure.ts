/**
 * 인증 화면의 실패 하나를 **어느 그릇에 담을지** 가른다.
 *
 * ## 왜 인증만 따로 가르나
 *
 * 인증 화면은 실패를 담을 자리를 이미 갖고 있다 — 방금 입력한 필드 바로 아래다.
 * 틀린 비밀번호(`LOGIN_ERROR_001`), 인증번호를 받을 수 없는 주소(`MAIL_ERROR_001`),
 * 맞지 않는 인증번호(`OTP_ERROR_003`)는 **고칠 대상이 화면 안에** 있다. 이런 실패를
 * 토스트로 알리면 사용자가 값을 고치기 시작할 즈음엔 문구가 이미 사라져 있다.
 *
 * 반대로 이미 가입된 이메일(`SIGNUP_ERROR_001`)·탈퇴한 계정(`AUTH_ERROR_006`)은
 * 이 화면에서 고칠 수 없다. 다른 길(로그인·재가입)로 가야 하고, 그 길을 여는 버튼은
 * 카탈로그가 붙여 준다(`lib/errorMessage/catalog.ts` 의 `DIALOG_CODES`).
 *
 * 그래서 갈래를 카탈로그의 `surface` 로 정한다. 화면마다 "이건 토스트, 저건 인라인"
 * 을 다시 판단하면 코드가 늘어난 만큼 어긋난다 — 실제로 가입 이메일 화면만 중복
 * 이메일을 토스트로, 나머지 실패를 인라인으로 보내면서 그 둘의 문구가 서로 달랐다.
 */

import { presentError, resolveError } from "@/src/lib/errorMessage"
import type { PresentErrorOptions } from "@/src/lib/errorMessage"
import { getErrorMessage, logRecoverableError } from "@/src/lib/errorUtils"

/**
 * 실패를 알리고, **필드 아래에 남길 문구**를 돌려준다.
 *
 * 다이얼로그로 이미 알렸거나(선택지가 있는 실패) 알릴 것이 없으면(요청 취소)
 * `null` 이다. 호출부는 `setSendError(presentAuthFailure(...))` 한 줄이면 된다.
 *
 * @param options `presentError` 와 같다. `scope` 는 로그에서 어느 요청이었는지
 *   되짚는 유일한 단서라 호출부마다 다르게 준다.
 */
export function presentAuthFailure(
  error: unknown,
  options: PresentErrorOptions,
): string | null {
  const resolved = resolveError(error)

  if (resolved.silent) return null
  if (resolved.surface === "dialog") {
    presentError(error, options)
    return null
  }

  // 인라인은 스스로 로그를 남기지 않는다(`presentError` 와 달리). 4xx 는 화면에
  // 한 줄만 남기고 사라지므로 여기서 찍지 않으면 제보를 재현할 방법이 없다.
  logRecoverableError(`[error] ${options.scope ?? "auth"}`, error)
  return getErrorMessage(error)
}
