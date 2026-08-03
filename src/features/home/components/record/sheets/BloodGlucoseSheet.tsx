import { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"
import { RecordSheetShell } from "./RecordSheetShell"
import {
  SheetChip,
  SheetChipRow,
  SheetFieldLabel,
  SheetJudgmentBadge,
  SheetRangeBar,
  SheetValueDisplay,
} from "./recordSheetControls"
import {
  GLUCOSE_ELAPSED_OPTIONS,
  type GlucoseElapsed,
  type GlucoseTiming,
} from "../../../data/bloodMetricsConstants"
import {
  GLUCOSE_DANGER_FROM,
  GLUCOSE_RANGE,
  getGlucoseTarget,
  judgeGlucoseValue,
} from "../../../utils/vitalsJudgment"
import type { GlucoseContextInference } from "../../../utils/glucoseInference"
import type { SheetNumberSpec } from "../../../utils/sheetNumberInput"
import type { DateAnalysisBloodGlucoseRecord } from "@/src/types"
import { useTranslation } from "react-i18next"

/** 직접 입력의 경계(1~999). 입력 방식마다 범위가 다르면 안 된다. */
const GLUCOSE_INPUT: SheetNumberSpec = { min: 1, max: 999, decimals: 0 }

/** 시안(2026-08-03)의 칩 순서 — 식전 · 식후 · 공복. */
const TIMING_ORDER: GlucoseTiming[] = ["BEFORE_MEAL", "AFTER_MEAL", "FASTING"]

interface BloodGlucoseSheetProps {
  visible: boolean
  onClose: () => void
  records: DateAnalysisBloodGlucoseRecord[]
  isSaving: boolean
  /**
   * 측정 시점 추론(오늘 화면에서만). "아침 식후 09:12 자동" — 추론을 기본값으로
   * 먼저 제시하고, 사용자가 칩을 만지면 자동 표시를 내린다.
   */
  inference?: GlucoseContextInference | null
  onSubmit: (body: {
    value: number
    timing: GlucoseTiming
    elapsed: GlucoseElapsed | null
  }) => void
}

/**
 * 혈당 기록 시트 — 시트 시안(2026-08-03).
 *
 * 값을 넣으면 판정 배지와 목표 구간 바가 **그 자리에서** 응답한다. 입력→판정을
 * 화면 이동 없이 닿는 게 기록의 보상이다. 시점은 앱이 먼저 안다: 오늘 끼니
 * 기록에서 식후·경과를 추론해 기본값으로 깔고, 틀렸을 때만 고치게 한다.
 *
 * 저장은 서버가 받는 값(식전·식후·공복 + 식후 경과)만 묻는다. 화면에만 있는
 * 선택지를 만들면 사용자가 고른 값이 어디에도 남지 않는다.
 */
export function BloodGlucoseSheet({
  visible,
  onClose,
  records,
  isSaving,
  inference,
  onSubmit,
}: BloodGlucoseSheetProps) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const [timing, setTiming] = useState<GlucoseTiming>("FASTING")
  const [elapsed, setElapsed] = useState<GlucoseElapsed>("2H")
  const [value, setValue] = useState<number | null>(null)
  /** 치는 도중의 값 — 배지·바·CTA 가 키 입력마다 응답한다(onPreview 머리말). */
  const [preview, setPreview] = useState<number | null>(null)
  /** 칩을 한 번이라도 만졌으면 "자동" 표시를 내린다 — 이제 사용자의 선택이다. */
  const [touched, setTouched] = useState(false)

  const hydrate = (nextTiming: GlucoseTiming) => {
    const record = records.find((r) => r.timing === nextTiming) ?? null
    setValue(record ? record.value : null)
    setPreview(null)
    setElapsed(
      (record?.elapsed as GlucoseElapsed | null) ?? inference?.elapsed ?? "2H",
    )
  }

  useEffect(() => {
    if (!visible) return
    const initial = inference?.timing ?? records[0]?.timing ?? "FASTING"
    setTiming(initial)
    setTouched(false)
    const record = records.find((r) => r.timing === initial) ?? null
    setValue(record ? record.value : null)
    setPreview(null)
    setElapsed(
      (record?.elapsed as GlucoseElapsed | null) ?? inference?.elapsed ?? "2H",
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const liveValue = preview ?? value
  const target = getGlucoseTarget(timing)
  const judgment = judgeGlucoseValue(liveValue, timing)

  const judgmentLabel = judgment
    ? judgment.tone === "danger"
      ? t("home.sheet.judgment.veryHigh")
      : judgment.direction === "high"
        ? t("home.sheet.judgment.high")
        : judgment.direction === "low"
          ? t("home.sheet.judgment.low")
          : t("home.sheet.judgment.normal")
    : null

  const autoLabel =
    !touched && inference
      ? inference.mealType && inference.mealTime
        ? t("home.sheet.bloodGlucose.autoAfterMeal", {
            meal: t(`meal.${inference.mealType}`),
            time: inference.mealTime,
          })
        : t("home.sheet.bloodGlucose.autoFasting")
      : null

  return (
    <RecordSheetShell
      visible={visible}
      onClose={onClose}
      title={t("home.sheet.bloodGlucose.title")}
      /*
        66 = 화면 2/3 근처. 시트는 키보드가 떠도 제자리다 — 상단이 시계·배터리를
        덮던 QA(2026-08-02) 재발 방지. 키보드 위에는 도킹 CTA 가 선다(KeyboardDock).
      */
      snapPoint={66}
      ctaLabel={
        liveValue !== null
          ? t("home.sheet.recordValue", { value: liveValue })
          : t("home.sheet.bloodGlucose.chooseValue")
      }
      ctaDisabled={liveValue === null}
      ctaLoading={isSaving}
      onCtaPress={() => {
        if (liveValue === null) return
        onSubmit({
          value: liveValue,
          timing,
          elapsed: timing === "AFTER_MEAL" ? elapsed : null,
        })
      }}
    >
      <SheetValueDisplay
        value={liveValue === null ? null : String(liveValue)}
        unit="mg/dL"
        edit={{
          spec: GLUCOSE_INPUT,
          active: visible,
          // 기록이 하나도 없으면 열리자마자 키패드 — QA "기록하기에서 숫자 키패드 안 올라옴".
          autoStartWhenEmpty: records.length === 0,
          onCommit: setValue,
          onPreview: setPreview,
          accessibilityLabel: t("home.sheet.bloodGlucose.typeValue"),
          hint: t("home.sheet.typeHint"),
        }}
      />

      {/* 판정과 목표. 값이 없으면 목표만 — 자리는 같아서 입력 순간 아무것도 밀리지 않는다. */}
      <View style={styles.judgeBlock}>
        <SheetJudgmentBadge
          label={
            judgment && judgmentLabel
              ? t("home.sheet.targetBadge", {
                  label: judgmentLabel,
                  min: target.min,
                  max: target.max,
                })
              : t("home.sheet.targetOnly", {
                  min: target.min,
                  max: target.max,
                })
          }
          tone={judgment?.tone ?? "normal"}
        />
        <SheetRangeBar
          min={GLUCOSE_RANGE.min}
          max={GLUCOSE_RANGE.max}
          targetMin={target.min}
          targetMax={target.max}
          value={liveValue}
          dangerFrom={GLUCOSE_DANGER_FROM}
        />
      </View>

      <View style={[styles.timingCard, { backgroundColor: surface.surface }]}>
        <View style={styles.timingHead}>
          <Text style={[styles.timingTitle, { color: surface.textStrong }]}>
            {t("home.sheet.bloodGlucose.timing")}
          </Text>
          {autoLabel ? (
            <Text
              style={[styles.timingHint, { color: surface.textWeak }]}
              numberOfLines={1}
            >
              {autoLabel}
            </Text>
          ) : null}
        </View>

        <SheetFieldLabel>
          {t("home.sheet.bloodGlucose.mealTiming")}
        </SheetFieldLabel>
        <SheetChipRow grow>
          {TIMING_ORDER.map((option) => (
            <SheetChip
              key={option}
              label={t(`home.bloodGlucose.timing.${option}`)}
              selected={timing === option}
              onCard
              onPress={() => {
                setTouched(true)
                setTiming(option)
                hydrate(option)
              }}
              style={styles.grow}
            />
          ))}
        </SheetChipRow>

        {timing === "AFTER_MEAL" ? (
          <>
            <SheetFieldLabel>
              {t("home.sheet.bloodGlucose.elapsed")}
            </SheetFieldLabel>
            <SheetChipRow grow>
              {GLUCOSE_ELAPSED_OPTIONS.map((option) => (
                <SheetChip
                  key={option}
                  label={t(`home.sheet.bloodGlucose.elapsedOption.${option}`)}
                  selected={elapsed === option}
                  onCard
                  onPress={() => {
                    setTouched(true)
                    setElapsed(option)
                  }}
                  style={styles.grow}
                />
              ))}
            </SheetChipRow>
          </>
        ) : null}
      </View>
    </RecordSheetShell>
  )
}

const styles = StyleSheet.create({
  judgeBlock: { gap: 12, marginTop: -6 },
  timingCard: { borderRadius: 16, padding: 16, gap: 8 },
  timingHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  timingTitle: { ...TYPE.cardTitle, fontWeight: "700" },
  timingHint: { ...TYPE.cardSub, flexShrink: 1 },
  grow: { flex: 1 },
})
