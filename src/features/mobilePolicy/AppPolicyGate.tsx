import { createContext, useContext, useMemo, type ReactNode } from "react"

import { LoadingScreen } from "@/src/shared/components"
import { BlockingPolicyScreen } from "./components/BlockingPolicyScreen"
import { RecommendedUpdatePrompt } from "./components/RecommendedUpdatePrompt"
import { useAppPolicyGate } from "./hooks/useAppPolicyGate"
import type { MobilePolicyResponse, MobilePolicySource } from "./types"
import { useTranslation } from "react-i18next"

interface AppPolicyGateProps {
  children: ReactNode
}

interface MobilePolicyContextValue {
  policy: MobilePolicyResponse | null
  source: MobilePolicySource | null
  refresh: () => Promise<void>
}

const MobilePolicyContext = createContext<MobilePolicyContextValue>({
  policy: null,
  source: null,
  refresh: async () => undefined,
})

export function useMobilePolicy() {
  return useContext(MobilePolicyContext)
}

export function AppPolicyGate({ children }: AppPolicyGateProps) {
  const { t } = useTranslation()
  const { status, policy, source, isBlocking, shouldRecommendUpdate, refresh } =
    useAppPolicyGate()
  // 렌더마다 새 객체를 주면 `useMobilePolicy` 소비자가 게이트가 그려질 때마다 다시 그린다.
  const value = useMemo(
    () => ({ policy, source, refresh }),
    [policy, source, refresh],
  )

  if (status === "checking") {
    return (
      <LoadingScreen
        surface="policy_gate"
        message={t("mobilePolicy.opening")}
      />
    )
  }

  if (policy && isBlocking) {
    return <BlockingPolicyScreen policy={policy} />
  }

  return (
    <MobilePolicyContext.Provider value={value}>
      {children}
      {policy && shouldRecommendUpdate && (
        <RecommendedUpdatePrompt policy={policy} />
      )}
    </MobilePolicyContext.Provider>
  )
}
