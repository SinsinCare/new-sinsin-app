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
  reports: () => [...doctorLinkKeys.all, "reports"] as const,
  /** 목록 키의 하위 — 목록을 무효화하면 상세도 같이 상한다. */
  report: (reportId: string) =>
    [...doctorLinkKeys.reports(), reportId] as const,
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

/**
 * 연결 목록·공유 설정·리포트는 **다른 사람(의사)이 바꾸는 값**이다 — 승인·거절·리포트 전송이
 * 전부 콘솔에서 일어난다. 전역 기본(5분)으로 두면 콘솔이 승인한 뒤에도 앱은 "승인 대기" 를
 * 5분 동안 보여 준다. staleTime 0 으로 두어 화면에 돌아올 때마다(`useRevalidateOnReturn`)
 * 다시 받는다. 목록은 몇 행짜리라 비용은 없다.
 */
const OTHER_PARTY_STALE_MS = 0

export const doctorConnectionsQuery = () =>
  queryOptions({
    queryKey: doctorLinkKeys.connections(),
    queryFn: () => doctorLinkService.listConnections(),
    staleTime: OTHER_PARTY_STALE_MS,
  })

export const doctorReportsQuery = () =>
  queryOptions({
    queryKey: doctorLinkKeys.reports(),
    queryFn: () => doctorLinkService.listReports(),
    staleTime: OTHER_PARTY_STALE_MS,
  })

/** 리포트 상세. 보낸 뒤 내용이 바뀌지 않는 행이라 목록과 달리 기본 staleTime 으로 둔다. */
export const doctorReportQuery = (reportId: string) =>
  queryOptions({
    queryKey: doctorLinkKeys.report(reportId),
    queryFn: () => doctorLinkService.getReport(reportId),
    enabled: !!reportId,
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
    staleTime: OTHER_PARTY_STALE_MS,
  })
