/**
 * 던져진 오류 하나 → **화면에 그릴 안내 한 벌.**
 *
 * ## 고치려는 것
 *
 * 앱이 실패를 알리는 문구의 대부분이 `인터넷 연결을 확인한 뒤 다시 시도해 주세요.` 였다.
 * 실측하면 그 문구가 뜨는 자리의 대부분은 연결과 무관하다 — 이미 가입된 이메일,
 * 만료된 인증번호, 이미 신고한 글, 점검 중인 검진 기관. 사용자는 고칠 수 없는 것(자기
 * 와이파이)을 고치러 가고, 우리는 그 제보를 "네트워크 이슈" 로 닫는다.
 *
 * 원인은 두 군데다.
 *  1. **연결 문구를 너무 넓게 썼다.** `!error.response` 하나로 오프라인·타임아웃·요청
 *     취소를 한 문장에 묶었다.
 *  2. **호출부 폴백이 서버 코드를 이겼다.** `getErrorMessage(error, "프로필을 저장하지
 *     못했어요…")` 는 서버가 `SIGNUP_ERROR_003`(닉네임 중복)을 줘도 폴백을 보여줬다.
 *     실제로 `useSignupSteps.ts` 는 이 규칙을 피하려고 폴백을 일부러 빼 두고, 왜 뺐는지
 *     주석으로 20줄을 적어 놨다. 규칙이 잘못됐다는 신호였다.
 *
 * ## 순서
 *
 * 위에서부터 처음 맞는 것을 쓴다. **코드가 폴백을 이긴다** — 이게 2번의 수정이다.
 *
 *  1. 요청 취소 → 아무것도 안 보여준다(`silent`)
 *  2. 응답 없음 → `offline` / `timeout`. **여기서만 인터넷을 언급한다.**
 *  3. `AUTH_SESSION_EXPIRED`(앱이 붙인 표시) → `sessionExpired`
 *  4. 우리가 아는 코드 → `errors.json` 카탈로그(원인 + 해결 + 버튼)
 *  5. 코드를 모르는 401 → `sessionExpired`
 *  6. 429 · 5xx → `rateLimited` / `server`
 *  7. 서버가 큐레이션한 문구(우리가 모르는 신규 코드) → 그대로
 *  8. 호출부 폴백
 *  9. 상태코드별 일반 문구
 *
 * **4번이 5번보다 앞이라는 것이 중요하다.** 서버는 로그인 실패에도 401 을 준다
 * (`LOGIN_ERROR_001`). 순서가 반대면 비밀번호를 틀린 사람이 로그인 화면에서
 * "다시 로그인해 주세요" 를 읽는다.
 */

import { CancelledError } from "@tanstack/react-query"

import i18n, { getAppLanguage } from "@/src/i18n"
import type errorsResources from "@/src/i18n/locales/ko/errors.json"
import { ApiError, isApiErrorLike } from "@/src/services/core/apiError"
import {
  getErrorBehavior,
  type ErrorActionId,
  type ErrorSurface,
} from "./catalog"

/**
 * 이 파일의 번역 키는 **런타임에 조립된다** — 서버가 준 코드로 `code.SIGNUP_ERROR_003.title`,
 * 전송 갈래로 `transport.offline.body`. 그런데 `i18n.t()` 는 `i18next.d.ts` 가 리소스 JSON 에서
 * 뽑아 둔 **정적 키 유니온**만 받는다(오타를 잡아 주는 규칙이라 앱 전체가 그대로 쓴다).
 *
 * 그래서 캐스팅으로 검사를 끄는 대신 **조립에 쓰는 조각 쪽을 유니온으로 좁힌다.**
 * `transport.${TransportKey}.title` 처럼 유한한 조합이 되면 그 결과도 정적 키 유니온의
 * 부분집합이라 그대로 통과한다. 덤으로 `errors.json` 에서 항목을 지우면 **여기가 먼저 깨진다** —
 * 캐스팅을 썼다면 런타임에 키 문자열이 그대로 화면에 찍힌 뒤에야 알았을 일이다.
 *
 * (`errors.json` 의 `transport`·`code` 는 모든 항목이 title·body 를 함께 갖는다.
 *  한쪽만 있는 항목을 새로 넣으면 그 조합이 유니온에서 빠져 여기서 타입 오류가 난다 — 의도된 신호다.)
 */
type TransportKey = keyof (typeof errorsResources)["transport"]
type CatalogCode = keyof (typeof errorsResources)["code"]

