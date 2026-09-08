import { useCallback, useState } from "react"
import { useFocusEffect } from "@react-navigation/native"
import { loadCurrentOffering } from "../purchases/purchasesClient"
import { accountDailyPrice } from "../paywallPresentation"
import type { BillingStatus } from "../types"

/** Refresh when the account tab regains focus; never quote another account's data. */
export function useAccountDailyPrice(
  status: Pick<BillingStatus, "plan" | "appUserId"> | null,
) {
  const accountId = status?.appUserId
  const free = status?.plan === "free"
  const [loaded, setLoaded] = useState<{
    accountId: string
    quote: ReturnType<typeof accountDailyPrice>
  } | null>(null)
  useFocusEffect(
    useCallback(() => {
      if (!free || !accountId) return
      let active = true
      void loadCurrentOffering()
        .catch(() => null)
        .then((offering) => {
          if (active)
            setLoaded({
              accountId,
              quote: accountDailyPrice(offering?.packages ?? []),
            })
        })
      return () => {
        active = false
      }
    }, [accountId, free]),
  )
  return free && loaded?.accountId === accountId
    ? (loaded?.quote ?? null)
    : null
}
