import { foodCameraService } from "@/src/services/data"

import { presentError } from "@/src/lib/errorMessage"
import { trackAnalyticsEvent } from "@/src/features/analytics"

export function useExtraWater() {
  /** 성공 여부를 돌려준다 — 낙관적으로 그린 값을 실패 시 되물릴 수 있게. */
  const updateExtraWater = async (
    date: string,
    deltaWater: number,
  ): Promise<boolean> => {
    try {
      await foodCameraService.updateExtraWater(date, deltaWater)
      trackAnalyticsEvent("health_entry_save_succeeded", {})
      return true
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {})
      /*
        재시도 버튼을 달지 않는다. 이 API 는 **누적이 아니라 증감(delta)** 이고,
        실패해도 물 시트는 담긴 잔을 그대로 둔 채 열려 있다(`WaterSheet.commit`) —
        재시도는 이미 화면 한가운데의 "기록하기" 다. 토스트에도 버튼을 주면 둘 다 눌린
        만큼 마신 적 없는 물이 두 번 더해진다.
      */
      presentError(error, { scope: "water-intake-save" })
      return false
    }
  }

  return { updateExtraWater }
}
