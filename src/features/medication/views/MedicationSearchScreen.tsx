import { useEffect, useState } from "react"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { Linking, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  V2Button,
  V2DotLoader,
  V2SearchField,
  V2Text,
} from "@/src/design-system-v2"
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
  // 카탈로그가 아직 없으면(적재 전) 검색을 시도하지 않고 직접 입력을 앞세운다(EX-15 의 검색판).
  const capability = useQuery({
    queryKey: ["medication-capabilities"],
    queryFn: ({ signal }) => medicationApi.capabilities(signal),
    staleTime: 60000,
  })
  const catalogReady = capability.data?.catalog !== false
  const result = useQuery({
    queryKey: ["medication-search", q],
    queryFn: ({ signal }) => medicationApi.search(q, signal),
    enabled: q.length >= 2 && catalogReady,
    staleTime: 30000,
    retry: 1,
  })
  const current = q === text.trim(),
    data = current ? result.data : undefined
  // 검색 결과가 도착할 때마다 한 번. 검색어는 싣지 않는다(병명 추정 가능, RQ-61).
  useEffect(() => {
    if (!result.data || !current) return
    trackAnalyticsEvent("medication_search_performed", {
      query_length: q.length,
      result_count: result.data.items.length,
    })
  }, [result.data, current, q.length])
  const unavailable = !catalogReady || (data ? !data.available : false)
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
            unavailable || (data && data.items.length === 0)
              ? "brand"
              : "neutral"
          }
          variant={
            unavailable || (data && data.items.length === 0) ? "fill" : "weak"
          }
          onPress={() => void select(null, "CATALOG", text.trim())}
        >
          {t("manualMethod")}
        </V2Button>
      }
    >
      <V2SearchField
        autoFocus
        value={text}
        onChangeText={setText}
        placeholder={t("searchPlaceholder")}
        accessibilityLabel={t("searchPlaceholder")}
        returnKeyType="search"
        autoCorrect={false}
        maxLength={120}
      />
      {unavailable ? (
        <View style={medStyles.section}>
          <V2Text style={FORM.body} color={s.text}>
            {t("catalogUnavailable")}
          </V2Text>
        </View>
      ) : text.trim().length < 2 ? (
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
      ) : data?.items.length ? (
        <View>
          {data.items.map((drug, index) => (
            <MedicationProduct
              key={drug.id}
              drug={drug}
              onPress={() => {
                trackAnalyticsEvent("medication_search_result_selected", {
                  rank: index + 1,
                })
                void select(drug)
              }}
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
      {/* 출처 상시 표기(RQ-16). 식약처 공공데이터 — 약학정보원 계약 전까지의 정본이다(O-1). */}
      {data?.source ? (
        <V2Text
          style={FORM.hint}
          color={s.textMuted}
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
