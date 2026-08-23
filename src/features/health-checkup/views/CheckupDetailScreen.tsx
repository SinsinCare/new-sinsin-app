/**
 * 검진 상세 — 탭 두 개(검진 목록 / 검사 기록).
 *
 * 시안: `My Page Home-8`(검진 목록) · `My Page Home-9`(검사 기록).
 *
 * ## 데이터는 한 번만 부른다
 * 두 탭이 같은 `checkupAnalysisQuery(resultIds)` 하나를 본다. 탭을 옮길 때마다 다시 부르면
 * 분석에 붙은 LLM 호출이 그때마다 돈이 된다 — 쿼리 키가 같으므로 캐시가 그대로 재사용된다.
 *
 * ## 라우팅을 하지 않는다
 * "질문하기" 는 상담 화면에 프롬프트를 주입하는 동작인데, 이 화면은 `onAskQuestion` 콜백만
 * 부르고 실제 이동은 라우트 층이 한다. 화면이 `router.push` 를 직접 부르면 이 컴포넌트가
 * 특정 경로에 묶여서 다른 진입점(마이페이지/홈)에서 재사용할 수 없다.
 *
 * ## 회차 드롭다운
 * 상단의 "2026년 10월" 은 **월 선택이 아니라 회차 선택**이다. 회차가 하나뿐이면 chevron 을
 * 그리지 않는다 — 눌러도 아무 일도 일어나지 않는 어포던스는 거짓말이다. 제목 자체는 회차가
 * 하나여도 남긴다(지금 보는 게 언제 검진인지 알아야 한다).
 */

import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"

import {
  GUTTER,
  V2BottomSheet,
  V2Button,
  V2Divider,
  V2EmptyState,
  V2Icon,
  V2Option,
  V2ScreenHeader,
  V2Tab,
  radius,
  spacing,
  typography,
  useLoadingVisible,
  useV2Theme,
} from "@/src/design-system-v2"
import type {
  AnalysisCounts,
  AnalysisMetric,
  TimelineItem,
} from "@/src/types/healthAnalysis"

import type {
  ExamConsultContext,
  ExamConsultMetric,
} from "@/src/features/consultation/utils/examConsultMessage"

import { checkupAnalysisQuery } from "../data/checkupQueries"
import { HighlightedProse } from "../components/HighlightedProse"
import { StatusBadge } from "../components/StatusBadge"
import { StatusSummaryTiles } from "../components/StatusSummaryTiles"
import { CheckupDetailTrendBanner } from "../components/CheckupDetailTrendBanner"
import {
  CheckupDetailAnalyzingState,
  CheckupDetailErrorState,
  CheckupDetailNoSelectionState,
} from "../components/CheckupDetailAnalysisStates"
import {
  checkupSortKey,
  formatCheckupDate,
  formatCheckupDelta,
  formatMetricHeadline,
  parseCheckupYmd,
} from "../components/CheckupDetailDates"

type CheckupDetailTab = "checkups" | "records"

export interface CheckupDetailScreenProps {
  /** 분석할 검진 회차 id. 비어 있으면 빈 상태를 그린다. */
  resultIds: number[]
  onBack?: () => void
  /**
   * 상담 화면에 넘길 **검진 컨텍스트**. 이동은 라우트 층이 한다(위 머리말 참고).
   *
   * 프롬프트 문자열이 아니라 수치를 통째로 넘긴다 — 문장만 보내면 모델이 "결과지를 아직
   * 보지 못했다" 고 되묻는다(상담 컨텍스트 빌더가 검사 수치를 주입하지 않는다).
   */
  onAskQuestion?: (context: ExamConsultContext) => void
  /** "월별보기" — 월별 캘린더 화면으로. */
  onOpenCalendar?: () => void
}

/** 회차 하나. 라벨은 "2026년 10월"(= 검진 월). */
interface CheckupRound {
  checkupDate: string
  label: string
}

