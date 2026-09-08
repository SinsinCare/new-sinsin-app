import { useState } from "react"
import { Pressable, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { V2Button, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { MedicationFlowShell } from "../components/MedicationFlowShell"
import { MedicationProduct } from "../components/MedicationProduct"
import { medStyles, FORM, S } from "../components/medicationStyles"
import { useMedicationSelection } from "../hooks/useMedicationSelection"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
/**
 * 인식 결과 — 후보 확인(기획 M10 · §7-4·7-5).
 *   - 제목은 질문형이다. 사용자가 확인 주체다(RQ-42). 신뢰도가 낮으면(AC-17) 문구를 바꾼다.
 *   - 후보 줄에 유사도 퍼센트를 §7-3 점수 그대로 적는다(RQ-44).
 *   - 1순위가 확실할 때(AC-15)만 강조하고 미리 선택해 둔다. 그 외에는 아무것도 고르지
 *     않은 채 시작한다(AC-16). 어떤 경우에도 확인 없이 등록되지 않는다(AC-19).
 *   - "찾는 약이 없나요" 검색 링크는 목록 아래에 항상 둔다(RQ-46).
 */
export function MedicationCandidatesScreen() {
  const { t } = useTranslation("medication"),
    s = useSurface(),
    back = useGoBack("/medication/photo"),
    select = useMedicationSelection(),
    items = useMedicationFlowStore((state) => state.candidates),
    matches = useMedicationFlowStore((state) => state.matches),
    confidence = useMedicationFlowStore((state) => state.confidence),
    observed = useMedicationFlowStore((state) => state.observed)
  const topId = confidence === "high" ? (items[0]?.id ?? null) : null
  const [selected, setSelected] = useState<string | null>(topId),
    [busy, setBusy] = useState(false)
  const chosen = items.find((d) => d.id === selected)
  const scoreOf = (id: string) => matches.find((m) => m.id === id)?.score
  return (
    <MedicationFlowShell
      title={t(confidence === "low" ? "candidatesTitleLow" : "candidatesTitle")}
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
      {/* 사진에서 읽은 각인·모양(RQ-41·45) — 후보 줄의 각인과 나란히 대조하라고 보여 준다. */}
      {observed && (observed.imprints.length || observed.shape) ? (
        <View style={[medStyles.note, { backgroundColor: s.surfaceSunken }]}>
          <V2Text style={FORM.hint} color={s.textStrong}>
            {t("observedImprint", {
              imprint: observed.imprints.join(" · ") || t("unknown"),
            })}
          </V2Text>
          <V2Text style={FORM.hint} color={s.text}>
            {[observed.shape, ...observed.colors].filter(Boolean).join(" · ") ||
              t("unknown")}
          </V2Text>
        </View>
      ) : null}
      {items.length ? (
        items.map((drug) => {
          const score = scoreOf(drug.id)
          const isTop = drug.id === topId
          const isSelected = selected === drug.id
          return (
            <Pressable
              key={drug.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={[
                drug.name,
                score !== undefined
                  ? t("similarity", { percent: score })
                  : null,
                isTop ? t("topMatch") : null,
              ]
                .filter(Boolean)
                .join(", ")}
              onPress={() => setSelected(drug.id)}
              style={[
                medStyles.note,
                {
                  borderWidth: 1,
                  borderColor: isSelected ? s.brand : s.border,
                  backgroundColor: isTop ? s.surfaceSunken : "transparent",
                },
              ]}
            >
              <View style={[medStyles.row, { gap: S[2] }]}>
                {isTop ? (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: s.brand,
                    }}
                  >
                    <V2Text token="caption.small" color={s.onBrand}>
                      {t("topMatch")}
                    </V2Text>
                  </View>
                ) : null}
                {score !== undefined ? (
                  <V2Text style={FORM.hint} color={s.textStrong}>
                    {t("similarity", { percent: score })}
                  </V2Text>
                ) : null}
              </View>
              <MedicationProduct
                drug={drug}
                trailing={isSelected ? "✓" : undefined}
              />
              <V2Text style={FORM.hint} color={s.text}>
                {t("imprint")} ·{" "}
                {[drug.imprintFront, drug.imprintBack]
                  .filter(Boolean)
                  .join(" / ") || t("unknown")}
              </V2Text>
              <V2Text style={FORM.hint} color={s.text}>
                {[drug.shape, drug.color, drug.form]
                  .filter(Boolean)
                  .join(" · ") || t("unknown")}
              </V2Text>
            </Pressable>
          )
        })
      ) : (
        <V2Text style={FORM.body} color={s.text}>
          {t("noMatch")}
        </V2Text>
      )}
      <V2Button
        multilineLabel
        color={confidence === "low" ? "brand" : "neutral"}
        variant="weak"
        onPress={() => router.replace("/medication/search")}
      >
        {t("searchMethod")}
      </V2Button>
      <V2Text style={FORM.hint} color={s.text}>
        {t("candidatesHint")}
      </V2Text>
      <V2Text style={FORM.hint} color={s.textMuted}>
        {t("candidateDisclaimer")}
      </V2Text>
    </MedicationFlowShell>
  )
}
