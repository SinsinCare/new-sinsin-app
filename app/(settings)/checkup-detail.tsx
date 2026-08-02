/**
 * 검진 상세 — 요약·건강 수치·검사 기록.
 *
 * "질문하기" 는 상담 화면으로 프롬프트를 주입한다. `consultRequestId` 에 **매번 다른 값**을
 * 실어야 한다 — 없으면 프롬프트 문자열 자체가 dedupe 키가 되어 같은 질문을 두 번 누를 때
 * 두 번째가 조용히 무시된다(`app/consult.tsx` 의 파라미터 주석 참고).
 */
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { CheckupDetailScreen } from "@/src/features/health-checkup"
import {
  decodeResultIds,
  encodeResultIds,
} from "@/src/features/doctor-link/data/doctorParams"

export default function CheckupDetailRoute() {
  const router = useAppRouter()
  const params = useLocalSearchParams<{ resultIds?: string | string[] }>()
  const resultIds = decodeResultIds(params.resultIds)

  return (
    <CheckupDetailScreen
      resultIds={resultIds}
      onBack={() => router.back()}
      onAskQuestion={(context) =>
        router.push({
          pathname: "/consult",
          params: {
            // 수치를 통째로 넘긴다. 상담 화면이 이걸 프롬프트로 조립하고 카드로 그린다.
            examConsultContext: JSON.stringify(context),
            examConsultRequestId: `checkup-${Date.now()}`,
          },
        })
      }
      onOpenCalendar={() =>
        router.push({
          pathname: "/(settings)/checkup-calendar",
          params: { resultIds: encodeResultIds(resultIds) },
        })
      }
    />
  )
}