/**
 * 실패의 갈래. 로그·분석에 쓰고, 화면이 재시도 버튼을 줄지 판단하는 근거가 된다.
 * `NOT_FOUND` 는 재시도해도 영원히 같으므로 재시도 버튼을 주면 안 된다.
 */
export type ErrorKind =
  | "canceled"
  | "offline"
  | "timeout"
  | "sessionExpired"
  | "rateLimited"
  | "server"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "badRequest"
  | "unknown"

export type ResolvedError = {
  /** 무슨 일이 있었는지. 토스트 첫 줄 · 다이얼로그 제목. */
  title: string
  /** 왜 그랬고 다음에 뭘 하면 되는지. 없을 수도 있다. */
  body?: string
  /** 버튼 하나로 끝낼 수 있는 해결책. 호출부가 맥락형 핸들러를 줘야 살아나기도 한다. */
  action: ErrorActionId | null
  surface: ErrorSurface
  kind: ErrorKind
  /** 서버 도메인 코드. 제보를 재현할 때의 유일한 단서라 로그에 같이 남긴다. */
  code: string | null
  /** 요청 취소처럼 **알리면 안 되는** 실패. 호출부는 아무것도 그리지 않는다. */
  silent: boolean
  /** 재시도가 상태를 바꿀 가능성이 있는가. 404·권한 오류는 false. */
  retryable: boolean
}

/** 타임아웃을 뜻하는 axios/Node 코드. 오프라인과 안내가 달라야 한다. */
const TIMEOUT_CODES = new Set([
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_CANCELED_TIMEOUT",
])

/** 우리가 스스로 취소한 요청. 화면 이동·검색어 변경으로 매번 생긴다. */
const CANCEL_CODES = new Set(["ERR_CANCELED", "CanceledError", "ABORT_ERR"])

const RETRYABLE_KINDS = new Set<ErrorKind>([
  "offline",
  "timeout",
  "rateLimited",
  "server",
  "unknown",
])

function transportCopy(key: TransportKey): { title: string; body: string } {
  return {
    title: i18n.t(`transport.${key}.title`, { ns: "errors" }),
    body: i18n.t(`transport.${key}.body`, { ns: "errors" }),
  }
}

/**
 * 카탈로그에 이 코드의 문구가 있는가. 없으면 서버 문구로 내려간다.
 *
 * 좁히는 대상이 `string` 이 아니라 `CatalogCode` 인 것이 핵심이다 — 이 가드를 통과한
 * 코드로만 `code.*` 키를 조립하므로, 통과 시점에 코드가 유한 유니온이 되어야 아래
 * `t()` 가 정적 키로 검사된다. 런타임 확인(`exists`)과 타입이 같은 것을 말하게 된다.
 */
function hasCatalogCopy(code: string | null): code is CatalogCode {
  return !!code && i18n.exists(`code.${code}.title`, { ns: "errors" })
}

/**
 * 서버 봉투의 문구를 그대로 써도 되는가.
 *
 * 코드가 함께 왔다면 백엔드가 큐레이션한 문구다(`codes.generated.ts`). 상태코드만으로
 * 합성한 `HTTP_404` 같은 코드일 때의 `message` 는 axios 문자열이라 믿을 수 없다.
 */
function isCuratedServerMessage(code: string | null, message: string): boolean {
  if (!message.trim()) return false
  if (!code || code === "UNKNOWN" || /^HTTP_\d+$/.test(code)) return false
  // 언어가 어긋난 문구는 감춘다 — 영어 화면에 한국어가 튀어나오는 편이 일반 폴백보다 나쁘다.
  const hasHangul = /[가-힣]/.test(message)
  return getAppLanguage() === "en" ? !hasHangul : hasHangul
}

function kindFromStatus(status: number): ErrorKind {
  if (status === 429) return "rateLimited"
  if (status >= 500) return "server"
  if (status === 404) return "notFound"
  if (status === 409) return "conflict"
  if (status === 403) return "forbidden"
  if (status === 400 || status === 422) return "badRequest"
  return "unknown"
}

export type ResolveOptions = {
  /**
   * 코드도 서버 문구도 없을 때 쓸 화면 문구. **코드가 있으면 쓰이지 않는다** —
   * 화면이 아는 것("프로필을 저장하지 못했어요")보다 서버가 아는 것("이미 쓰고 있는
   * 닉네임이에요")이 언제나 더 구체적이다.
   */
  fallback?: string
}

