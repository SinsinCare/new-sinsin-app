/**
 * 의사 연결 · 데이터 공유의 쿼리 키와 옵션.
 *
 * 키를 한 곳에 모으는 이유: 옛 `AskDoctorScreen` 은 `["doctor-connections"]` 리터럴을
 * 화면 안에 박아 두고 검색 결과는 `useMutation` + `useState` 로 들고 있었다. 그래서
 * (1) 화면을 나갔다 오면 검색 결과가 조용히 비고, (2) 연결 개수를 마이페이지 같은 다른
 * 화면에서 알 방법이 없었다. 키가 밖에 있으면 둘 다 풀린다.
 *
 * 로케일을 키에 넣지 않는다 — 이 응답들은 사람 이름·병원명·불리언뿐이라 서버가
 * Accept-Language 로 다르게 주는 부분이 없다. (프로즈를 내려주는 엔드포인트라면 넣어야 한다.)
 */

import { queryOptions } from "@tanstack/react-query"

import { doctorLinkService } from "@/src/services/data/doctorLinkService"
import type { DoctorSearchParams } from "@/src/types/doctorLink"

export const doctorLinkKeys = {
  all: ["doctor-link"] as const,
  connections: () => [...doctorLinkKeys.all, "connections"] as const,
  sharing: (connectionId: string) =>
    [...doctorLinkKeys.all, "sharing", connectionId] as const,
  search: (params: DoctorSearchParams) =>
    [
      ...doctorLinkKeys.all,
      "search",
      params.name?.trim() ?? "",
      params.hospital?.trim() ?? "",
      params.department?.trim() ?? "",
    ] as const,
}

export const doctorConnectionsQuery = () =>
  queryOptions({
    queryKey: doctorLinkKeys.connections(),
    queryFn: () => doctorLinkService.listConnections(),
  })

/**
 * 검색은 쿼리로 둔다(뮤테이션 아님). 같은 조건으로 돌아오면 캐시가 답하고,
 * 화면을 나갔다 와도 입력값과 결과가 어긋나지 않는다.
 * `enabled` 는 호출부가 "하나 이상 입력됨" 을 판단해서 넘긴다.
 */
export const doctorSearchQuery = (
  params: DoctorSearchParams,
  enabled: boolean,
) =>
  queryOptions({
    queryKey: doctorLinkKeys.search(params),
    queryFn: () => doctorLinkService.search(params),
    enabled,
    // 검색 결과는 자주 바뀌지 않는다. 뒤로 갔다 오는 왕복에서 다시 부르지 않게 한다.
    staleTime: 60_000,
  })

export const sharingQuery = (connectionId: string) =>
  queryOptions({
    queryKey: doctorLinkKeys.sharing(connectionId),
    queryFn: () => doctorLinkService.getSharing(connectionId),
    enabled: !!connectionId,
  })
