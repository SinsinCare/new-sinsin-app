import { useEffect, useState } from "react"
import { StyleSheet, Text } from "react-native"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"
import { RecordSheetShell } from "./RecordSheetShell"
import {
  SheetInfoCard,
  SheetStatRow,
  SheetStepper,
  SheetValueDisplay,
} from "./recordSheetControls"
import { decreaseWeight, increaseWeight } from "../../../utils/adjustWeight"
import type { DateAnalysisBodyRecord } from "@/src/types"
import { useTranslation } from "react-i18next"

interface WeightSheetProps {
  visible: boolean
  onClose: () => void
  today: DateAnalysisBodyRecord | null
  previous: DateAnalysisBodyRecord | null
  isSaving: boolean
  onSubmit: (weightKg: number) => void
}

/** 체중 기록 시트. 전날 기록과의 차이만 계산하고 원인이나 진료 시점을 추정하지 않는다. */
export function WeightSheet({
  visible,
  onClose,
  today,
  previous,
  isSaving,
  onSubmit,
}: WeightSheetProps) {
  const { t, i18n } = useTranslation("common")
  const english = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
  const formatWeight = (value: number) =>
    `${value.toFixed(1)}${english ? " " : ""}kg`
  const surface = useSurface()
  const [weight, setWeight] = useState<number | null>(null)

  const previousWeight = previous?.weightKg ?? null

  useEffect(() => {
    if (!visible) return
    setWeight(today?.weightKg ?? null)
  }, [today, visible])

  const adjust = (fn: (current: number) => number) => {
    const base = weight ?? previousWeight ?? 60
    setWeight(Number(fn(base).toFixed(1)))
  }

  const diff =
    weight !== null && previousWeight !== null ? weight - previousWeight : null
  const diffText =
    diff === null
      ? "—"
      : Math.abs(diff) < 0.05
        ? formatWeight(0)
        : `${diff > 0 ? "+" : "−"}${formatWeight(Math.abs(diff))}`

  const info =
    diff === null
      ? t("home.sheet.weight.noComparisonInfo")
      : t("home.sheet.weight.comparisonInfo")

  return (
    <RecordSheetShell
      visible={visible}
      onClose={onClose}
      title={t("home.sheet.weight.title")}
      subtitle={t("home.sheet.weight.subtitle")}
      snapPoint={68}
      ctaLabel={
        weight !== null
          ? t("home.sheet.recordValue", {
              value: `${weight.toFixed(1)} kg`,
            })
          : t("home.sheet.weight.chooseValue")
      }
      ctaDisabled={weight === null || weight <= 0 || weight > 300}
      ctaLoading={isSaving}
      onCtaPress={() => {
        if (weight !== null) onSubmit(weight)
      }}
    >
      <SheetValueDisplay
        value={weight === null ? null : weight.toFixed(1)}
        unit="kg"
      />

      <SheetStepper
        onDecrease={() => adjust(decreaseWeight)}
        onIncrease={() => adjust(increaseWeight)}
        decreaseLabel={t("home.sheet.weight.decrease")}
        increaseLabel={t("home.sheet.weight.increase")}
      >
        <Text style={[styles.hint, { color: surface.textWeak }]}>
          {t("home.sheet.weight.step")}
        </Text>
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
          { label: t("home.sheet.weight.difference"), value: diffText },
        ]}
      />

      <SheetInfoCard>{info}</SheetInfoCard>
    </RecordSheetShell>
  )
}

const styles = StyleSheet.create({
  hint: TYPE.cardSub,
})
