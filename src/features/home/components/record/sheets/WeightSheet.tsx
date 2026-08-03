import { useEffect, useMemo, useState } from "react"
import { RecordSheetShell } from "./RecordSheetShell"
import {
  SheetInfoCard,
  SheetStatRow,
  SheetStepper,
  SheetTrendBars,
  SheetValueDisplay,
  type SheetTrendPoint,
} from "./recordSheetControls"
import { decreaseWeight, increaseWeight } from "../../../utils/adjustWeight"
import { addDaysToDateStr } from "../../../hooks/useWeightWeek"
import type { SheetNumberSpec } from "../../../utils/sheetNumberInput"
import type { DateAnalysisBodyRecord } from "@/src/types"
import type { WeightRangeRecord } from "@/src/types/weightEdema"
import { useTranslation } from "react-i18next"

/** CTA 의 유효 범위(0 초과 300 이하)와 같은 경계를 쓴다 — 칠 수 있는 값과 저장할 수 있는 값이 어긋나면 안 된다. */
const WEIGHT_INPUT: SheetNumberSpec = { min: 0.1, max: 300, decimals: 1 }

/** 하루 사이 ±0.05kg 미만은 같은 값으로 본다(0.1kg 단위 반올림 노이즈). */
const SAME_EPSILON = 0.05

interface WeightSheetProps {
  visible: boolean
  onClose: () => void
  today: DateAnalysisBodyRecord | null
  previous: DateAnalysisBodyRecord | null
  /** 선택 날짜로 끝나는 7일 창의 기록(서버 GET /weight-records). 로딩 중엔 undefined. */
  week: WeightRangeRecord[] | undefined
  /** 7일 창의 끝 날짜("YYYY-MM-DD"). 추세 축 라벨과 창 계산에 쓴다. */
  endDate: string
  /** endDate 가 실제 오늘인지 — 축 오른쪽 라벨("오늘")을 정직하게 쓰기 위해. */
  isToday: boolean
  isSaving: boolean
  onSubmit: (weightKg: number) => void
}

/**
 * 체중 기록 시트 — 시트 시안(2026-08-03).
 *
 * 하루 사이 체중 변화는 지방이 아니라 거의 전부 수분이다. 그래서 단일 값이
 * 아니라 **7일 추세**를 함께 보여주고, "이틀 연속" 같은 흐름이 잡혔을 때만
 * 행동 지시("진료 때 알려주세요")를 낸다 — 단일 값의 노이즈에 반응하지 않는다.
 * 어제와의 차이만 계산하고 원인이나 진료 시점을 추정하지 않는 원칙은 그대로다.
 */
