import { Redirect } from "expo-router"
import { useTranslation } from "react-i18next"

import { useAuth } from "@/src/hooks"
import { LoadingScreen } from "@/src/shared/components"
import { resolveEntryRoute } from "@/src/shared/navigation/entryRoute"

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

  if (isLoading) return <LoadingScreen message={t("brand.opening")} />

  return (
    <Redirect
      href={resolveEntryRoute({
        isAuthenticated,
        accountState,
        requiresAdditionalInfo,
        entryGate,
      })}
    />
  )
}
