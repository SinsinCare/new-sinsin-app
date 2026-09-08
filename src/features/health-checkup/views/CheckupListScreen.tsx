import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 건강검진 목록 선택 (시안 My Page Home-12).
 *
 * ## 목록에서는 카운트를 모른다
 *
 * 시안의 "정상 2 · 주의 1" 은 `GET /health-check/results` 가 주지 않는 값이다.
 * 채우려면 회차마다 상세를 한 번씩 더 불러야 하고, 그게 정확히 옛 대시보드가
 * 하는 N+1 이다(느리고, 개별 실패를 삼켜서 "결과 없음" 처럼 보인다).
 * 그래서 지어내지 않고 **줄 자체를 그리지 않는다.** 나중에 서버가 실어 보내면
 * `readCheckupCounts` 가 읽어서 자동으로 나타난다.
 *
 * ## 정렬은 문자열이 아니라 숫자로
 *
 * `checkupDate` 는 `"2023.10.15"` 로 온다. `new Date("2023.10.15")` 는 Hermes 에서
 * `NaN` 이 될 수 있어(기존 목록 화면의 실제 버그) 숫자 키를 뽑아 비교한다.
 *
 * ## 선택은 데이터에서 파생한다
 *
 * 고른 id 를 그대로 들고 있으면, 목록이 다시 불려서 어떤 회차가 사라졌을 때
 * 화면에 없는 id 를 분석에 넘기게 된다. 매 렌더 현재 목록과 교집합을 낸다.
 */

