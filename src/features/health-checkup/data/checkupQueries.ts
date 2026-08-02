/**
 * 건강검진 불러오기·분석의 쿼리 키와 옵션.
 *
 * 기존 `src/features/health/data/healthQueries.ts` 와 **키를 나눈다.** 저쪽은 옛 대시보드가
 * 쓰는 `["health-check", ...]` 이고, 그 대시보드는 결과 목록을 받은 뒤 회차마다 상세를 한 번씩
 * 더 부르는 N+1 을 한다(그리고 개별 실패를 `.catch(() => null)` 로 삼켜서 전부 실패해도
 * "결과 없음" 으로 보인다). 새 화면은 그 경로를 쓰지 않는다 — 분석은 서버가 한 번에 한다.
 *
 * 분석 결과에 **로케일을 키에 넣는다**: 요약·추세 문장이 서버에서 ko/en 으로 갈리므로,
 * 언어를 바꾸고 돌아왔을 때 이전 언어의 문장이 캐시에서 나오면 안 된다.
 */

import { queryOptions } from "@tanstack/react-query"

import { getAppLanguage, type Language } from "@/src/i18n"
import { healthAnalysisService } from "@/src/services/data/healthAnalysisService"
import { nhisService } from "@/src/services/data/nhisService"

export const checkupKeys = {
  all: ["checkup"] as const,
  results: () => [...checkupKeys.all, "results"] as const,
  analysis: (resultIds: number[], locale: Language = getAppLanguage()) =>
    [
      ...checkupKeys.all,
      "analysis",
      // 선택 순서는 의미가 없다. 정렬해서 같은 집합이 같은 키가 되게 한다 —
      // 안 하면 [1,2] 와 [2,1] 이 서로 다른 캐시가 되어 같은 분석을 두 번 부른다.
      [...resultIds].sort((a, b) => a - b).join(","),
      locale,
    ] as const,
}

export const checkupResultsQuery = () =>
  queryOptions({
    queryKey: checkupKeys.results(),
    queryFn: () => nhisService.getHealthCheckResults(),
  })

export const checkupAnalysisQuery = (
  resultIds: number[],
  locale: Language = getAppLanguage(),
) =>
  queryOptions({
    queryKey: checkupKeys.analysis(resultIds, locale),
    queryFn: () => healthAnalysisService.analyze(resultIds),
    enabled: resultIds.length > 0,
    // 같은 회차 조합의 분석은 바뀌지 않는다. LLM 호출이 붙어 있으므로 다시 부르면 돈이 든다.
    staleTime: 10 * 60 * 1000,
  })