export function CheckupDetailScreen({
  resultIds,
  onBack,
  onAskQuestion,
  onOpenCalendar,
}: CheckupDetailScreenProps) {
  const { t } = useTranslation("health")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

  const [tab, setTab] = useState<CheckupDetailTab>("checkups")
  const [roundSheetOpen, setRoundSheetOpen] = useState(false)
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  /** 정상 항목은 기본으로 접는다. 회차를 바꿔도 사용자가 편 상태는 유지한다. */
  const [normalExpanded, setNormalExpanded] = useState(false)

  const query = useQuery(checkupAnalysisQuery(resultIds))
  const analysis = query.data
  // 캐시가 살아 있으면 응답이 즉시 온다. 그때 스켈레톤을 깜빡이지 않게 하는 기존 관례.
  const showSkeleton = useLoadingVisible(
    query.isLoading && resultIds.length > 0,
    { surface: "checkup_detail" },
  )

  /**
   * 회차 목록은 **`timeline`** 에서 뽑는다.
   *
   * `metrics` 를 쓰면 안 된다 — 그건 "지표마다 **가장 최근** 값 하나" 라서 회차가 몇 개든
   * 날짜가 사실상 1종이다. 그러면 `rounds.length > 1` 이 영영 false 가 되어 시안의 회차
   * 드롭다운("2026년 10월" + chevron)이 **한 번도 안 나타난다.**
   * `timeline` 은 검진 회차당 한 줄이라 이게 정본이다.
   */
  const rounds = useMemo<CheckupRound[]>(() => {
    const byDate = new Map<string, CheckupRound>()
    for (const entry of analysis?.timeline ?? []) {
      if (byDate.has(entry.date)) continue
      const ymd = parseCheckupYmd(entry.date)
      byDate.set(entry.date, {
        checkupDate: entry.date,
        label: ymd
          ? t("checkup.calendar.yearMonth", {
              year: ymd.year,
              month: ymd.month,
            })
          : entry.date,
      })
    }
    return [...byDate.values()].sort((a, b) =>
      checkupSortKey(b.checkupDate).localeCompare(
        checkupSortKey(a.checkupDate),
      ),
    )
  }, [analysis, t])

  const hasManyRounds = rounds.length > 1
  // 사용자가 아직 안 골랐으면 최신 회차. `pickedDate` 가 목록에서 사라지는 경우(언어 전환 후
  // 재조회 등)도 최신으로 되돌린다.
  const activeRound =
    rounds.find((round) => round.checkupDate === pickedDate) ?? rounds[0]

  /**
   * 선택한 회차의 "건강 수치" 목록.
   *
   * `analysis.metrics` 를 날짜로 거르면 **안 된다.** 그 배열은 지표마다 가장 최근 값
   * 하나뿐이라, 이전 회차를 고르는 순간 목록이 통째로 빈다. 회차별 값은 `timeline` 에만 있다.
   *
   * `referenceText` 는 회차와 무관한 값(참고범위)이라 `metrics` 에서 지표 키로 빌려 온다.
   * 없으면 빈 문자열 — 참고범위를 지어내느니 안 보여 주는 게 낫다.
   */
  const visibleMetrics = useMemo<AnalysisMetric[]>(() => {
    const metrics = analysis?.metrics ?? []
    if (!hasManyRounds || !activeRound) return metrics

    const entry = analysis?.timeline.find(
      (row) => row.date === activeRound.checkupDate,
    )
    if (!entry) return []

    const referenceByKey = new Map(metrics.map((m) => [m.key, m.referenceText]))
    const resultIdByKey = new Map(metrics.map((m) => [m.key, m.resultId]))
    const order: Record<AnalysisMetric["status"], number> = {
      warning: 0,
      caution: 1,
      normal: 2,
    }
    return (
      entry.items
        .map((item) => ({
          key: item.key,
          label: item.label,
          value: item.value,
          unit: item.unit,
          status: item.status,
          referenceText: referenceByKey.get(item.key) ?? "",
          resultId: resultIdByKey.get(item.key) ?? 0,
          checkupDate: activeRound.checkupDate,
        }))
        // 서버가 metrics 를 정렬해 주는 것과 같은 규칙 — 문제 수치가 먼저 읽혀야 한다.
        .sort((a, b) => order[a.status] - order[b.status])
    )
  }, [analysis, hasManyRounds, activeRound])

  // 회차를 골라 목록을 걸러 놓고 타일만 전체 합계를 보여 주면 두 숫자가 서로를 부정한다.
  // 회차가 하나뿐일 때는 `analysis.counts` 와 값이 같으므로 서버가 준 값을 그대로 쓴다.
  const visibleCounts = useMemo<AnalysisCounts>(() => {
    if (!hasManyRounds) {
      return analysis?.counts ?? { warning: 0, caution: 0, normal: 0 }
    }
    return visibleMetrics.reduce<AnalysisCounts>(
      (acc, metric) => ({ ...acc, [metric.status]: acc[metric.status] + 1 }),
      { warning: 0, caution: 0, normal: 0 },
    )
  }, [analysis, hasManyRounds, visibleMetrics])

  /**
   * 문제(위험·주의)와 정상을 가른다.
   *
   * `visibleMetrics` 는 이미 위험 → 주의 → 정상 순으로 정렬돼 있으므로 상태로만 나누면
   * 각 묶음 안의 순서는 그대로 보존된다.
   */
  const problemMetrics = useMemo(
    () => visibleMetrics.filter((m) => m.status !== "normal"),
    [visibleMetrics],
  )
  const normalMetrics = useMemo(
    () => visibleMetrics.filter((m) => m.status === "normal"),
    [visibleMetrics],
  )

  // 서버 타임라인은 오래된 회차가 먼저다. 화면은 최신이 위.
  const timeline = useMemo(
    () => [...(analysis?.timeline ?? [])].reverse(),
    [analysis],
  )

  const toConsultMetric = (metric: AnalysisMetric): ExamConsultMetric => ({
    label: metric.label,
    value: metric.value,
    unit: metric.unit,
    status: metric.status,
    ...(metric.referenceText ? { referenceText: metric.referenceText } : {}),
  })

  /**
   * "질문하기" — 지금 보고 있는 회차의 수치를 그대로 보낸다.
   *
   * `visibleMetrics` 를 쓰는 이유: 회차를 골라 놓고 다른 회차 수치를 보내면 화면과 대화가
   * 어긋난다. 정렬(위험 → 주의 → 정상)도 그대로라 카드가 접힐 때 문제 수치가 남는다.
   */
  const askAboutAll = () =>
    onAskQuestion?.({
      ...(activeRound ? { checkupDate: activeRound.checkupDate } : {}),
      ...(activeRound ? { checkupDateLabel: activeRound.label } : {}),
      counts: visibleCounts,
      metrics: visibleMetrics.map(toConsultMetric),
    })

  /** 지표 한 줄을 눌렀을 때 — 그 항목만 담아 보낸다. 카드도 한 줄로 그려진다. */
  const askAboutMetric = (metric: AnalysisMetric) =>
    onAskQuestion?.({
      ...(activeRound ? { checkupDate: activeRound.checkupDate } : {}),
      ...(activeRound ? { checkupDateLabel: activeRound.label } : {}),
      metrics: [toConsultMetric(metric)],
    })

  const contentPadding = { paddingBottom: insets.bottom + spacing[32] }

  const body = () => {
    if (resultIds.length === 0) return <CheckupDetailNoSelectionState />
    if (showSkeleton) return <CheckupDetailAnalyzingState />
    if (query.isError)
      return (
        <CheckupDetailErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      )
    if (!analysis) return null

    if (tab === "checkups") {
      return (
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={contentPadding}
        >
          <View style={styles.section}>
            {activeRound != null &&
              (hasManyRounds ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRoundSheetOpen(true)}
                  hitSlop={spacing[8]}
                  style={({ pressed }) => [
                    styles.roundPicker,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      typography.title.small,
                      { color: colors.label.normal },
                    ]}
                  >
                    {activeRound.label}
                  </Text>
                  <V2Icon
                    name="chevronDown"
                    size="sm"
                    color={colors.label.alternative}
                  />
                </Pressable>
              ) : (
                <Text
                  style={[
                    typography.title.small,
                    { color: colors.label.normal },
                  ]}
                >
                  {activeRound.label}
                </Text>
              ))}

            <StatusSummaryTiles counts={visibleCounts} />

            <View>
              <View
                style={[
                  styles.proseSurface,
                  { backgroundColor: colors.fill.background },
                ]}
              >
                <HighlightedProse segments={analysis.summary.segments} />
              </View>
              {/* 진단이 아니라는 고지 — 요약 면 바깥에 둬야 "본문의 일부"로 읽히지 않는다. */}
              <Text
                style={[
                  typography.subtext.small,
                  styles.aiNotice,
                  { color: colors.label.alternative },
                ]}
              >
                {t("checkup.detail.aiNotice")}
              </Text>
            </View>
          </View>

          <V2Divider variant="thick" />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[typography.title.small, { color: colors.label.normal }]}
              >
                {t("checkup.detail.metricsTitle")}
              </Text>
              {onAskQuestion != null && (
                <V2Button
                  size="s"
                  color="neutral"
                  variant="weak"
                  onPress={askAboutAll}
                >
                  {t("checkup.detail.ask")}
                </V2Button>
              )}
            </View>

            <View style={styles.metricList}>
              {/*
                문제 수치가 먼저, 정상은 접는다.
                지표 13개를 그대로 늘어놓으면 "무엇을 봐야 하는가" 가 사라진다 — 이 화면에서
                사용자가 답을 원하는 질문은 "괜찮은가" 이고, 그 답은 벗어난 항목에만 있다.
                정상 항목을 지우지는 않는다(찾을 수 있어야 한다). 기본으로 안 보일 뿐이다.
              */}
              {problemMetrics.length === 0 && (
                <Text
                  style={[
                    typography.subtext.medium,
                    styles.allNormal,
                    { color: colors.label.alternative },
                  ]}
                >
                  {t("checkup.detail.allNormal")}
                </Text>
              )}
              {problemMetrics.map((metric) => (
                <MetricRow
                  key={`${metric.resultId}-${metric.key}`}
                  metric={metric}
                  onPress={
                    onAskQuestion != null
                      ? () => askAboutMetric(metric)
                      : undefined
                  }
                />
              ))}
              {normalMetrics.length > 0 && (
                <>
                  {normalExpanded &&
                    normalMetrics.map((metric) => (
                      <MetricRow
                        key={`${metric.resultId}-${metric.key}`}
                        metric={metric}
                        onPress={
                          onAskQuestion != null
                            ? () => askAboutMetric(metric)
                            : undefined
                        }
                      />
                    ))}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setNormalExpanded((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.disclosure,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        typography.label.small,
                        { color: colors.label.alternative },
                      ]}
                    >
                      {normalExpanded
                        ? t("checkup.detail.hideNormal")
                        : t("checkup.detail.showNormal", {
                            count: normalMetrics.length,
                          })}
                    </Text>
                    <V2Icon
                      name={normalExpanded ? "chevronDown" : "chevronRight"}
                      size={16}
                      color={colors.label.assistive}
                    />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      )
    }

    if (timeline.length === 0) {
      return (
        <V2EmptyState
          surface="checkup_detail"
          icon="report"
          title={t("checkup.records.emptyTitle")}
          style={styles.state}
        />
      )
    }

    return (
      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={contentPadding}
      >
        {/* 검진이 2회 미만이면 추세를 말할 수 없어 서버가 null 을 준다 → 배너 자체를 그리지 않는다. */}
        {analysis.trendInsight != null && (
          <CheckupDetailTrendBanner segments={analysis.trendInsight.segments} />
        )}

        {timeline.map((entry, index) => (
          <View key={entry.date}>
            {/* 그룹 사이 헤어라인. 좌우 여백 밖에 둬야 시안처럼 화면 끝까지 간다. */}
            {index > 0 && <V2Divider tone="alternative" />}
            <View style={styles.timelineGroup}>
              <Text
                style={[
                  typography.label.medium,
                  {
                    color: entry.isLatest
                      ? colors.label.normal
                      : colors.label.alternative,
                  },
                ]}
              >
                {formatCheckupDate(entry.date)}
                {entry.isLatest ? ` | ${t("checkup.records.latest")}` : ""}
              </Text>

              {/*
                회차마다 지표가 13개다. 회차가 셋이면 39줄이 되어 스크롤만 남는다.
                검진 목록 탭과 같은 규칙으로 문제 수치를 먼저 보이고 정상은 접는다 —
                두 탭이 다른 규칙을 쓰면 같은 데이터가 화면마다 다르게 보인다.
              */}
              <TimelineGroupItems items={entry.items} />
            </View>
          </View>
        ))}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      {/*
        제목과 우측 액션이 탭에 따라 갈리는 건 시안 그대로다(-8 은 "검진 목록" 제목만,
        -9 는 제목 없이 "월별보기" 만). 검사 기록 탭에서 제목을 지우는 이유는 선택된 탭 라벨이
        바로 아래에 굵게 있어서, 같은 줄에 제목까지 두면 제목이 두 개로 읽히기 때문이다.
      */}
      <V2ScreenHeader
        title={tab === "checkups" ? t("checkup.detail.title") : undefined}
        onBack={onBack}
        right={
          tab === "records" && onOpenCalendar != null ? (
            <Pressable
              accessibilityRole="button"
              onPress={onOpenCalendar}
              hitSlop={spacing[8]}
              style={({ pressed }) => [
                styles.headerAction,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  typography.label.small,
                  { color: colors.label.alternative },
                ]}
              >
                {t("checkup.records.monthlyView")}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {resultIds.length > 0 && (
        <V2Tab
          items={[
            { label: t("checkup.detail.tabCheckups"), value: "checkups" },
            { label: t("checkup.detail.tabRecords"), value: "records" },
          ]}
          value={tab}
          onChange={(next) => setTab(next as CheckupDetailTab)}
        />
      )}

      {body()}

      <V2BottomSheet
        surface="checkup_round_picker"
        visible={roundSheetOpen}
        onClose={() => setRoundSheetOpen(false)}
      >
        <View style={styles.sheetList}>
          {rounds.map((round) => (
            <V2Option
              key={round.checkupDate}
              label={round.label}
              selected={round.checkupDate === activeRound?.checkupDate}
              onPress={() => {
                setPickedDate(round.checkupDate)
                setRoundSheetOpen(false)
              }}
            />
          ))}
        </View>
      </V2BottomSheet>
    </View>
  )
}

/**
 * 건강 수치 한 줄.
 *
 * 보더가 아니라 **면**으로 구획한다(`fill.background`). 이 화면의 다른 블록(요약 타일,
 * AI 요약 카드)이 전부 같은 면을 쓰고 있어서, 여기만 흰 배경 + 얇은 테두리면 목록이
 * 화면에서 따로 논다. 보더리스는 이 앱의 규칙이기도 하다.
 */
function MetricRow({
  metric,
  onPress,
}: {
  metric: AnalysisMetric
  onPress?: () => void
}) {
  const { colors } = useV2Theme()
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.metricCard,
        { backgroundColor: colors.fill.background },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.metricRow}>
        <Text
          style={[
            typography.body.mediumStrong,
            styles.metricLabel,
            { color: colors.label.normal },
          ]}
        >
          {formatMetricHeadline(metric.label, metric.value, metric.unit)}
        </Text>
        <StatusBadge status={metric.status} />
      </View>
    </Pressable>
  )
}