import { useCallback, useMemo, useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"

import {
  V2BottomCTA,
  V2EmptyState,
  V2ErrorState,
  V2Skeleton,
  V2SkeletonGroup,
  V2ScreenHeader,
  spacing,
  typography,
  useLoadingVisible,
  useV2Theme,
} from "@/src/design-system-v2"
import { resolveError } from "@/src/lib/errorMessage"
import { useAppRouter } from "@/src/shared/navigation"
import type { HealthCheckResultsRs } from "@/src/types/nhis"

import { checkupResultsQuery } from "../data/checkupQueries"
import {
  CheckupListItem,
  checkupSortKey,
  formatCheckupMonthDay,
  formatCheckupSummary,
  formatCheckupYear,
  parseCheckupDate,
  readCheckupCounts,
} from "../components/CheckupListItem"

/** 화면 좌우 여백 — 배치 전체가 16 으로 맞춰져 있다. */
const SIDE = spacing[16]
/** 연도 섹션 사이의 회색 밴드. 시안(-12)의 회색 띠. */
const BAND_HEIGHT = 10

interface YearSection {
  /** 못 읽은 날짜는 0. 그때는 연도 제목을 비우고 방문 횟수만 남긴다(아래 렌더 참고). */
  year: number
  results: HealthCheckResultsRs[]
}

function groupByYear(results: HealthCheckResultsRs[]): YearSection[] {
  const byYear = new Map<number, HealthCheckResultsRs[]>()
  for (const result of results) {
    const year = parseCheckupDate(result.checkupDate)?.year ?? 0
    const bucket = byYear.get(year)
    if (bucket) bucket.push(result)
    else byYear.set(year, [result])
  }

  return [...byYear.entries()]
    .map(([year, bucketResults]) => ({
      year,
      results: [...bucketResults].sort(
        (a, b) => checkupSortKey(b.checkupDate) - checkupSortKey(a.checkupDate),
      ),
    }))
    .sort((a, b) => b.year - a.year)
}

export interface CheckupListScreenProps {
  onAnalyze?: (resultIds: number[]) => void
  onAdd?: () => void
  onOpenDetail?: (resultId: number) => void
}

export function CheckupListScreen({
  onAnalyze,
  onAdd,
  onOpenDetail,
}: CheckupListScreenProps) {
  const router = useAppRouter()
  const { t, i18n } = useTranslation("health")
  const { t: tCommon } = useTranslation("common")
  const { colors } = useV2Theme()

  const query = useQuery(checkupResultsQuery())
  const showSkeleton = useLoadingVisible(query.isLoading, {
    surface: "checkup_list",
  })

  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())
  const toggle = useCallback((resultId: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(resultId)) next.delete(resultId)
      else next.add(resultId)
      return next
    })
  }, [])

  const sections = useMemo(() => groupByYear(query.data ?? []), [query.data])

  // 분석에 넘길 id 는 화면에 실제로 있는 것만, 그리고 최신순 그대로.
  const selectedIds = useMemo(
    () =>
      sections
        .flatMap((section) => section.results)
        .map((result) => result.resultId)
        .filter((resultId) => checked.has(resultId)),
    [checked, sections],
  )

  const language = i18n.language

  if (query.isError) {
    // 재시도해도 같은 답이 오는 실패(404·권한)에는 버튼을 그리지 않는다. 누를 것을
    // 주면 사용자는 그게 통할 때까지 누른다.
    const resolved = resolveError(query.error)
    return (
      <View
        style={[styles.root, { backgroundColor: colors.background.default }]}
      >
        <V2ScreenHeader
          title={t("checkup.list.title")}
          onBack={() => router.back()}
        />
        {resolved.retryable ? (
          <V2ErrorState
            surface="checkup_list"
            style={styles.fill}
            title={resolved.title}
            description={resolved.body}
            onRetry={() => void query.refetch()}
            retryLabel={tCommon("action.retry")}
          />
        ) : (
          <V2ErrorState
            surface="checkup_list"
            style={styles.fill}
            title={resolved.title}
            description={resolved.body}
          />
        )}
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader
        title={t("checkup.list.title")}
        onBack={() => router.back()}
      />

      {showSkeleton ? (
        <V2SkeletonGroup style={styles.skeleton}>
          {[0, 1, 2].map((index) => (
            <V2Skeleton key={index} height={84} radius="2xl" />
          ))}
        </V2SkeletonGroup>
      ) : query.isPending ? (
        // `useLoadingVisible` 문턱(180ms) 안에 끝나는 빠른 응답 구간. 여기서 빈 상태를
        // 그리면 "검진이 없어요" 가 한 프레임 번쩍이고 곧바로 목록으로 바뀐다.
        <View style={styles.fill} />
      ) : sections.length === 0 ? (
        <V2EmptyState
          surface="checkup_list"
          style={styles.fill}
          title={t("checkup.list.emptyTitle")}
          description={t("checkup.list.emptyBody")}
          actionLabel={t("checkup.list.emptyCta")}
          onAction={onAdd}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section, index) => (
            <View key={section.year}>
              {/* 섹션 사이 회색 밴드는 좌우 여백 밖까지 꽉 차야 띠로 읽힌다. */}
              {index > 0 && (
                <View
                  style={[
                    styles.band,
                    { backgroundColor: colors.background.lower },
                  ]}
                />
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      typography.title.small,
                      { color: colors.label.normal },
                    ]}
                  >
                    {section.year > 0
                      ? formatCheckupYear(section.year, language)
                      : ""}
                  </Text>
                  <Text
                    style={[
                      typography.subtext.large,
                      { color: colors.label.alternative },
                    ]}
                  >
                    {t("checkup.list.visitCount", {
                      count: section.results.length,
                    })}
                  </Text>
                </View>

                {section.results.map((result) => {
                  const parts = parseCheckupDate(result.checkupDate)
                  const dateLabel = parts
                    ? formatCheckupMonthDay(parts, language)
                    : result.checkupDate
                  const title = result.checkupPlace
                    ? `${dateLabel} · ${result.checkupPlace}`
                    : dateLabel
                  const counts = readCheckupCounts(result)

                  return (
                    <CheckupListItem
                      key={result.resultId}
                      title={title}
                      accessibilityLabel={title}
                      summary={
                        counts == null
                          ? undefined
                          : formatCheckupSummary(counts, (status) =>
                              t(`checkup.status.${status}`),
                            )
                      }
                      selected={checked.has(result.resultId)}
                      onToggle={() => toggle(result.resultId)}
                      onOpenDetail={
                        onOpenDetail == null
                          ? undefined
                          : () => onOpenDetail(result.resultId)
                      }
                    />
                  )
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={{ backgroundColor: colors.background.default }}>
        {selectedIds.length === 0 && (
          <Text
            style={[
              typography.subtext.large,
              styles.hint,
              { color: colors.label.alternative },
            ]}
          >
            {t("checkup.list.selectHint")}
          </Text>
        )}
        <V2BottomCTA
          layout="horizontal"
          secondaryLabel={t("checkup.list.add")}
          onSecondary={() => onAdd?.()}
          primaryLabel={t("checkup.list.analyze")}
          onPrimary={() => onAnalyze?.(selectedIds)}
          primaryProps={{ disabled: selectedIds.length === 0 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: { paddingBottom: spacing[24] },
  section: {
    paddingHorizontal: SIDE,
    paddingTop: spacing[32],
    gap: spacing[12],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing[4],
  },
  band: { height: BAND_HEIGHT },
  skeleton: {
    paddingHorizontal: SIDE,
    paddingTop: spacing[32],
    gap: spacing[12],
  },
  hint: {
    paddingHorizontal: SIDE,
    paddingTop: spacing[12],
    textAlign: "center",
  },
})
