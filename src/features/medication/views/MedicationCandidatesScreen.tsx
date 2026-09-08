import { useState } from "react"
import { Pressable } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { V2Button, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { MedicationFlowShell } from "../components/MedicationFlowShell"
import { MedicationProduct } from "../components/MedicationProduct"
import { medStyles, FORM } from "../components/medicationStyles"
import { useMedicationSelection } from "../hooks/useMedicationSelection"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
export function MedicationCandidatesScreen() {
  const { t } = useTranslation("medication"),
    s = useSurface(),
    back = useGoBack("/medication/photo"),
    select = useMedicationSelection(),
    items = useMedicationFlowStore((state) => state.candidates)
  const [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false)
  const chosen = items.find((d) => d.id === selected)
  return (
    <MedicationFlowShell
      title={t("candidatesTitle")}
      onBack={back}
      footer={
        <V2Button
          multilineLabel
          fullWidth
          size="l"
          disabled={!chosen}
          loading={busy}
          onPress={() => {
            if (!chosen) return
            setBusy(true)
            void select(chosen, "PHOTO").finally(() => setBusy(false))
          }}
        >
          {t("confirmCandidate")}
        </V2Button>
      }
    >
      <V2Text style={FORM.body} color={s.text}>
        {t("candidatesBody")}
      </V2Text>
      {items.length ? (
        items.map((drug) => (
          <Pressable
            key={drug.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === drug.id }}
            accessibilityLabel={drug.name}
            onPress={() => setSelected(drug.id)}
            style={[
              medStyles.note,
              {
                borderWidth: 1,
                borderColor: selected === drug.id ? s.textStrong : s.border,
              },
            ]}
          >
            <MedicationProduct
              drug={drug}
              trailing={selected === drug.id ? "✓" : undefined}
            />
            <V2Text style={FORM.hint} color={s.text}>
              {t("imprint")} ·{" "}
              {[drug.imprintFront, drug.imprintBack]
                .filter(Boolean)
                .join(" / ") || t("unknown")}
            </V2Text>
            <V2Text style={FORM.hint} color={s.text}>
              {[drug.shape, drug.color].filter(Boolean).join(" · ") ||
                t("unknown")}
            </V2Text>
          </Pressable>
        ))
      ) : (
        <V2Text style={FORM.body} color={s.text}>
          {t("noMatch")}
        </V2Text>
      )}
      <V2Text style={FORM.hint} color={s.text}>
        {t("candidateDisclaimer")}
      </V2Text>
      <V2Button
        multilineLabel
        color="neutral"
        variant="weak"
        onPress={() => router.replace("/medication/search")}
      >
        {t("searchMethod")}
      </V2Button>
    </MedicationFlowShell>
  )
}
