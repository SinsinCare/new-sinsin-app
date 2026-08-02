import { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"
import { RecordSheetShell } from "./RecordSheetShell"
import {
  SheetChip,
  SheetChipRow,
  SheetFieldLabel,
  SheetStepper,
  SheetValueDisplay,
} from "./recordSheetControls"
import {
  GLUCOSE_ELAPSED_OPTIONS,
  GLUCOSE_TIMING_OPTIONS,
  type GlucoseElapsed,
  type GlucoseTiming,
} from "../../../data/bloodMetricsConstants"
import type { SheetNumberSpec } from "../../../utils/sheetNumberInput"
import type { DateAnalysisBloodGlucoseRecord } from "@/src/types"
import { useTranslation } from "react-i18next"

const STEP = 1
/** ± 버튼이 쓰는 경계(1~999)와 같은 값. 두 입력 방식이 서로 다른 범위를 가지면 안 된다. */
const GLUCOSE_INPUT: SheetNumberSpec = { min: 1, max: 999, decimals: 0 }

interface BloodGlucoseSheetProps {
  visible: boolean
  onClose: () => void
  records: DateAnalysisBloodGlucoseRecord[]
  isSaving: boolean
  /** "지금" 타일을 거쳐 열리면 식후로 시작한다. */
  initialTiming?: GlucoseTiming
  /** 자동 추론 근거 한 줄("아침 식사 09:12 기준"). */
  inferenceHint?: string | null
  onSubmit: (body: {
    value: number
    timing: GlucoseTiming
    elapsed: GlucoseElapsed | null
  }) => void
}

/**
 * 혈당 기록 시트. 임상 승인 전인 로컬 경계값으로 정상·위험을 판정하지 않고
 * 측정 시점과 사용자가 입력한 값을 그대로 저장한다.
 *
 * 시점은 서버가 받는 값(식전·식후·공복 + 식후 경과)만 묻는다.
 * 화면에만 있는 선택지를 만들면 사용자가 고른 값이 어디에도 남지 않는다.
 */
export function BloodGlucoseSheet({
  visible,
  onClose,
  records,
  isSaving,
  initialTiming,
  inferenceHint,
  onSubmit,
}: BloodGlucoseSheetProps) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const [timing, setTiming] = useState<GlucoseTiming>("FASTING")
  const [elapsed, setElapsed] = useState<GlucoseElapsed>("2H")
  const [value, setValue] = useState<number | null>(null)

  const hydrate = (nextTiming: GlucoseTiming) => {
    const record = records.find((r) => r.timing === nextTiming) ?? null
    setValue(record ? record.value : null)
    setElapsed((record?.elapsed as GlucoseElapsed | null) ?? "2H")
  }

  useEffect(() => {
    if (!visible) return
    const initial = initialTiming ?? records[0]?.timing ?? "FASTING"
    setTiming(initial)
    const record = records.find((r) => r.timing === initial) ?? null
    setValue(record ? record.value : null)
    setElapsed((record?.elapsed as GlucoseElapsed | null) ?? "2H")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const adjust = (delta: number) => {
    const base = value ?? 100
    setValue(Math.min(999, Math.max(1, base + delta)))
  }

  return (
    <RecordSheetShell
      visible={visible}
      onClose={onClose}
      title={t("home.sheet.bloodGlucose.title")}
      subtitle={t("home.sheet.bloodGlucose.subtitle")}
      snapPoint={86}
      adjustForKeyboard
      ctaLabel={
        value !== null
          ? t("home.sheet.recordValue", { value })
          : t("home.sheet.bloodGlucose.chooseValue")
      }
      ctaDisabled={value === null}
      ctaLoading={isSaving}
      onCtaPress={() => {
        if (value === null) return
        onSubmit({
          value,
          timing,
          elapsed: timing === "AFTER_MEAL" ? elapsed : null,
        })
      }}
    >
      <SheetValueDisplay
        value={value === null ? null : String(value)}
        unit="mg/dL"
        edit={{
          spec: GLUCOSE_INPUT,
          active: visible,
          onCommit: setValue,
          accessibilityLabel: t("home.sheet.bloodGlucose.typeValue"),
          hint: t("home.sheet.typeHint"),
          doneLabel: t("action.done"),
        }}
      />

      <SheetStepper
        onDecrease={() => adjust(-STEP)}
        onIncrease={() => adjust(STEP)}
        decreaseLabel={t("home.sheet.bloodGlucose.decrease")}
        increaseLabel={t("home.sheet.bloodGlucose.increase")}
      >
        <Text style={[styles.stepperHint, { color: surface.textWeak }]}>
          {t("home.sheet.bloodGlucose.step")}
        </Text>
      </SheetStepper>

      <View style={[styles.timingCard, { backgroundColor: surface.surface }]}>
        <View style={styles.timingHead}>
          <Text style={[styles.timingTitle, { color: surface.textStrong }]}>
            {t("home.sheet.bloodGlucose.timing")}
          </Text>
          {inferenceHint ? (
            <Text style={[styles.timingHint, { color: surface.textWeak }]}>
              {inferenceHint}
            </Text>
          ) : null}
        </View>

        <SheetFieldLabel>
          {t("home.sheet.bloodGlucose.mealTiming")}
        </SheetFieldLabel>
        <SheetChipRow grow>
          {GLUCOSE_TIMING_OPTIONS.map((option) => (
            <SheetChip
              key={option}
              label={t(`home.bloodGlucose.timing.${option}`)}
              selected={timing === option}
              onCard
              onPress={() => {
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
                  onPress={() => setElapsed(option)}
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
  rangeNote: { ...TYPE.cardSub, marginTop: -6 },
  stepperHint: TYPE.cardSub,
  timingCard: { borderRadius: 16, padding: 16, gap: 8 },
  timingHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  timingTitle: { ...TYPE.cardTitle, fontWeight: "700" },
  timingHint: TYPE.cardSub,
  grow: { flex: 1 },
})
