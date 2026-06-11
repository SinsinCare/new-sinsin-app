import type { ReactNode } from "react"

import { LoadingScreen } from "@/src/shared/components"
import { BlockingPolicyScreen } from "./components/BlockingPolicyScreen"
import { RecommendedUpdatePrompt } from "./components/RecommendedUpdatePrompt"
import { useAppPolicyGate } from "./hooks/useAppPolicyGate"

interface AppPolicyGateProps {
  children: ReactNode
}

export function AppPolicyGate({ children }: AppPolicyGateProps) {
  const { status, policy, isBlocking, shouldRecommendUpdate } =
    useAppPolicyGate()

  if (status === "checking") {
    return <LoadingScreen message="앱 버전을 확인하는 중..." />
  }

  if (policy && isBlocking) {
    return <BlockingPolicyScreen policy={policy} />
  }

  return (
    <>
      {children}
      {policy && shouldRecommendUpdate && (
        <RecommendedUpdatePrompt policy={policy} />
      )}
    </>
  )
}