export function resolveError(
  error: unknown,
  options: ResolveOptions = {},
): ResolvedError {
  const api = isApiErrorLike(error) ? error : null
  const code = api?.code ?? null
  const status = api?.statusCode

  const build = (
    partial: Pick<ResolvedError, "title" | "kind"> &
      Partial<Omit<ResolvedError, "title" | "kind">>,
  ): ResolvedError => {
    const behavior = getErrorBehavior(code)
    return {
      body: undefined,
      action: partial.action !== undefined ? partial.action : behavior.action,
      surface: partial.surface ?? behavior.surface,
      code,
      silent: false,
      retryable: partial.retryable ?? RETRYABLE_KINDS.has(partial.kind),
      ...partial,
    }
  }

  /*
    1) 우리가 취소한 요청. 사용자가 한 일의 결과가 아니므로 알리지 않는다.

    갈래가 둘이다. axios 가 던지는 취소는 `code` 가 있어서 `CANCEL_CODES` 로 잡힌다.
    react-query 가 던지는 취소(`cancelQueries` · `cancelRefetch:true`)는 **query-core 의
    `CancelledError`** 인데, 그 객체에는 `code` 도 `name` 도 없다(생성자가 `message` 에만
    `"CancelledError"` 를 넣는다). 그래서 `isApiErrorLike` 가 거짓이고, 아무 갈래에도
    안 걸려 맨 아래 "알 수 없는 오류" 로 떨어졌다 — 당겨서 새로고침을 하는 동안 좋아요를
    누르면(그 취소가 당김 요청을 접는다) 사용자가 아무 것도 안 한 자리에서 붉은 토스트가
    떴다. `useRefreshable` 은 "취소된 요청은 아무것도 그리지 않는다" 고 적어 두고 있었고,
    그 약속이 지켜지는 곳이 바로 여기다. 타입으로 정확히 판별한다(문자열 대조 아님).
  */
  if (error instanceof CancelledError || (code && CANCEL_CODES.has(code))) {
    return build({ title: "", kind: "canceled", silent: true, action: null })
  }

  /*
    2) 응답이 아예 오지 않았다. **인터넷을 언급해도 되는 유일한 자리.**

    두 번째 조건에 `error instanceof ApiError` 가 붙어 있는 이유:
    `isApiErrorLike` 는 `message`·`code` 가 문자열이면 **무엇이든** 참이다. 그런데
    구글·카카오 로그인 SDK 의 에러가 정확히 그 모양(`{message, code:"DEVELOPER_ERROR"}`)
    이라, 상태코드가 없다는 이유로 전부 "와이파이를 확인해 주세요" 가 됐다.
    안드로이드에서 서명 지문이 등록되지 않아 나는 설정 오류가 **네트워크 장애로**
    보고됐고, 와이파이가 멀쩡한 사용자는 고칠 수 없는 것을 고치려 했다
    (2026-08-04: "실제로 와이파이 잘 작동하는데 네트워크 환경 에러라고 나옴").

    우리 HTTP 계층은 응답이 없을 때 `isNetworkError=true` 를 실어 준다
    (`apiClient.ts` 의 `new ApiError(message, code, undefined, true)`). 그러니 첫
    조건만으로 진짜 전송 실패는 이미 잡힌다. 두 번째는 그 계층에서 온 것이 확실할
    때만 도는 안전망으로 좁힌다 — 남의 SDK 에러는 여기 오면 안 된다.
  */
  if (
    api?.isNetworkError === true ||
    (error instanceof ApiError && status === undefined)
  ) {
    const isTimeout = !!code && TIMEOUT_CODES.has(code)
    const kind: ErrorKind = isTimeout ? "timeout" : "offline"
    const copy = transportCopy(isTimeout ? "timeout" : "offline")
    return build({ ...copy, kind, action: "retry", surface: "toast" })
  }

  // 3) 앱이 스스로 붙인 세션 만료 표시(`authSession.ts`). 카탈로그에 없는 코드다.
  if (code === "AUTH_SESSION_EXPIRED") {
    return build({
      ...transportCopy("sessionExpired"),
      kind: "sessionExpired",
      action: "goLogin",
      retryable: false,
    })
  }

  // 4) 우리가 문구를 갖고 있는 코드. 폴백보다도, **401 규칙보다도** 먼저다.
  //
  //    401 을 먼저 보면 안 된다 — 서버는 로그인 실패(`LOGIN_ERROR_001`)에도 401 을
  //    준다. 그 둘을 상태코드로만 가르면 비밀번호를 틀린 사람에게 "다시 로그인해
  //    주세요" 라고 말하게 된다. 이미 로그인 화면에 서 있는 사람에게.
  if (hasCatalogCopy(code)) {
    return build({
      title: i18n.t(`code.${code}.title`, { ns: "errors" }),
      body: i18n.exists(`code.${code}.body`, { ns: "errors" })
        ? i18n.t(`code.${code}.body`, { ns: "errors" })
        : undefined,
      kind: status ? kindFromStatus(status) : "unknown",
    })
  }

  // 5) 코드를 모르는 401 — 만료된 세션으로 본다.
  if (status === 401) {
    return build({
      ...transportCopy("sessionExpired"),
      kind: "sessionExpired",
      action: "goLogin",
      retryable: false,
    })
  }

  // 6) 우리 잘못이거나 붐빔. 화면 폴백("저장하지 못했어요")보다 원인이 분명하다.
  if (status === 429) {
    return build({
      ...transportCopy("rateLimited"),
      kind: "rateLimited",
      action: "retry",
    })
  }
  if (status !== undefined && status >= 500) {
    // 5xx 에 연결 문구를 쓰면 안 된다. 우리 잘못인데 사용자가 자기 와이파이를 의심한다.
    return build({
      ...transportCopy("server"),
      kind: "server",
      action: "retry",
    })
  }

  // 7) 우리가 모르는 신규 코드 — 서버가 큐레이션한 문구를 그대로 쓴다.
  //    방향은 없지만 최소한 원인은 맞다.
  const serverMessage = (api?.message ?? "").trim()
  if (isCuratedServerMessage(code, serverMessage)) {
    return build({
      title: serverMessage,
      kind: status ? kindFromStatus(status) : "unknown",
    })
  }

  // 8) 화면이 준 폴백.
  if (options.fallback) {
    return build({
      title: options.fallback,
      kind: status ? kindFromStatus(status) : "unknown",
    })
  }

  // 9) 남은 것 — 상태코드로 말할 수 있는 만큼만 말한다.
  const kind = status !== undefined ? kindFromStatus(status) : "unknown"
  const bucket =
    kind === "notFound"
      ? "notFound"
      : kind === "conflict"
        ? "conflict"
        : kind === "forbidden"
          ? "forbidden"
          : kind === "badRequest"
            ? "badRequest"
            : "unknown"
  return build({ ...transportCopy(bucket), kind })
}