/**
 * 한 회차의 지표들. 문제 수치가 먼저, 정상은 접는다.
 *
 * 접힘 상태를 회차마다 따로 들고 있다 — 화면 전체를 한 스위치로 묶으면 아래쪽 회차를 펴려다
 * 위쪽까지 열려서 스크롤 위치가 튄다.
 */
function TimelineGroupItems({ items }: { items: readonly TimelineItem[] }) {
  const { t } = useTranslation("health")
  const { colors } = useV2Theme()
  const [expanded, setExpanded] = useState(false)

  const problems = items.filter((item) => item.status !== "normal")
  const normals = items.filter((item) => item.status === "normal")

  return (
    <>
      {problems.length === 0 && (
        <Text
          style={[
            typography.subtext.medium,
            styles.allNormal,
            { color: colors.label.alternative },
          ]}
        >
          {t("checkup.detail.allNormal")}
        </Text>
      )}
      {problems.map((item) => (
        <TimelineRow key={item.key} item={item} />
      ))}
      {expanded &&
        normals.map((item) => <TimelineRow key={item.key} item={item} />)}
      {normals.length > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((prev) => !prev)}
          style={({ pressed }) => [
            styles.disclosure,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              typography.label.small,
              { color: colors.label.alternative },
            ]}
          >
            {expanded
              ? t("checkup.detail.hideNormal")
              : t("checkup.detail.showNormal", { count: normals.length })}
          </Text>
          <V2Icon
            name={expanded ? "chevronDown" : "chevronRight"}
            size={16}
            color={colors.label.assistive}
          />
        </Pressable>
      )}
    </>
  )
}

