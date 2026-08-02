/** 검진 목록 — 분석할 회차를 고른다. */
import { useAppRouter } from "@/src/shared/navigation"

import { CheckupListScreen } from "@/src/features/health-checkup"
import { encodeResultIds } from "@/src/features/doctor-link/data/doctorParams"

export default function CheckupListRoute() {
  const router = useAppRouter()
  return (
    <CheckupListScreen
      onAnalyze={(resultIds) =>
        router.push({
          pathname: "/(settings)/checkup-detail",
          params: { resultIds: encodeResultIds(resultIds) },
        })
      }
      onAdd={() => router.push("/(settings)/checkup-auth")}
      onOpenDetail={(resultId) =>
        router.push({
          pathname: "/(settings)/checkup-detail",
          params: { resultIds: encodeResultIds([resultId]) },
        })
      }
    />
  )
}
