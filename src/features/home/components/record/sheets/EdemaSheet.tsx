import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import { RecordSheetShell } from "./RecordSheetShell"
import { SheetInfoCard, SheetOptionCard } from "./recordSheetControls"
import {
  EDEMA_OPTIONS,
  normalizeEdemaLevel,
  type EdemaLevel,
} from "../../../data/EdemaConstants"
import type { DateAnalysisBodyRecord } from "@/src/types"
import { useTranslation } from "react-i18next"

/**
 * 추상 척도(1~4점)보다 "양말 자국이 남아요" 같은 상황 서술이 응답 일관성을 높인다.
 * 서버가 받는 값은 세 단계뿐이라 카드도 세 장이다 — 없는 단계를 만들어 두지 않는다.
 */
interface EdemaSheetProps {
  visible: boolean
  onClose: () => void
  today: DateAnalysisBodyRecord | null
  isSaving: boolean
  onSubmit: (edemaLevel: EdemaLevel) => void
}

export function EdemaSheet({
  visible,
  onClose,
  today,
  isSaving,
  onSubmit,
}: EdemaSheetProps) {
  const { t } = useTranslation("common")
  const [edemaLevel, setEdemaLevel] = useState<EdemaLevel | null>(null)

  useEffect(() => {
    if (!visible) return
    setEdemaLevel(normalizeEdemaLevel(today?.edemaLevel))
  }, [today, visible])

  return (
    <RecordSheetShell
      visible={visible}
      onClose={onClose}
      title={t("home.sheet.edema.title")}
      subtitle={t("home.sheet.edema.subtitle")}
      snapPoint={56}
      ctaLabel={
        edemaLevel
          ? t("home.sheet.recordValue", {
              value: t(`home.edema.level.${edemaLevel}`),
            })
          : t("home.sheet.edema.chooseValue")
      }
      ctaDisabled={edemaLevel === null}
      ctaLoading={isSaving}
      onCtaPress={() => {
        if (edemaLevel !== null) onSubmit(edemaLevel)
      }}
    >
      <View style={styles.grid}>
        {EDEMA_OPTIONS.map((option) => (
          <SheetOptionCard
            key={option}
            label={t(`home.edema.level.${option}`)}
            description={t(`home.sheet.edema.description.${option}`)}
            selected={edemaLevel === option}
            onPress={() => setEdemaLevel(option)}
          />
        ))}
      </View>

      <SheetInfoCard>{t("home.sheet.edema.info")}</SheetInfoCard>
    </RecordSheetShell>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 8 },
})
