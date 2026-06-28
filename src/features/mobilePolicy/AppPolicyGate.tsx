import { createContext, useContext, type ReactNode } from "react"

import { LoadingScreen } from "@/src/shared/components"
import { BlockingPolicyScreen } from "./components/BlockingPolicyScreen"
import { RecommendedUpdatePrompt } from "./components/RecommendedUpdatePrompt"
import { useAppPolicyGate } from "./hooks/useAppPolicyGate"
import type { MobilePolicyResponse, MobilePolicySource } from "./types"

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
  const { status, policy, source, isBlocking, shouldRecommendUpdate, refresh } =
    useAppPolicyGate()

  if (status === "checking") {
    return <LoadingScreen message="앱 버전을 확인하는 중..." />
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
