import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toDurationBucket, trackAnalyticsEvent } from "@/src/features/analytics"
import { showErrorToast, showInfoToast } from "@/src/lib/toast"
import { useBilling } from "../BillingProvider"
import {
  loadCurrentOffering,
  purchase,
  restore,
  type CurrentOffering,
  type OfferingPackage,
} from "../purchases/purchasesClient"
import type { PaywallRequest } from "../paywallHost"
import { didRestoreSomething } from "../restoreOutcome"
const MONTHLY = "$rc_monthly"
const ANNUAL = "$rc_annual"

export function usePaywallController(
  request: PaywallRequest | null,
  onClose: () => void,
) {
  const { t } = useTranslation("billing")
  const { status, syncNow } = useBilling()
  const [offering, setOffering] = useState<CurrentOffering | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string>(ANNUAL)
  const [busy, setBusy] = useState(false)
  const [openedAt, setOpenedAt] = useState<number | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const operation = useRef(false)
  const currentRequest = useRef(request)
  currentRequest.current = request

  const visible = request !== null
  const entry = request?.entry ?? "server_gate"
  useEffect(
    () => () => {
      currentRequest.current = null
    },
    [],
  )

  useEffect(() => {
    if (!visible) {
      setOpenedAt(null)
      return
    }
    setOpenedAt(Date.now())
    trackAnalyticsEvent("paywall_shown", {
      entry,
      plan: status?.plan ?? "free",
      reason: request?.reason?.reason ?? "browse",
      capability: request?.reason?.capability ?? request?.capability ?? "none",
    })
    /*
      **요청 객체 하나에만 반응한다.** 호스트는 페이월을 열 때마다 새 객체를 넣으므로,
      이미 열려 있는 상태에서 다른 잠금이 열려도(예: 페이월 위에서 다른 API 가 402)
      계측과 상품 선택이 새 요청 기준으로 다시 잡힌다.

      `status?.plan` 을 넣지 않는 이유: 구매 직후 plan 이 바뀌는데, 그때 이 훅이 다시
      돌면 **방금 결제한 사람에게 `paywall_shown` 이 한 번 더 찍힌다.**
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  /*
    상품 로드는 계측과 별도 이펙트다 — [다시 시도]가 로드만 다시 돌려야
    `paywall_shown` 이 중복으로 찍히지 않는다.
  */
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setOffering(null)
    setLoading(true)
    void loadCurrentOffering()
      .catch(() => null)
      .then((result) => {
        if (cancelled) return
        setOffering(result)
        setLoading(false)
        // 연간이 있으면 연간을 고른 채로 연다(기획서 §05 "연간이 기본 선택").
        const hasAnnual =
          result?.packages.some((item) => item.lookupKey === ANNUAL) ?? false
        setSelected(hasAnnual ? ANNUAL : MONTHLY)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, reloadToken])

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  const close = useCallback(() => {
    if (openedAt !== null) {
      trackAnalyticsEvent("paywall_dismissed", {
        entry,
        dwell_bucket: toDurationBucket((Date.now() - openedAt) / 1000),
      })
    }
    onClose()
  }, [entry, onClose, openedAt])

  const packages = useMemo(() => {
    const all = offering?.packages ?? []
    // 순서를 여기서 정한다 — 연간이 위다. RC 의 배열 순서에 기대지 않는다.
    return [ANNUAL, MONTHLY]
      .map((key) => all.find((item) => item.lookupKey === key))
      .filter((item): item is OfferingPackage => item !== undefined)
  }, [offering])

  const chosen =
    packages.find((item) => item.lookupKey === selected) ?? packages[0] ?? null

  const onBuy = useCallback(async () => {
    if (chosen === null || loading || operation.current || !request) return
    operation.current = true
    const startedFor = request
    setBusy(true)
    trackAnalyticsEvent("purchase_started", {
      entry,
      packageType: chosen.lookupKey,
    })
    const outcome = await purchase(chosen).catch(() => ({
      status: "failed" as const,
      message: "unknown",
    }))
    if (outcome.status === "purchased") {
      trackAnalyticsEvent("purchase_completed", {
        entry,
        packageType: chosen.lookupKey,
      })
      /*
        **서버에 반영될 때까지 기다린다.** 여기서 바로 닫으면 사용자는 결제 직후
        여전히 잠긴 화면으로 돌아간다 — 웹훅이 도착할 때까지 몇 초에서 몇 분이다.
      */
      await syncNow().catch(() => undefined)
      operation.current = false
      setBusy(false)
      if (currentRequest.current === startedFor) onClose()
      return
    }
    operation.current = false
    setBusy(false)
    if (currentRequest.current !== startedFor) return
    trackAnalyticsEvent("purchase_failed", {
      entry,
      packageType: chosen.lookupKey,
      kind:
        outcome.status === "cancelled"
          ? "cancelled"
          : failureKind(outcome.message),
    })
    // **취소는 실패가 아니다.** 아무것도 그리지 않는다.
    if (outcome.status === "failed") showErrorToast(t("paywall.purchaseError"))
  }, [chosen, loading, request, entry, onClose, syncNow, t])

  const onRestore = useCallback(async () => {
    if (operation.current || !request) return
    operation.current = true
    const startedFor = request
    setBusy(true)
    const outcome = await restore().catch(() => ({
      status: "failed" as const,
      message: "unknown",
    }))
    /*
      **동기화가 돌려준 값으로 판정한다.** 여기서 `status` 를 읽으면 이 콜백이 만들어질
      때 닫힌 낡은 값이라, 복원에 성공해도 "복원할 내역이 없어요" 가 뜬다.
    */
    const synced =
      outcome.status === "purchased" ? await syncNow().catch(() => null) : null
    operation.current = false
    setBusy(false)
    if (currentRequest.current !== startedFor) return
    if (outcome.status === "failed") {
      showErrorToast(t("subscription.restoreError"))
      return
    }
    if (outcome.status === "cancelled") return
    const restored = didRestoreSomething(outcome.status, synced)
    trackAnalyticsEvent("restore_completed", { restored })
    showInfoToast(
      t(restored ? "subscription.restoreDone" : "subscription.restoreEmpty"),
    )
    if (restored) onClose()
  }, [request, onClose, syncNow, t])

  return {
    loading,
    busy,
    packages,
    chosen,
    selected,
    setSelected,
    retry,
    close,
    onBuy,
    onRestore,
  }
}

function failureKind(message: string): "store" | "network" | "unknown" {
  if (message.includes("NETWORK") || message.includes("OFFLINE"))
    return "network"
  return message === "unknown" ? "unknown" : "store"
}
