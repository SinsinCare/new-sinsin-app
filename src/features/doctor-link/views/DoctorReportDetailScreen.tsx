/**
 * 담당의 리포트 — 의사가 콘솔에서 보낸 리포트 한 건의 전체 화면.
 *
 * 공유 설정 화면 아래의 작은 카드가 이 화면으로 온다. 구조는 UX 시안(report.png)을 따르되
 * 색은 우리 규칙이다: **브랜드 주황은 CTA · D-day 칩 · 한마디 카드의 틴트 세 자리뿐**이고
 * 나머지는 전부 무채색이다. 검사 배지는 "살펴봐요" 만 노랑(weak)으로 눈에 띄고 "좋아요" 는
 * 회색이다 — 좋은 상태까지 색을 주면 화면이 알록달록해져서 정작 봐야 할 줄이 묻힌다.
 *
 * 카드가 사라지는 규칙(없는 것을 빈 카드로 그리지 않는다):
 *  - 한마디: 코멘트가 비면 숨김(과제만 보낸 리포트가 실재한다).
 *  - 검사: `includeSummary` 가 꺼졌거나 패널이 없으면 숨김. 값이 null 인 줄은 뺀다.
 *  - 실천 약속: 과제가 없으면 숨기고 CTA 는 "확인" 이 된다.
 *  - 다음 진료: 서버가 고른 일정이 없으면 숨김.
 *
 * 체크 상태는 기기에만 남는다(`reportTaskChecks.ts` 머리말). 캡션이 그 이상을 약속하지 않는다.
 */

