import { createContext, useContext, type ReactNode } from "react"

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

  if (status === "checking") {
    return <LoadingScreen message={t("mobilePolicy.opening")} />
  }

  if (policy && isBlocking) {
    return <BlockingPolicyScreen policy={policy} />
  }

  return (
    <MobilePolicyContext.Provider value={{ policy, source, refresh }}>
      {children}
      {policy && shouldRecommendUpdate && (
        <RecommendedUpdatePrompt policy={policy} />
      )}
    </MobilePolicyContext.Provider>
  )
}