/**
 * 타임라인 한 줄.
 *
 * **델타에 색을 칠하지 않는다.** 시안은 `+ 9.0` 을 오렌지로 그렸지만, 이 앱에서 코랄은
 * CTA·활성 전용이라 목록 한복판의 숫자가 오렌지면 누를 것처럼 읽힌다. 게다가 검사 기록
 * 화면에서는 증가한 지표가 대여섯 개라 화면이 오렌지 점으로 얼룩진다.
 * 방향은 부호(+/-)가 이미 말하고, 좋고 나쁨은 옆의 상태 배지가 말한다 —
 * 색까지 얹으면 같은 정보를 세 번 말하면서 그중 하나는 반드시 틀린다
 * (eGFR 은 올라가는 게 좋고 크레아티닌은 내려가는 게 좋다).
 */
function TimelineRow({ item }: { item: TimelineItem }) {
  const { t } = useTranslation("health")
  const { colors } = useV2Theme()

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRowBody}>
        <Text
          style={[typography.body.mediumStrong, { color: colors.label.normal }]}
        >
          {formatMetricHeadline(item.label, item.value, item.unit)}
        </Text>
        {/* 직전 검진이 없으면 delta 가 null 이다 — 비교 대상이 없으므로 줄 자체를 생략한다. */}
        {item.delta != null && (
          <Text
            style={[
              typography.subtext.medium,
              { color: colors.label.alternative },
            ]}
          >
            {`${t("checkup.records.deltaLabel")} `}
            {formatCheckupDelta(item.delta, item.deltaDirection)}
          </Text>
        )}
      </View>
      <StatusBadge status={item.status} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerAction: { paddingHorizontal: spacing[8], paddingVertical: spacing[4] },
  pressed: { opacity: 0.6 },
  state: { paddingTop: spacing[32] },

  section: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing[20],
    paddingBottom: spacing[20],
    gap: spacing[16],
  },
  roundPicker: { flexDirection: "row", alignItems: "center", gap: spacing[6] },
  proseSurface: { padding: spacing[16], borderRadius: radius.lg },
  aiNotice: { marginTop: spacing[8] },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  metricList: { gap: spacing[12] },
  metricCard: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[20],
    borderRadius: radius.lg,
  },
  allNormal: { paddingVertical: spacing[8] },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    paddingVertical: spacing[16],
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  metricLabel: { flexShrink: 1 },

  timelineGroup: {
    paddingHorizontal: GUTTER,
    paddingVertical: spacing[20],
    gap: spacing[16],
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  timelineRowBody: { flexShrink: 1, gap: spacing[2] },

  sheetList: { gap: spacing[8] },
})
