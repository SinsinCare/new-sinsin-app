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
  GLUCOSE_SLOT_OPTIONS,
  type GlucoseElapsed,
  type GlucoseSlot,
  type GlucoseTiming,
} from "../../../data/bloodMetricsConstants"
import { findGlucoseCell, slotForSubmit } from "../../../utils/glucoseGrid"
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
    slot: Exclude<GlucoseSlot, ""> | null
  }) => void
}

/**
 * 혈당 기록 시트 — 시트 시안(2026-08-03).
 *
 * 값을 넣으면 판정 배지와 목표 구간 바가 **그 자리에서** 응답한다. 입력→판정을
 * 화면 이동 없이 닿는 게 기록의 보상이다. 시점은 앱이 먼저 안다: 오늘 끼니
 * 기록에서 식후·경과를 추론해 기본값으로 깔고, 틀렸을 때만 고치게 한다.
 *
 * ## 끼니 줄은 식전/식후일 때만 선다
 *
 * 이 시트에는 한동안 아침/점심/저녁이 없었다. 넣을 수 없어서였다 — 서버 유니크가
 * `(user, date, timing)` 이라 고른 끼니를 실을 칸이 표에 없었고, 화면에만 있는 선택지는
 * 사용자가 고른 값이 어디에도 남지 않는다. 마이그레이션 081 이 그 칸을 만들었고
 * (`utils/glucoseGrid.ts` 머리말), QA 2026-08-05 "기존에 있던 아침/점심/저녁 버튼이
 * 없습니다" 가 그제야 고칠 수 있는 결함이 됐다.
 *
 * 다만 줄을 **항상** 세우지는 않는다. 공복은 끼니에 매이지 않으므로(서버도 400 으로
 * 막는다) 그때는 줄이 없다. 경과(30분/1시간/2시간)가 식후에만 서는 것과 같은 규칙이다 —
 * 고를 수 없는 것을 회색으로 띄워 두지 않는다.
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
  const [slot, setSlot] = useState<GlucoseSlot>("")
  const [elapsed, setElapsed] = useState<GlucoseElapsed>("2H")
  const [value, setValue] = useState<number | null>(null)
  /** 치는 도중의 값 — 배지·바·CTA 가 키 입력마다 응답한다(onPreview 머리말). */
  const [preview, setPreview] = useState<number | null>(null)
  /** 칩을 한 번이라도 만졌으면 "자동" 표시를 내린다 — 이제 사용자의 선택이다. */
  const [touched, setTouched] = useState(false)

  /**
   * 격자의 칸(끼니·시점)을 바꿨다. **그 칸에 이미 기록이 있을 때만** 값을 갈아끼운다.
   *
   * 종전에는 기록이 없으면 `null` 로 지웠다. 그래서 공복으로 숫자를 쳐 넣고 식후로
   * 바꾸면 방금 친 값이 사라지고 CTA 가 꺼졌다 — 사용자는 같은 숫자를 다시 쳐야
   * 했다(2026-08-04 QA, 안드로이드 에뮬레이터). 칩을 누르는 것은 "이 수치는 사실
   * 식후였다" 는 **라벨 정정**이지 입력 취소가 아니다.
   *
   * 반대로 그 칸에 저장된 수치가 있으면 그것을 보여 주는 게 맞다 — 다른 칸의
   * 기록은 **다른 측정**이고, 그 자리에 남의 숫자를 얹어 두면 덮어쓰기를 유도한다.
   * 칸은 끼니까지 봐야 정해진다: 시점만 맞춰 찾으면 아침 식후 값이 저녁 식후 자리에
   * 떠서, 사용자가 그대로 저장하는 순간 아침 수치가 저녁 수치로 복제된다.
   */
  const hydrate = (cell: { slot: GlucoseSlot; timing: GlucoseTiming }) => {
    const record = findGlucoseCell(records, cell)
    if (record) {
      setValue(record.value)
      setPreview(null)
    }
    setElapsed(
      (record?.elapsed as GlucoseElapsed | null) ?? inference?.elapsed ?? "2H",
    )
  }

  useEffect(() => {
    if (!visible) return
    const initialTiming = inference?.timing ?? records[0]?.timing ?? "FASTING"
    const initialSlot: GlucoseSlot =
      initialTiming === "FASTING"
        ? ""
        : (inference?.slot ?? records[0]?.slot ?? "")
    setTiming(initialTiming)
    setSlot(initialSlot)
    setTouched(false)
    const record = findGlucoseCell(records, {
      slot: initialSlot,
      timing: initialTiming,
    })
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
          slot: slotForSubmit({ slot, timing }),
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
                // 공복은 끼니에 매이지 않는다. 식전/식후로 돌아왔을 때 직전에 고른
                // 끼니가 살아 있도록, 공복으로 갈 때도 `slot` 자체는 지우지 않는다 —
                // 저장에 실리는 값은 `slotForSubmit` 이 시점을 보고 정한다.
                const nextSlot: GlucoseSlot = option === "FASTING" ? "" : slot
                setTiming(option)
                setSlot(nextSlot)
                hydrate({ slot: nextSlot, timing: option })
              }}
              style={styles.grow}
            />
          ))}
        </SheetChipRow>

        {timing === "FASTING" ? null : (
          <>
            <SheetFieldLabel>
              {t("home.sheet.bloodGlucose.mealSlot")}
            </SheetFieldLabel>
            <SheetChipRow grow>
              {GLUCOSE_SLOT_OPTIONS.map((option) => (
                <SheetChip
                  key={option}
                  label={t(`meal.${option}`)}
                  selected={slot === option}
                  onCard
                  onPress={() => {
                    setTouched(true)
                    setSlot(option)
                    hydrate({ slot: option, timing })
                  }}
                  style={styles.grow}
                />
              ))}
            </SheetChipRow>
          </>
        )}

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
