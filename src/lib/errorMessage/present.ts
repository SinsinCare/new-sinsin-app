/**
 * **실패 하나를 알리는 단 하나의 호출.** 화면은 이것만 부르면 된다.
 *
 * ```ts
 * catch (error) {
 *   presentError(error, { scope: "profile-save", retry: () => save() })
 * }
 * ```
 *
 * 이 함수가 대신 정하는 것 세 가지 — 셋 다 호출부가 매번 틀리던 것들이다.
 *
 *  1. **문구**: 서버 코드에 맞는 원인 + 해결(`resolve.ts`). 호출부가 넘기던
 *     `"…인터넷 연결을 확인한 뒤 다시 시도해 주세요."` 는 이제 필요 없다.
 *  2. **그릇**(토스 원칙 2): 고를 게 있으면 다이얼로그, 아니면 토스트.
 *  3. **버튼**(토스 원칙 5): "로그인해 주세요" 대신 로그인으로 보내는 버튼.
 *
 * 그리고 **요청 취소는 아무것도 그리지 않는다.** 화면 이동으로 취소된 요청까지
 * 토스트를 띄우던 것이 "인터넷 연결을 확인하세요" 가 여기저기 뜨던 원인 중 하나였다.
 */

import i18n from "@/src/i18n"
import {
  toErrorPresentedProperties,
  trackAnalyticsEvent,
} from "@/src/features/analytics"
import { logger } from "../logger"
import { showConfirm, showAlert } from "../dialog"
import { showErrorToast, showInfoToast } from "../toast"
import { openPaywall } from "@/src/features/billing/paywallHost"
import {
  SERVER_GATE_ENTRY,
  type PaywallReason,
} from "@/src/features/billing/types"
import { resolveErrorAction, type ErrorActionHandlers } from "./actions"
import {
  getErrorActionLabel,
  resolveError,
  type ResolvedError,
} from "./resolve"

export type PresentErrorOptions = ErrorActionHandlers & {
  /**
   * 어느 동작이 실패했는지. **로그에만** 쓴다(`[error] profile-save …`).
   * 4xx 는 화면에 한 문장만 남기고 사라지므로, 이게 없으면 제보를 재현할 수 없다.
   */
  scope?: string
  /** 코드도 서버 문구도 없을 때만 쓰는 화면 문구. */
  fallback?: string
  /** 토스트로 강제한다 — 이미 다이얼로그가 떠 있는 흐름에서. */
  forceToast?: boolean
}

