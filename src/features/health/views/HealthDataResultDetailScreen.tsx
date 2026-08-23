import React from "react"
import { StyleSheet, View, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { useLoadingVisible } from "@/src/design-system-v2"
import { HealthResultDetailSkeleton } from "../components/HealthSkeletons"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { Button } from "@/src/shared/components/Button"
import { resolveError } from "@/src/lib/errorMessage"
import { healthResultDetailQueryOptions } from "../data/healthQueries"
import { formatHealthDate } from "../data/dashboardMetrics"
import { useHealthTheme } from "../hooks/useHealthTheme"

type ResultField = { label: string; value: string; unit?: string }
const JUDGEMENT_COPY_KEYS = {
  NORMAL_A: {
    label: "result.judgements.NORMAL_A.label",
    description: "result.judgements.NORMAL_A.description",
  },
  NORMAL_B: {
    label: "result.judgements.NORMAL_B.label",
    description: "result.judgements.NORMAL_B.description",
  },
  NORMAL: {
    label: "result.judgements.NORMAL.label",
    description: "result.judgements.NORMAL.description",
  },
  GENERAL_DISEASE_SUSPECTED: {
    label: "result.judgements.GENERAL_DISEASE_SUSPECTED.label",
    description: "result.judgements.GENERAL_DISEASE_SUSPECTED.description",
  },
  CARDIOMETABOLIC_DISEASE_SUSPECTED: {
    label: "result.judgements.CARDIOMETABOLIC_DISEASE_SUSPECTED.label",
    description:
      "result.judgements.CARDIOMETABOLIC_DISEASE_SUSPECTED.description",
  },
  DISEASE_SUSPECTED: {
    label: "result.judgements.DISEASE_SUSPECTED.label",
    description: "result.judgements.DISEASE_SUSPECTED.description",
  },
  KNOWN_CONDITION: {
    label: "result.judgements.KNOWN_CONDITION.label",
    description: "result.judgements.KNOWN_CONDITION.description",
  },
  REVIEW_NEEDED: {
    label: "result.judgements.REVIEW_NEEDED.label",
    description: "result.judgements.REVIEW_NEEDED.description",
  },
  UNKNOWN: {
    label: "result.judgements.UNKNOWN.label",
    description: "result.judgements.UNKNOWN.description",
  },
} as const

function getJudgementCopyKeys(code: string | undefined) {
  if (!code || !(code in JUDGEMENT_COPY_KEYS)) return null
  return JUDGEMENT_COPY_KEYS[code as keyof typeof JUDGEMENT_COPY_KEYS]
}

function ResultGroup({
  title,
  fields,
}: {
  title: string
  fields: ResultField[]
}) {
  const { healthColors } = useHealthTheme()
  return (
    <View
      style={[
        groupStyles.container,
        {
          borderColor: healthColors.line,
          backgroundColor: healthColors.surface,
        },
      ]}
    >
      <ThemedText
        style={[
          groupStyles.title,
          {
            color: healthColors.textSecondary,
            borderBottomColor: healthColors.lineSubtle,
          },
        ]}
      >
        {title}
      </ThemedText>
      {fields.map((f, i) => (
        <View
          key={f.label}
          style={[
            groupStyles.row,
            { borderBottomColor: healthColors.lineSubtle },
            i === fields.length - 1 && groupStyles.rowLast,
          ]}
        >
          <ThemedText
            style={[groupStyles.label, { color: healthColors.textSecondary }]}
          >
            {f.label}
          </ThemedText>
          <ThemedText style={[groupStyles.value, { color: healthColors.text }]}>
            {f.value || "-"}
            {f.unit && f.value ? (
              <ThemedText
                style={[
                  groupStyles.unit,
                  { color: healthColors.textAssistive },
                ]}
              >
                {" "}
                {f.unit}
              </ThemedText>
            ) : null}
          </ThemedText>
        </View>
      ))}
    </View>
  )
}

export function HealthDataResultDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { t, i18n } = useTranslation("health")
  const language = i18n.resolvedLanguage ?? i18n.language
  const { healthColors } = useHealthTheme()
  const { resultId } = useLocalSearchParams<{ resultId: string }>()
  const {
    data = null,
    isLoading: loading,
    isError,
    error: queryError,
    isFetching,
    refetch,
  } = useQuery(healthResultDetailQueryOptions(resultId ?? ""))
  // 문구를 화면이 짓지 않는다. 예전 문구는 어떤 실패든 "인터넷 연결을 확인한 뒤
  // 다시 불러와 주세요" 였는데, 여기서 실제로 오는 실패는 세션 만료·없는 회차 쪽이다.
  const failure = isError ? resolveError(queryError) : null
  // 캐시 히트로 즉시 오는 경우엔 스켈레톤을 아예 그리지 않는다 (깜빡임 방지).
  const showSkeleton = useLoadingVisible(loading, {
    surface: "health_result_detail",
  })
  const judgementCopy = getJudgementCopyKeys(data?.judgementCode)

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: healthColors.background }]}
    >
      <ScreenHeader
        title={t("result.title")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      {showSkeleton && <HealthResultDetailSkeleton />}

      {failure && !loading && (
        <View style={styles.center}>
          <ThemedText
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            style={[styles.errorText, { color: healthColors.textSecondary }]}
          >
            {failure.body ? `${failure.title}\n${failure.body}` : failure.title}
          </ThemedText>
          {/* 재시도로 답이 달라지지 않는 실패(없는 회차·권한)에는 버튼을 두지 않는다. */}
          {failure.retryable && (
            <View style={styles.stateAction}>
              <Button
                buttonSize="small"
                fullWidth
                loading={isFetching}
                onPress={() => void refetch()}
              >
                {t("actions.retryLoad")}
              </Button>
            </View>
          )}
        </View>
      )}

      {!loading && !failure && !data && (
        <View style={styles.center}>
          <ThemedText
            style={[styles.emptyTitle, { color: healthColors.text }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("result.emptyTitle")}
          </ThemedText>
          <ThemedText
            style={[styles.emptySub, { color: healthColors.textSecondary }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("result.emptyDescription")}
          </ThemedText>
          <View style={styles.stateAction}>
            <Button
              buttonSize="small"
              fullWidth
              onPress={() => router.push("/(settings)/health-data")}
            >
              {t("actions.importResults")}
            </Button>
          </View>
        </View>
      )}

      {data && (
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.headerCard,
              {
                backgroundColor: healthColors.positiveWeak,
                borderColor: healthColors.positive,
              },
            ]}
          >
            <ThemedText
              style={[styles.headerDate, { color: healthColors.text }]}
            >
              {formatHealthDate(data.checkupDate, language)}
            </ThemedText>
            <ThemedText
              style={[
                styles.headerPlace,
                { color: healthColors.textSecondary },
              ]}
              lineBreakStrategyIOS="hangul-word"
            >
              {data.checkupPlace}
            </ThemedText>
            {data.judgement ? (
              <View
                style={[
                  styles.judgementBadge,
                  { backgroundColor: healthColors.surface },
                ]}
              >
                <ThemedText
                  style={[
                    styles.judgementText,
                    { color: healthColors.positive },
                  ]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("result.overallAssessment", {
                    assessment: judgementCopy
                      ? t(judgementCopy.label)
                      : data.judgement,
                  })}
                </ThemedText>
                {judgementCopy || data.judgementDescription ? (
                  <ThemedText
                    style={[
                      styles.judgementDescription,
                      { color: healthColors.textSecondary },
                    ]}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {judgementCopy
                      ? t(judgementCopy.description)
                      : data.judgementDescription}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
          </View>

          <ResultGroup
            title={t("result.groups.bodyMeasurements")}
            fields={[
              {
                label: t("result.fields.height"),
                value: data.height,
                unit: "cm",
              },
              {
                label: t("result.fields.weight"),
                value: data.weight,
                unit: "kg",
              },
              {
                label: t("result.fields.bmi"),
                value: data.bmi,
                unit: "kg/m²",
              },
              {
                label: t("result.fields.waistCircumference"),
                value: data.waistCircumference,
                unit: "cm",
              },
            ]}
          />

          <ResultGroup
            title={t("result.groups.bloodPressure")}
            fields={[
              {
                label: t("result.fields.systolicBloodPressure"),
                value: data.bloodPressureSystolic,
                unit: "mmHg",
              },
              {
                label: t("result.fields.diastolicBloodPressure"),
                value: data.bloodPressureDiastolic,
                unit: "mmHg",
              },
            ]}
          />

          <ResultGroup
            title={t("result.groups.bloodGlucose")}
            fields={[
              {
                label: t("result.fields.fastingBloodGlucose"),
                value: data.fastingBloodSugar,
                unit: "mg/dL",
              },
            ]}
          />

          <ResultGroup
            title={t("result.groups.cholesterol")}
            fields={[
              {
                label: t("result.fields.totalCholesterol"),
                value: data.totalCholesterol,
                unit: "mg/dL",
              },
              {
                label: t("result.fields.hdlCholesterol"),
                value: data.hdlCholesterol,
                unit: "mg/dL",
              },
              {
                label: t("result.fields.ldlCholesterol"),
                value: data.ldlCholesterol,
                unit: "mg/dL",
              },
              {
                label: t("result.fields.triglycerides"),
                value: data.triglyceride,
                unit: "mg/dL",
              },
            ]}
          />

          <ResultGroup
            title={t("result.groups.blood")}
            fields={[
              {
                label: t("result.fields.hemoglobin"),
                value: data.hemoglobin,
                unit: "g/dL",
              },
            ]}
          />

          <ResultGroup
            title={t("result.groups.kidneyFunction")}
            fields={[
              {
                label: t("result.fields.serumCreatinine"),
                value: data.serumCreatinine,
                unit: "mg/dL",
              },
              {
                label: t("result.fields.gfr"),
                value: data.gfr,
                unit: "mL/min",
              },
            ]}
          />

          <ResultGroup
            title={t("result.groups.liverFunction")}
            fields={[
              {
                label: t("result.fields.ast"),
                value: data.astSgot,
                unit: "U/L",
              },
              {
                label: t("result.fields.alt"),
                value: data.altSgpt,
                unit: "U/L",
              },
              {
                label: t("result.fields.gammaGtp"),
                value: data.gammaGtp,
                unit: "U/L",
              },
            ]}
          />
        </ScrollView>
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  stateAction: {
    width: 200,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  headerCard: {
    backgroundColor: "#F0FDF9",
    borderRadius: 14,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  headerDate: {
    fontSize: 18,
    fontWeight: "700",
    color: "#17191C",
  },
  headerPlace: {
    fontSize: 14,
    color: "#64748B",
  },
  judgementBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  judgementText: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.color.sub8.val,
  },
  judgementDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
})

const groupStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#F0F2F5",
    borderRadius: 14,
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 14,
    color: "#64748B",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#17191C",
  },
  unit: {
    fontSize: 12,
    fontWeight: "400",
    color: "#94A3B8",
  },
})
