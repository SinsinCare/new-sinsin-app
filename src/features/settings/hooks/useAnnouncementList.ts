import { useQuery } from "@tanstack/react-query"
import { announcementService } from "@/src/features/announcement/services/announcementService"

/**
 * 공지 목록 한 벌을 목록 화면과 상세 화면이 나눠 쓴다.
 *
 * 예전에는 두 화면이 각자 `useState` 에 `fetchList()` 를 받았다. 목록에서 항목을 누르면
 * 상세가 **같은 목록을 통째로 다시 내려받아** 그 안에서 id 하나를 찾았다 — 방금 받은
 * 응답이 옆 화면 state 에 있는데도. 키 하나로 모으면 상세는 캐시를 읽고, 5분이 지나야
 * 다시 나간다.
 *
 * `retry: false` 는 옛 동작을 지키기 위해서다 — 화면은 첫 실패에 바로 번들 폴백
 * (`ANNOUNCEMENTS`)으로 떨어졌고, 재시도 3회를 기다리게 하면 그 폴백이 느려진다.
 */
export const ANNOUNCEMENT_LIST_QUERY_KEY = ["announcements"] as const

export function useAnnouncementList() {
  return useQuery({
    queryKey: ANNOUNCEMENT_LIST_QUERY_KEY,
    queryFn: () => announcementService.fetchList(),
    staleTime: 5 * 60_000,
    retry: false,
  })
}