/** 액션 라벨. 버튼을 그리는 쪽에서 쓴다. */
export function getErrorActionLabel(action: ErrorActionId): string {
  return i18n.t(`action.${action}`, { ns: "errors" })
}

/**
 * 실패 하나를 분석 이벤트의 `fail_kind` **값**으로 접는다.
 *
 * ■ 왜 여기에 있나
 *
 * 갈래 판정의 정본은 `resolveError` 하나다. 호출부마다 `e instanceof ApiError ? e.code
 * : "network"` 를 다시 적으면 같은 실패가 화면·로그·분석에서 서로 다른 말을 하게 된다.
 * 이 함수는 판정을 **다시 짓지 않고** 값만 옮긴다(`toErrorPresentedProperties` 와 같은
 * 역할이고, 그쪽은 통로가 있는 실패, 이쪽은 통로 없이 인라인으로 끝나는 실패다).
 *
 * ■ 왜 `code ?? kind` 인가
 *
 * 서버 도메인 코드가 있으면 그것이 가장 좁은 구분이다(`OTP_ERROR_002` 만료 vs
 * `OTP_ERROR_003` 오타는 고칠 대상이 다르다). 없으면 범주로 접는다 — 전송 실패는
 * 코드가 없고, 그때 `"unknown"` 대신 `null` 을 실으면 새니타이저가 **키째로** 떨궈
 * 그 실패가 브레이크다운에서 통째로 사라진다.
 *
 * 값은 열거형이지만 서버가 코드를 늘리면 값도 는다 — 카디널리티가 문제가 되면
 * 대시보드에서 접지, 여기서 미리 뭉개지 않는다(뭉개면 되돌릴 수 없다).
 */
export function toAnalyticsFailKind(error: unknown): string {
  const resolved = resolveError(error)
  return resolved.code ?? resolved.kind
}
