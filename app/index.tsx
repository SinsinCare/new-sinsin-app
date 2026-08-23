import { useEffect, useRef } from "react"
import { Redirect } from "expo-router"
import { useTranslation } from "react-i18next"

import { useAuth } from "@/src/hooks"
import { LoadingScreen } from "@/src/shared/components"
import {
  resolveEntryRoute,
  type EntryRoute,
} from "@/src/shared/navigation/entryRoute"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import type { AnalyticsEntryGate } from "@/src/features/analytics"

/**
 * 진입 목적지 → 관문 이름. `Record<EntryRoute, …>` 라서 목적지가 하나 늘면
 * 컴파일이 여기를 먼저 세운다 — 새 관문이 조용히 `other` 로 흘러 들어갈 자리가 없다.
 */
const ENTRY_GATE: Record<EntryRoute, AnalyticsEntryGate> = {
  "/(auth)/login": "login",
  "/(auth)/profile-setup": "profile",
  "/onboarding": "onboarding",
  "/(tabs)/home": "home",
}

/**
 * 진입 라우트. 세션 복구가 끝나기 전에는 아무 화면도 마운트하지 않고,
 * 끝난 뒤 곧바로 목적지로 보냅니다. 여기서 판정해야 잘못된 화면이
 * 마운트됐다가 밀려나는 일이 없습니다.
 */
export default function Index() {
  const { t } = useTranslation()
  const {
    isAuthenticated,
    isLoading,
    accountState,
    requiresAdditionalInfo,
    entryGate,
  } = useAuth()

  const route = isLoading
    ? null
    : resolveEntryRoute({
        isAuthenticated,
        accountState,
        requiresAdditionalInfo,
        entryGate,
      })

  /*
    발화는 렌더 본문이 아니라 여기다. 아래 `Redirect` 는 렌더 단계에서 평가되고
    리다이렉트가 걸릴 때까지 여러 번 그려질 수 있어서, 그 옆에서 쏘면 한 번의 진입이
    여러 행이 된다. 판정이 **바뀔 때만** 쏘는 ref 가드도 같은 이유다 —
    같은 관문으로 다시 그려지는 것은 사건이 아니다.
  */
  const lastGateRef = useRef<AnalyticsEntryGate | null>(null)
  useEffect(() => {
    if (!route) return
    const gate = ENTRY_GATE[route]
    if (lastGateRef.current === gate) return
    lastGateRef.current = gate
    trackAnalyticsEvent("app_entry_routed", { gate })
  }, [route])

  if (!route)
    return <LoadingScreen surface="app_entry" message={t("brand.opening")} />

  return <Redirect href={route} />
}
