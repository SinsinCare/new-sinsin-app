import { queryOptions, type QueryClient } from "@tanstack/react-query"

import { getAppLanguage, type Language } from "@/src/i18n"
import {
  healthDashboardKey,
  healthResultDetailKey,
} from "@/src/i18n/localeQueryKeys"
import { nhisService } from "@/src/services/data/nhisService"
import type { HealthCheckResultDetailRs } from "@/src/types/nhis"

export const healthQueryKeys = {
  all: ["health-check"] as const,
  results: () => [...healthQueryKeys.all, "results"] as const,
  detail: (resultId: string, locale: Language = getAppLanguage()) =>
    healthResultDetailKey(resultId, locale),
  dashboard: (locale: Language = getAppLanguage()) =>
    healthDashboardKey(locale),
}

export const healthResultsQueryOptions = () =>
  queryOptions({
    queryKey: healthQueryKeys.results(),
    queryFn: () => nhisService.getHealthCheckResults(),
  })

export const healthResultDetailQueryOptions = (
  resultId: string,
  locale: Language = getAppLanguage(),
) =>
  queryOptions({
    queryKey: healthQueryKeys.detail(resultId, locale),
    queryFn: () => nhisService.getHealthCheckResultById(resultId),
    enabled: !!resultId,
  })

export const healthDashboardQueryOptions = (
  locale: Language = getAppLanguage(),
) =>
  queryOptions({
    queryKey: healthQueryKeys.dashboard(locale),
    queryFn: async (): Promise<HealthCheckResultDetailRs[]> => {
      const results = await nhisService.getHealthCheckResults()
      const fetched = await Promise.all(
        results
          .filter((result) => !!result.checkupDate)
          .map((result) =>
            nhisService
              .getHealthCheckResultById(String(result.resultId))
              .catch(() => null),
          ),
      )

      return fetched
        .filter((detail): detail is HealthCheckResultDetailRs => detail != null)
        .sort(
          (a, b) =>
            new Date(a.checkupDate.replace(/\./g, "-")).getTime() -
            new Date(b.checkupDate.replace(/\./g, "-")).getTime(),
        )
    },
  })

/**
 * The import flow waits for fresh server data before opening the dashboard.
 * `fetchQuery` also covers the first visit, where no mounted query exists yet.
 */
export async function refreshHealthData(
  queryClient: QueryClient,
  locale: Language = getAppLanguage(),
) {
  await queryClient.invalidateQueries({ queryKey: healthQueryKeys.all })
  await queryClient.fetchQuery({
    ...healthDashboardQueryOptions(locale),
    staleTime: 0,
  })
}
