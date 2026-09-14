import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/src/stores/authStore"
import { foodCameraService } from "@/src/services/data"
import { toDateStr } from "../utils/dateUtils"

type DiaryExistenceResponse = Awaited<
  ReturnType<typeof foodCameraService.fetchDiaryExistence>
>

export function useStreak() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  /*
    "오늘" 은 렌더마다 새 `Date` 가 아니라 **날짜 문자열** 하나로 고정한다. 아래 `select` 가
    이 값에만 묶이므로 같은 날 안에서는 함수가 바뀌지 않고, react-query 도 select 를 렌더마다
    다시 돌리지 않는다. 자정을 넘기면 문자열이 바뀌어 저절로 다시 계산된다.
  */
  const now = new Date()
  const endDate = toDateStr(now)
  const startDate = toDateStr(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
  )

  const select = useCallback(
    (data: DiaryExistenceResponse) => {
      /*
        서버 날짜("YYYY-MM-DD")는 `new Date()` 로 파싱하지 않는다 — UTC 자정으로 읽혀
        UTC 서쪽 시간대에서는 하루 전 날짜로 밀린다(`calendarModel.diaryDateKeys` 와
        같은 이유). 앞 열 자를 그대로 키로 쓴다.
      */
      const existingDates = new Set(
        data.result
          .filter((item) => item.exists)
          .map((item) => item.date.slice(0, 10)),
      )
      const [year, month, day] = endDate.split("-").map(Number)
      let streak = 0
      for (let i = 0; i <= 29; i++) {
        if (existingDates.has(toDateStr(new Date(year, month - 1, day - i)))) {
          streak++
        } else {
          break
        }
      }
      return streak
    },
    [endDate],
  )

  return useQuery({
    queryKey: ["diaryExistence", startDate, endDate],
    queryFn: () => foodCameraService.fetchDiaryExistence(startDate, endDate),
    enabled: isAuthenticated,
    retry: 0,
    select,
  })
}
