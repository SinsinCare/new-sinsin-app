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
import { logger } from "../logger"
import { showConfirm, showAlert } from "../dialog"
import { showErrorToast } from "../toast"
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
  if (resolved.silent) return resolved

  const onPress = resolveErrorAction(resolved.action, handlers)
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