export function WeightSheet({
  visible,
  onClose,
  today,
  previous,
  week,
  endDate,
  isToday,
  isSaving,
  onSubmit,
}: WeightSheetProps) {
  const { t, i18n } = useTranslation("common")
  const english = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
  const formatWeight = (value: number) =>
    `${value.toFixed(1)}${english ? " " : ""}kg`
  const [weight, setWeight] = useState<number | null>(null)
  /** 치는 도중의 값 — 추세의 오늘 막대와 CTA 가 키 입력마다 응답한다. */
  const [preview, setPreview] = useState<number | null>(null)

  const previousWeight = previous?.weightKg ?? null

  useEffect(() => {
    if (!visible) return
    setWeight(today?.weightKg ?? null)
    setPreview(null)
  }, [today, visible])

  const liveWeight = preview ?? weight

  /**
   * ± 의 출발점으로 쓸 **마지막으로 아는 체중**. 7일 창(`week`)에서 선택 날짜보다
   * 앞선 기록 중 가장 최근 것을 고른다.
   *
   * `previous`(바로 어제)만 보던 시절에는 하루라도 걸러 재면 그 값이 `null` 이라
   * 곧바로 상수 60 으로 떨어졌다 — 62kg 인 사람이 +를 누르면 60.1 이 나오는
   * 상태였고, 사용자에게는 "기본이 60 으로 고정" 으로 보였다(2026-08-04 보고).
   * 지어낸 숫자보다 **그 사람의 마지막 기록**에서 출발하는 것이 언제나 낫다.
   */
  const lastKnownWeight = useMemo(() => {
    const past = (week ?? [])
      .filter((record) => record.recordDate < endDate)
      .sort((a, b) => (a.recordDate < b.recordDate ? 1 : -1))
    return (
      past.find((record) => typeof record.weightKg === "number")?.weightKg ??
      null
    )
  }, [week, endDate])

  /** ± 를 누른 횟수. 수치 표시가 "치던 문자열을 버릴 때" 를 아는 신호다. */
  const [stepEpoch, setStepEpoch] = useState(0)

  const adjust = (fn: (current: number) => number) => {
    /* 마지막 수단의 60 은 "아무 기록도 없는 첫 사용자" 전용이다. 그 앞의 세
       단계(치던 값 → 어제 → 최근 기록)가 거의 항상 먼저 잡힌다. */
    const base = liveWeight ?? previousWeight ?? lastKnownWeight ?? 60
    setWeight(Number(fn(base).toFixed(1)))
    setPreview(null)
    setStepEpoch((current) => current + 1)
  }

  // ── 7일 창을 날짜별로 편다. 오늘 칸은 지금 고르는 값이 실시간 반영된다. ──
  const byDate = new Map(
    (week ?? []).map((record) => [record.recordDate, record.weightKg]),
  )
  const trendPoints: SheetTrendPoint[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysToDateStr(endDate, i - 6)
    if (i === 6) return { value: liveWeight, live: true }
    return { value: byDate.get(date) ?? null }
  })
  const pastValues = trendPoints
    .slice(0, 6)
    .map((point) => point.value)
    .filter((value): value is number => value !== null)
  const baseline =
    pastValues.length > 0
      ? Number(
          (
            pastValues.reduce((sum, value) => sum + value, 0) /
            pastValues.length
          ).toFixed(1),
        )
      : null

  const startDate = addDaysToDateStr(endDate, -6)
  const [, startMonth, startDay] = startDate.split("-").map(Number)
  const [, endMonth, endDay] = endDate.split("-").map(Number)

  // ── 비교와 안내. "이틀 연속"은 실제 데이터(어제 vs 그제)로만 말한다. ──
  const diff =
    liveWeight !== null && previousWeight !== null
      ? liveWeight - previousWeight
      : null
  const diffText =
    diff === null
      ? "—"
      : Math.abs(diff) < SAME_EPSILON
        ? formatWeight(0)
        : `${diff > 0 ? "+" : "−"}${formatWeight(Math.abs(diff))}`

  const dayBeforeWeight = byDate.get(addDaysToDateStr(endDate, -2)) ?? null
  const yesterdayRose =
    previousWeight !== null &&
    dayBeforeWeight !== null &&
    previousWeight - dayBeforeWeight >= SAME_EPSILON

  const info = (() => {
    if (diff === null) return t("home.sheet.weight.noComparisonInfo")
    if (diff >= SAME_EPSILON) {
      const amount = formatWeight(Math.abs(diff))
      return yesterdayRose
        ? t("home.sheet.weight.guidanceUpStreak", { amount })
        : t("home.sheet.weight.guidanceUp", { amount })
    }
    if (diff <= -SAME_EPSILON) {
      return t("home.sheet.weight.guidanceDown", {
        amount: formatWeight(Math.abs(diff)),
      })
    }
    return t("home.sheet.weight.guidanceSame")
  })()

  return (
    <RecordSheetShell
      visible={visible}
      onClose={onClose}
      title={t("home.sheet.weight.title")}
      subtitle={t("home.sheet.weight.subtitle")}
      // 시트는 키보드가 떠도 제자리(QA 2026-08-02) — 저장은 키보드 위 도킹 CTA 가 잇는다.
      snapPoint={74}
      ctaLabel={
        liveWeight !== null
          ? t("home.sheet.recordValue", {
              value: `${liveWeight.toFixed(1)} kg`,
            })
          : t("home.sheet.weight.chooseValue")
      }
      ctaDisabled={liveWeight === null || liveWeight <= 0 || liveWeight > 300}
      ctaLoading={isSaving}
      onCtaPress={() => {
        if (liveWeight !== null) onSubmit(liveWeight)
      }}
    >
      {/* 시안의 − 62.4kg + : 스테퍼가 큰 수치를 좌우에서 감싼다. 수치 탭 → 직접 입력 유지. */}
      <SheetStepper
        onDecrease={() => adjust(decreaseWeight)}
        onIncrease={() => adjust(increaseWeight)}
        decreaseLabel={t("home.sheet.weight.decrease")}
        increaseLabel={t("home.sheet.weight.increase")}
      >
        <SheetValueDisplay
          value={liveWeight === null ? null : liveWeight.toFixed(1)}
          unit="kg"
          edit={{
            spec: WEIGHT_INPUT,
            active: visible,
            // 기록이 없으면 열리자마자 키패드 — QA "기록하기에서 숫자 키패드 안 올라옴".
            autoStartWhenEmpty: (today?.weightKg ?? null) === null,
            onCommit: setWeight,
            onPreview: setPreview,
            resetKey: stepEpoch,
            accessibilityLabel: t("home.sheet.weight.typeValue"),
            hint: t("home.sheet.weight.step"),
          }}
        />
      </SheetStepper>

      <SheetStatRow
        items={[
          {
            label: t("home.sheet.yesterday"),
            value:
              previousWeight !== null
                ? formatWeight(previousWeight)
                : t("home.sheet.noRecord"),
          },
          {
            label: t("home.sheet.weight.weekAverage"),
            value: baseline !== null ? formatWeight(baseline) : "—",
          },
          { label: t("home.sheet.weight.difference"), value: diffText },
        ]}
      />

      <SheetTrendBars
        points={trendPoints}
        baseline={baseline}
        baselineLabel={
          baseline !== null
            ? `${t("home.sheet.weight.weekAverage")} ${formatWeight(baseline)}`
            : null
        }
        startLabel={`${startMonth}.${startDay}`}
        midLabel={t("home.sheet.weight.trendCaption")}
        endLabel={isToday ? t("home.sheet.today") : `${endMonth}.${endDay}`}
      />

      <SheetInfoCard>{info}</SheetInfoCard>
    </RecordSheetShell>
  )
}