export function presentError(
  error: unknown,
  options: PresentErrorOptions = {},
): ResolvedError {
  const { scope, fallback, forceToast, ...handlers } = options
  const resolved = resolveError(error, { fallback })

  logResolved(resolved, scope, error)
  /* 조용한 실패도 센다 — 사용자에게 안 보였다는 사실 자체가 정보다(이 계측이
     `silent` 를 속성으로 갖는 이유). `silent` 반환보다 **앞**에 있어야 한다. */
  trackAnalyticsEvent(
    "app_error_presented",
    toErrorPresentedProperties(resolved),
  )
  if (resolved.silent) return resolved

  /*
    안내(`surface: "info"`) — **"이미 했어요" 는 실패가 아니다.**

    카탈로그가 "사용자가 원하던 상태가 이미 이루어져 있다" 고 판정한 코드다
    (`catalog.ts` 의 `INFO_CODES`). 여기서 바꾸는 것은 **색과 그릇 하나뿐**이고
    문구는 그대로 카탈로그의 것을 쓴다.

    이 갈래가 이 파일 안에 있는 것이 요점이다. 예전에는 커뮤니티 유틸이
    `presentError` **앞에서** 가로챘고, 그래서 세 코드는 오류 브레이크다운에 한 행도
    안 남았다("이미 신고했어요" 가 하루 몇 번 뜨는지를 셀 수 없었다). 통로를 지나게
    두면 위의 `trackAnalyticsEvent` 가 그 수를 그냥 세어 준다.

    **버튼은 그리지 않는다.** 안내에 남은 할 일은 "화면이 따라오는 것" 하나뿐이라,
    호출부가 준 `refresh` 를 버튼으로 미루지 않고 지금 돌린다 — `COMMUNITY_ERROR_005`
    의 문구가 "결과는 바로 아래에서 볼 수 있어요" 라고 약속하는데, 새로고침이 없으면
    그 아래에는 여전히 투표 전 라디오 버튼이 남아 있다. `resolveErrorAction` 을 거치지
    않는 이유는 그쪽이 `app_error_action_pressed` 를 함께 쏘기 때문이다 — 아무도 누르지
    않은 버튼을 눌렀다고 세면 "이 안내가 실제로 문제를 풀어 줬는가" 를 못 묻게 된다.
  */
  /*
    페이월(`surface: "paywall"`) — **결제하면 열리는 실패는 오류가 아니라 제안이다.**

    토스트를 띄우지 않는다. 페이월 시트 자체가 응답이고, 그 위에 붉은 토스트가 겹치면
    사용자는 "뭔가 잘못했다" 로 읽는다(기획서 §02 "탭하면 페이월 바텀시트").

    `entry_point` 는 서버 응답의 capability 에서 만든다 — 서버가 막은 요청은 화면이
    아니라 응답에서 오므로, 어느 잠금이 결제를 만들었는지 알 방법이 이것뿐이다.
    매핑이 없으면 `server_gate` 로 떨어지고, 그 값이 대시보드에 보이면 표가 빠진 것이다.

    이 갈래가 `presentError` **안**에 있는 것이 요점이다. 화면마다 402 를 가로채면
    위의 `trackAnalyticsEvent` 가 한 행도 못 세고, 그러면 "어떤 잠금이 결제를 만드는가"
    를 물을 수 없게 된다(`INFO_CODES` 갈래와 같은 이유).
  */
  if (resolved.surface === "paywall") {
    const reason = paywallReasonOf(error)
    openPaywall({
      entry:
        (reason === null ? undefined : SERVER_GATE_ENTRY[reason.capability]) ??
        "server_gate",
      reason,
      ...(reason === null ? {} : { capability: reason.capability }),
    })
    return resolved
  }

  if (resolved.surface === "info") {
    if (resolved.action === "refresh") handlers.refresh?.()
    showInfoToast(resolved.title, resolved.body)
    return resolved
  }

  const onPress = resolveErrorAction(resolved.action, handlers, resolved.kind)
  // 액션 id 와 핸들러가 **둘 다** 있을 때만 버튼이 산다.
  const button =
    resolved.action && onPress
      ? { label: getErrorActionLabel(resolved.action), onPress }
      : null

  if (resolved.surface === "dialog" && !forceToast) {
    void showDialog(resolved, button)
    return resolved
  }

  showErrorToast(resolved.title, resolved.body, button ?? undefined)
  return resolved
}

async function showDialog(
  resolved: ResolvedError,
  button: { label: string; onPress: () => void } | null,
): Promise<void> {
  if (!button) {
    await showAlert({ title: resolved.title, description: resolved.body })
    return
  }
  const confirmed = await showConfirm({
    title: resolved.title,
    description: resolved.body,
    confirmLabel: button.label,
    cancelLabel: i18n.t("action.close", { ns: "common" }),
    // 라벨이 "비밀번호 재설정" 처럼 길면 가로 분할이 읽히지 않는다.
    buttonLayout: "vertical",
  })
  if (confirmed) button.onPress()
}

/**
 * 예상 가능한 실패는 조용히, 나머지는 코드까지 남긴다.
 *
 * 오프라인·세션 만료는 사용자가 이미 안내를 받았고 우리가 고칠 것도 없다. 그걸
 * `error` 로 찍으면 dev 에서 LogBox 가 화면을 덮어 하단 버튼을 가린다(시뮬레이터에서
 * 로그인 CTA 가 안 눌리던 실제 원인).
 */
function logResolved(
  resolved: ResolvedError,
  scope: string | undefined,
  error: unknown,
): void {
  const label = `[error] ${scope ?? "unknown"}`
  if (resolved.silent) return
  if (resolved.kind === "offline" || resolved.kind === "sessionExpired") {
    logger.debug(label, resolved.kind, resolved.code ?? "-")
    return
  }
  if (resolved.kind === "timeout" || resolved.kind === "rateLimited") {
    logger.warn(label, resolved.kind, resolved.code ?? "-")
    return
  }
  logger.error(label, resolved.kind, resolved.code ?? "-", error)
}

/**
 * 402 응답이 실어 보낸 `result`. 서버는 여기에 capability·한도·재개 시각을 담는다
 * (`domains/billing/guard.ts` 의 `paywallError`).
 *
 * 모양이 다르면 **null 로 접는다** — 페이월은 이유 없이도 열려야 하고, 파싱 실패로
 * 결제 유도를 통째로 잃는 것이 가장 나쁘다.
 */
function paywallReasonOf(error: unknown): PaywallReason | null {
  if (!error || typeof error !== "object") return null
  const result = (error as { result?: unknown }).result
  if (!result || typeof result !== "object") return null
  const candidate = result as Partial<PaywallReason>
  return typeof candidate.capability === "string"
    ? (candidate as PaywallReason)
    : null
}
