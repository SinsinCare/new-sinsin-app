import { useEffect, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2BottomSheet,
  V2Button,
  V2IconButton,
  V2Text,
} from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { RecordChoices } from "@/src/features/home/components/record/pages/RecordChoices"
import {
  FORM,
  PAGE_X,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"
import {
  CURRENT_YEAR,
  MONTHS,
  YEARS,
} from "@/src/features/settings/data/constants"

interface DatePickerModalProps {
  visible: boolean
  selected: { year: number; month: number } | null
  onClose: () => void
  onSelect: (year: number, month: number) => void
}

const MIN_YEAR = YEARS[YEARS.length - 1] ?? CURRENT_YEAR

/**
 * 진단 시기(연·월) 선택 — 건강기록 6페이지 키트로 다시 그렸다(2026-09-12).
 *
 * 예전에는 자체 RN Modal 위에 초록 틴트의 두 줄 스크롤 목록이었다(설정 전용 색·구 토큰).
 * 지금은 `V2BottomSheet` 안에 **연도 스테퍼 + 월 칩 12개**(`RecordChoices`)다 — 36개 연도를
 * 목록으로 훑게 하지 않고, 월은 한 눈에 고른다. 확인은 시트 footer 의 CTA 한 개.
 * 시트가 열릴 때 선택값을 다시 읽는다(닫았다 열면 임시값이 남지 않게).
 */
export function DatePickerModal({
  visible,
  selected,
  onClose,
  onSelect,
}: DatePickerModalProps) {
  const { t } = useTranslation("settings")
  const s = useSurface()
  const [year, setYear] = useState(selected?.year ?? CURRENT_YEAR)
  const [month, setMonth] = useState<number | null>(selected?.month ?? null)

  useEffect(() => {
    if (!visible) return
    setYear(selected?.year ?? CURRENT_YEAR)
    setMonth(selected?.month ?? null)
  }, [visible, selected])

  // 올해는 이번 달까지만 — 미래 진단 시기는 서버도 거부한다(validation.dateFuture).
  const lastMonth = year === CURRENT_YEAR ? new Date().getMonth() + 1 : 12
  const monthOptions = useMemo(
    () =>
      MONTHS.map((m) => ({
        value: String(m),
        label: t("datePicker.month", { month: m }),
      })),
    [t],
  )
  const monthValue = month !== null && month <= lastMonth ? String(month) : null
  const canConfirm = monthValue !== null

  return (
    <V2BottomSheet
      surface="settings_diagnosis_date"
      visible={visible}
      onClose={onClose}
      title={t("datePicker.title")}
      footer={
        <View style={styles.footer}>
          <V2Button
            fullWidth
            size="xl"
            disabled={!canConfirm}
            onPress={() => {
              if (monthValue === null) return
              onSelect(year, Number(monthValue))
            }}
          >
            {t("datePicker.confirm")}
          </V2Button>
        </View>
      }
    >
      <View style={styles.body}>
        <View style={styles.group}>
          <V2Text style={styles.label} color={s.textStrong}>
            {t("datePicker.yearLabel")}
          </V2Text>
          <View style={[styles.stepper, { backgroundColor: s.surfaceSunken }]}>
            <V2IconButton
              name="chevronLeft"
              size="l"
              accessibilityLabel={t("datePicker.prevYear")}
              disabled={year <= MIN_YEAR}
              onPress={() => setYear((y) => Math.max(MIN_YEAR, y - 1))}
            />
            <V2Text
              style={styles.year}
              color={s.textStrong}
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
            >
              {t("datePicker.year", { year })}
            </V2Text>
            <V2IconButton
              name="chevronRight"
              size="l"
              accessibilityLabel={t("datePicker.nextYear")}
              disabled={year >= CURRENT_YEAR}
              onPress={() => setYear((y) => Math.min(CURRENT_YEAR, y + 1))}
            />
          </View>
        </View>
        <View style={styles.group}>
          <V2Text style={styles.label} color={s.textStrong}>
            {t("datePicker.monthLabel")}
          </V2Text>
          <RecordChoices
            value={monthValue}
            onChange={(value) => setMonth(Number(value))}
            options={monthOptions.filter((o) => Number(o.value) <= lastMonth)}
          />
        </View>
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: PAGE_X,
    gap: FORM.sectionGap,
    paddingBottom: S[4],
  },
  group: { gap: FORM.labelGap },
  label: FORM.label,
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: FORM.choiceRadius,
    paddingHorizontal: S[2],
    minHeight: FORM.choiceHeight + S[2],
  },
  year: { ...FORM.body, fontVariant: ["tabular-nums"] },
  footer: { paddingHorizontal: PAGE_X, paddingTop: S[2] },
})
