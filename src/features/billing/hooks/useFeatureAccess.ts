/**
 * 화면이 잠금을 그릴 때 쓰는 훅.
 *
 * ```tsx
 * const scan = useFeatureAccess("scan.unlimited", "meal_scan_limit")
 * <QuotaBadge access={scan} />
 * <Button disabled={false} onPress={scan.allowed ? capture : scan.openPaywall} />
 * ```
 *
 * ## 버튼을 비활성화하지 않는다
 *
 * 잠긴 기능의 버튼은 **누를 수 있어야 한다.** 눌러야 페이월이 열리고, 페이월이 열려야
 * 결제가 된다. 회색으로 죽여 두면 사용자는 왜 안 되는지 모른 채 떠난다 —
 * 기획서 §02 의 "탭하면 페이월 바텀시트" 가 그 이야기다.
 *
 * ## 모르는 capability 는 열린 것으로 본다
 *
 * 서버가 키를 늘렸는데 앱이 아직 모르면 열어 둔다. 진짜 잠금은 서버가 하므로 최악이
 * "눌렀더니 페이월" 이고, 반대로 잠그면 서버는 200 인데 화면만 막힌다(`types.ts` 머리말).
 */

import { useCallback, useMemo } from "react"

import { useBilling } from "../BillingProvider"
import { openPaywall } from "../paywallHost"
import type {
  CapabilityKey,
  CapabilityState,
  LockState,
  PaywallEntry,
} from "../types"

export interface FeatureAccess {
  readonly capability: CapabilityKey
  /** 지금 쓸 수 있는가. `peek` 은 **true** 다(요청은 되고 값만 가려진다). */
  readonly allowed: boolean
  readonly lockState: LockState
  /** 이 몫까지는 열린다(지표 1개 · 메뉴 3개 · 30일). 제한 없으면 null. */
  readonly allowance: number | null
  /** 주기형 잔량. 없으면 null(무제한이거나 총량형). */
  readonly remaining: number | null
  readonly limit: number | null
  readonly resetsAt: string | null
  /** 아직 모른다. **"잠김" 과 다르다** — 이때는 잠금 UI 를 그리지 않는다. */
  readonly isLoading: boolean
  /** 이 자리에서 페이월을 연다. `entry` 는 훅 인자로 받은 값이 실린다. */
  openPaywall(): void
}

export function useFeatureAccess(
  capability: CapabilityKey,
  entry: PaywallEntry,
): FeatureAccess {
  const { capability: lookup, isLoading } = useBilling()
  const state: CapabilityState | null = lookup(capability)

  const open = useCallback(() => {
    openPaywall({ entry, capability })
  }, [entry, capability])

  return useMemo<FeatureAccess>(() => {
    // 모르면 열어 둔다(머리말). 로딩 중에도 마찬가지 — 잠깐 잠겼다 풀리는 화면이
    // 가장 나쁘다(사용자는 그 깜빡임을 고장으로 읽는다).
    if (state === null) {
      return {
        capability,
        allowed: true,
        lockState: "open",
        allowance: null,
        remaining: null,
        limit: null,
        resetsAt: null,
        isLoading,
        openPaywall: open,
      }
    }

    return {
      capability,
      allowed: state.lockState !== "blocked",
      lockState: state.lockState,
      allowance: state.allowance,
      remaining: state.quota?.remaining ?? state.cap?.remaining ?? null,
      limit: state.quota?.limit ?? state.cap?.limit ?? null,
      resetsAt: state.quota?.resetsAt ?? null,
      isLoading,
      openPaywall: open,
    }
  }, [state, capability, isLoading, open])
}
