import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useEffect, useState } from "react"
import { Linking, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { V2Button, V2DotLoader, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { MedicationFlowShell } from "../components/MedicationFlowShell"
import { MedicationProduct } from "../components/MedicationProduct"
import { medStyles, FORM } from "../components/medicationStyles"
import { medicationApi } from "../services/medicationApi"
import { useMedicationSelection } from "../hooks/useMedicationSelection"
export function MedicationSearchScreen() {
  const { t } = useTranslation("medication"),
    s = useSurface(),
    back = useGoBack("/medication/add"),
    select = useMedicationSelection()
  const [text, setText] = useState(""),
    [q, setQuery] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 250)
    return () => clearTimeout(timer)
  }, [text])
  const result = useQuery({
    queryKey: ["medication-search", q],
    queryFn: ({ signal }) => medicationApi.search(q, signal),
    enabled: q.length >= 2,
    staleTime: 30000,
    retry: 1,
  })
  const current = q === text.trim(),
    data = current ? result.data : undefined
  return (
    <MedicationFlowShell
      title={t("searchTitle")}
      onBack={back}
      footer={
        <V2Button
          multilineLabel
          fullWidth
          size="l"
          color={
            data && (!data.available || data.items.length === 0)
              ? "brand"
              : "neutral"
          }
          variant={
            data && (!data.available || data.items.length === 0)
              ? "fill"
              : "weak"
          }
          onPress={() => void select(null, "CATALOG", text.trim())}
        >
          {t("manualMethod")}
        </V2Button>
      }
    >
      <TextInput
        autoFocus
        value={text}
        onChangeText={setText}
        placeholder={t("searchPlaceholder")}
        accessibilityLabel={t("searchPlaceholder")}
        placeholderTextColor={s.textMuted}
        style={[
          medStyles.field,
          { backgroundColor: s.surfaceSunken, color: s.textStrong },
        ]}
        returnKeyType="search"
        autoCorrect={false}
        selectionColor={s.brand}
        maxLength={120}
        clearButtonMode="while-editing"
      />
      {text.trim().length < 2 ? (
        <V2Text style={FORM.hint} color={s.text}>
          {t("searchHint")}
        </V2Text>
      ) : !current || result.isFetching ? (
        <View style={medStyles.empty}>
          <V2DotLoader />
        </View>
      ) : result.isError ? (
        <View style={medStyles.section}>
          <V2Text style={FORM.body} color={s.text}>
            {t("searchError")}
          </V2Text>
          <V2Button
            multilineLabel
            color="neutral"
            variant="weak"
            onPress={() => void result.refetch()}
          >
            {t("reload")}
          </V2Button>
        </View>
      ) : data && !data.available ? (
        <V2Text style={FORM.body} color={s.text}>
          {t("catalogUnavailable")}
        </V2Text>
      ) : data?.items.length ? (
        <View>
          {data.items.map((drug) => (
            <MedicationProduct
              key={drug.id}
              drug={drug}
              onPress={() => void select(drug)}
            />
          ))}
        </View>
      ) : (
        <View style={medStyles.empty}>
          <V2Text style={FORM.label} color={s.textStrong}>
            {t("searchNone")}
          </V2Text>
          <V2Text style={FORM.body} color={s.text}>
            {t("searchNoneBody")}
          </V2Text>
        </View>
      )}
      {data?.source ? (
        <V2Text
          style={FORM.hint}
          color={s.text}
          onPress={() => {
            if (data.sourceUrl?.startsWith("https://"))
              void Linking.openURL(data.sourceUrl)
          }}
        >
          {t("source", { name: data.source })}
        </V2Text>
      ) : null}
    </MedicationFlowShell>
  )
}