import { useCallback, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import Toast from "react-native-toast-message"

import { resolveError } from "@/src/lib/errorMessage"
import { getAppLanguage } from "@/src/i18n"
import {
  V2Badge,
  V2BottomCTA,
  V2Checkbox,
  V2ErrorState,
  V2ScreenHeader,
  V2Skeleton,
  V2SkeletonGroup,
  V2Text,
  radius,
  spacing,
  useLoadingVisible,
  useV2Theme,
} from "@/src/design-system-v2"
import type {
  DoctorReportDetail,
  DoctorReportLimits,
} from "@/src/types/doctorLink"

import { doctorReportQuery } from "../data/doctorLinkQueries"
import {
  daysUntil,
  nextVisitDate,
  parseServerTimestamp,
  readLabPanels,
  windowWeeksOf,
  type LabReading,
} from "../data/reportReadings"
import { useReportTaskChecks } from "../data/reportTaskChecks"

function localeTag(): string {
  return getAppLanguage() === "en" ? "en-US" : "ko-KR"
}

/** "8월 9일 토요일" / "Saturday, August 9". */
function formatDayWithWeekday(date: Date): string {
  return new Intl.DateTimeFormat(localeTag(), {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date)
}

function formatAmount(value: number, unit: string): string {
  return `${new Intl.NumberFormat(localeTag()).format(value)}${unit}`
}

const LAB_TITLE_KEY = {
  egfr: "doctorLink.report.labEgfr",
  potassium: "doctorLink.report.labPotassium",
  phosphorus: "doctorLink.report.labPhosphorus",
} as const satisfies Record<LabReading["key"], string>

/** 하루 목표 줄의 순서와 단위. 시안 순서 그대로(칼륨·나트륨·인·단백질·수분). */
const LIMIT_ROWS = [
  { key: "potassiumMg", labelKey: "doctorLink.report.limitPotassium", unit: "mg" },
  { key: "sodiumMg", labelKey: "doctorLink.report.limitSodium", unit: "mg" },
  { key: "phosphorusMg", labelKey: "doctorLink.report.limitPhosphorus", unit: "mg" },
  { key: "proteinG", labelKey: "doctorLink.report.limitProtein", unit: "g" },
  { key: "fluidMl", labelKey: "doctorLink.report.limitFluid", unit: "mL" },
] as const satisfies ReadonlyArray<{
  key: keyof DoctorReportLimits
  labelKey: string
  unit: string
}>

export function DoctorReportDetailScreen({
  reportId,
  onBack,
}: {
  reportId: string
  onBack?: () => void
}) {
  const { t } = useTranslation(["settings", "common"])
  const { colors } = useV2Theme()

  const report = useQuery(doctorReportQuery(reportId))
  const showLoading = useLoadingVisible(report.isLoading, {
    surface: "doctor_sharing",
  })
  const failure = report.isError ? resolveError(report.error) : null

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader title={t("doctorLink.report.title")} onBack={onBack} />

      {failure ? (
        failure.retryable ? (
          <V2ErrorState
            surface="doctor_sharing"
            tone="quiet"
            title={failure.title}
            description={failure.body}
            onRetry={() => void report.refetch()}
            retryLabel={t("common:action.retry")}
            style={styles.state}
          />
        ) : (
          <V2ErrorState
            surface="doctor_sharing"
            title={failure.title}
            description={failure.body}
            style={styles.state}
          />
        )
      ) : report.data ? (
        <ReportBody report={report.data} onBack={onBack} />
      ) : showLoading ? (
        <ReportSkeleton />
      ) : null}
    </View>
  )
}

/* ══════════════════════════ 본문 ══════════════════════════ */

function ReportBody({
  report,
  onBack,
}: {
  report: DoctorReportDetail
  onBack?: () => void
}) {
  const { t } = useTranslation(["settings"])
  const { colors } = useV2Theme()
  const tasks = useReportTaskChecks(report.id)
  const [saving, setSaving] = useState(false)

  const sentAt = parseServerTimestamp(report.sentAt)
  const weeks = windowWeeksOf(report.windowDays)
  const subline = [
    sentAt ? formatDayWithWeekday(sentAt) : null,
    weeks === null ? null : t("doctorLink.report.windowWeeks", { count: weeks }),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ")

  const chip = [report.doctor?.organizationName, report.doctor?.department]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .join(" ")

  const comment = report.comment.trim()
  const readings = useMemo(
    () => (report.includeSummary ? readLabPanels(report.labs) : []),
    [report.includeSummary, report.labs],
  )
  const limitRows = LIMIT_ROWS.filter((row) => report.limits[row.key] !== null)
  const visit = nextVisitDate(report.nextVisit)
  const hasTasks = report.tasks.length > 0

  /** D-n · D-DAY · D+n. 자정 기준이라 시각은 무관하다(`daysUntil`). */
  const ddayLabel = (days: number): string => {
    if (days === 0) return t("doctorLink.report.ddayToday")
    if (days > 0) return t("doctorLink.report.dday", { count: days })
    return t("doctorLink.report.ddayPast", { count: -days })
  }

  /**
   * CTA. 아무것도 안 골랐으면 전부 체크한 것으로 저장한다 — "시작하기" 를 눌렀는데
   * 빈 채로 남으면 사용자는 무엇이 시작됐는지 모른다. 골라 둔 것이 있으면 그대로다.
   */
  const startTasks = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const next =
        tasks.checked.size === 0
          ? new Set(report.tasks.map((_, index) => index))
          : undefined
      await tasks.persist(next)
      Toast.show({ type: "success", text1: t("doctorLink.report.saved") })
      onBack?.()
    } catch {
      // 저장 실패는 조용히 넘기지 않는다 — 화면에 남아 다시 누를 수 있게 둔다.
      setSaving(false)
    }
  }, [onBack, report.tasks, saving, t, tasks])

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 머리 ── */}
        <View style={styles.head}>
          {chip.length > 0 && (
            <View style={styles.chipRow}>
              <V2Badge size="s" color="neutral" variant="weak" shape="pill">
                {chip}
              </V2Badge>
            </View>
          )}
          <V2Text token="title.medium" color={colors.label.normal}>
            {report.doctor
              ? t("doctorLink.report.headline", { name: report.doctor.name })
              : t("doctorLink.report.headlineNoDoctor")}
          </V2Text>
          {subline.length > 0 && (
            <V2Text token="subtext.medium" color={colors.label.alternative}>
              {subline}
            </V2Text>
          )}
        </View>

        {/* ── 선생님의 한마디 (브랜드 틴트는 이 카드뿐) ── */}
        {comment.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.primary.primaryWeak },
            ]}
          >
            <View style={styles.commentTitleRow}>
              <View
                style={[
                  styles.commentMark,
                  { backgroundColor: colors.primary.primary },
                ]}
              />
              <V2Text token="title.xSmall" color={colors.label.normal}>
                {t("doctorLink.report.commentTitle")}
              </V2Text>
            </View>
            <V2Text token="body.mediumWeak" color={colors.label.normal}>
              {comment}
            </V2Text>
          </View>
        )}

        {/* ── 이번 검사, 쉽게 보기 ── */}
        {readings.length > 0 && (
          <View
            style={[styles.card, { backgroundColor: colors.background.lower }]}
          >
            <V2Text token="title.xSmall" color={colors.label.normal}>
              {t("doctorLink.report.labsTitle")}
            </V2Text>
            {/*
              줄마다 같은 격자: 왼쪽 제목·수치, 오른쪽 배지 열(세로로 맞춰 떨어진다). 배지를
              제목 뒤에 이어 붙이면 제목 길이에 따라 배지가 들쭉날쭉했다(2026-09-11 피드백).
              수치 줄은 "42 mL/min · 지난번 45" — 문장만으로는 얼마나인지 알 수 없다.
            */}
            <View style={styles.labList}>
              {readings.map((reading, index) => (
                <View
                  key={reading.key}
                  style={[
                    styles.labRow,
                    index > 0 && [styles.labRowDivided, { borderTopColor: colors.line.normal }],
                  ]}
                >
                  <View style={styles.labHead}>
                    <View style={styles.labHeadText}>
                      <V2Text token="body.mediumStrong" color={colors.label.normal}>
                        {t(LAB_TITLE_KEY[reading.key])}
                      </V2Text>
                      <V2Text token="subtext.small" color={colors.label.alternative}>
                        {t("doctorLink.report.labValue", {
                          value: formatLabValue(reading.value),
                          unit: reading.unit,
                        })}
                        {reading.previous !== null
                          ? ` · ${t("doctorLink.report.labPrevious", { value: formatLabValue(reading.previous) })}`
                          : ""}
                      </V2Text>
                    </View>
                    <V2Badge
                      size="s"
                      color={reading.verdict === "watch" ? "yellow" : "neutral"}
                      variant="weak"
                    >
                      {reading.verdict === "watch"
                        ? t("doctorLink.report.badgeWatch")
                        : t("doctorLink.report.badgeGood")}
                    </V2Badge>
                  </View>
                  <V2Text token="subtext.medium" color={colors.label.neutral}>
                    {t(`doctorLink.report.${reading.messageKey}`)}
                  </V2Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── 선생님과 약속한 실천 ── */}
        {hasTasks && (
          <View
            style={[styles.card, { backgroundColor: colors.background.lower }]}
          >
            <V2Text token="title.xSmall" color={colors.label.normal}>
              {t("doctorLink.report.tasksTitle", { count: report.tasks.length })}
            </V2Text>
            <View style={styles.taskList}>
              {report.tasks.map((task, index) => {
                const checked = tasks.checked.has(index)
                return (
                  <Pressable
                    key={`${report.id}-${index}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={task}
                    onPress={() => tasks.toggle(index)}
                    style={({ pressed }) => [
                      styles.taskRow,
                      pressed && { backgroundColor: colors.fill.pressed },
                    ]}
                  >
                    <View
                      style={[
                        styles.taskNumber,
                        { backgroundColor: colors.fill.normal },
                      ]}
                    >
                      <V2Text token="label.smallStrong" color={colors.label.neutral}>
                        {String(index + 1)}
                      </V2Text>
                    </View>
                    <V2Text
                      token="body.mediumWeak"
                      color={colors.label.normal}
                      style={styles.taskText}
                    >
                      {task}
                    </V2Text>
                    {/* 줄 전체가 누르는 자리라 상자 자신은 터치를 받지 않는다(재료 목록과 같은 패턴). */}
                    <V2Checkbox
                      checked={checked}
                      size="m"
                      pointerEvents="none"
                      importantForAccessibility="no"
                    />
                  </Pressable>
                )
              })}
            </View>
            <V2Text token="subtext.small" color={colors.label.alternative}>
              {t("doctorLink.report.tasksCaption")}
            </V2Text>
          </View>
        )}

        {/* ── 하루 식사 목표 ── */}
        {limitRows.length > 0 && (
          <View
            style={[styles.card, { backgroundColor: colors.background.lower }]}
          >
            <V2Text token="title.xSmall" color={colors.label.normal}>
              {t("doctorLink.report.limitsTitle")}
            </V2Text>
            <View style={styles.limitList}>
              {limitRows.map((row) => {
                const value = report.limits[row.key]
                if (value === null) return null
                return (
                  <View key={row.key} style={styles.limitRow}>
                    <V2Text token="body.mediumWeak" color={colors.label.neutral}>
                      {t(row.labelKey)}
                    </V2Text>
                    <V2Text token="body.mediumStrong" color={colors.label.normal}>
                      {formatAmount(value, row.unit)}
                    </V2Text>
                  </View>
                )
              })}
            </View>
            <V2Text token="subtext.small" color={colors.label.alternative}>
              {t("doctorLink.report.limitsCaption")}
            </V2Text>
          </View>
        )}

        {/* ── 다음 진료 ── */}
        {visit && (
          <View
            style={[
              styles.card,
              styles.visitCard,
              { backgroundColor: colors.background.lower },
            ]}
          >
            <View style={styles.visitText}>
              <V2Text token="subtext.medium" color={colors.label.alternative}>
                {report.nextVisit?.label.trim() || t("doctorLink.report.nextVisitTitle")}
              </V2Text>
              <V2Text token="title.xSmall" color={colors.label.normal}>
                {[formatDayWithWeekday(visit.date), visit.time]
                  .filter((part): part is string => part !== null)
                  .join(" ")}
              </V2Text>
            </View>
            <V2Badge size="l" color="brand" variant="fill" shape="pill">
              {ddayLabel(daysUntil(visit.date))}
            </V2Badge>
          </View>
        )}
      </ScrollView>

      <V2BottomCTA
        primaryLabel={
          hasTasks
            ? t("doctorLink.report.startTasks")
            : t("doctorLink.report.confirm")
        }
        onPrimary={() => {
          if (hasTasks) void startTasks()
          else onBack?.()
        }}
        primaryProps={{
          loading: saving,
          disabled: hasTasks && tasks.isLoading,
        }}
      />
    </>
  )
}

/** 머리 세 줄 + 카드 두 장의 리듬. 링 스피너는 쓰지 않는다(로딩 규칙). */
function ReportSkeleton() {
  return (
    <V2SkeletonGroup style={styles.content}>
      <View style={styles.head}>
        <V2Skeleton width={120} height={22} radius="full" />
        <V2Skeleton width="80%" height={28} />
        <V2Skeleton width="60%" height={28} />
        <V2Skeleton width={160} height={14} />
      </View>
      <V2Skeleton height={148} radius="2xl" />
      <V2Skeleton height={220} radius="2xl" />
    </V2SkeletonGroup>
  )
}

/** 검사 수치 표기 — 정수는 그대로, 소수는 한 자리(칼륨 5.2·인 4.1). */
function formatLabValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  state: {
    paddingVertical: spacing[32],
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[8],
    paddingBottom: spacing[32],
    gap: spacing[16],
  },
  head: {
    gap: spacing[8],
    paddingBottom: spacing[8],
  },
  chipRow: {
    flexDirection: "row",
  },
  card: {
    borderRadius: radius["2xl"],
    padding: spacing[20],
    gap: spacing[16],
  },
  commentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  commentMark: {
    width: 12,
    height: 12,
    borderRadius: radius.xs,
  },
  labList: {
    marginTop: spacing[4],
  },
  labRow: {
    gap: spacing[8],
    paddingVertical: spacing[12],
  },
  labRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  labHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  labHeadText: {
    flex: 1,
    gap: spacing[2],
  },
  taskList: {
    gap: spacing[4],
    // 줄의 눌림 면이 카드 안쪽 여백까지 닿게 좌우로 당긴다.
    marginHorizontal: -spacing[8],
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    minHeight: 48,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[6],
    borderRadius: radius.md,
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  taskText: {
    flex: 1,
  },
  limitList: {
    gap: spacing[12],
  },
  limitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  visitCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visitText: {
    flex: 1,
    gap: spacing[4],
  },
})
