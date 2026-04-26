import React, { useEffect, useState } from "react"
import { StyleSheet, View, ScrollView, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { nhisService } from "@/src/services/data/nhisService"
import type { HealthCheckResultDetailRs } from "@/src/types/nhis"

type ResultField = { label: string; value: string; unit?: string }

function ResultGroup({
  title,
  fields,
}: {
  title: string
  fields: ResultField[]
}) {
  return (
    <View style={groupStyles.container}>
      <ThemedText style={groupStyles.title}>{title}</ThemedText>
      {fields.map((f, i) => (
        <View
          key={f.label}
          style={[
            groupStyles.row,
            i === fields.length - 1 && groupStyles.rowLast,
          ]}
        >
          <ThemedText style={groupStyles.label}>{f.label}</ThemedText>
          <ThemedText style={groupStyles.value}>
            {f.value || "-"}
            {f.unit && f.value ? (
              <ThemedText style={groupStyles.unit}> {f.unit}</ThemedText>
            ) : null}
          </ThemedText>
        </View>
      ))}
    </View>
  )
}

export function HealthDataResultDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { resultId } = useLocalSearchParams<{ resultId: string }>()

  const [data, setData] = useState<HealthCheckResultDetailRs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!resultId) return
    nhisService
      .getHealthCheckResultById(resultId)
      .then(setData)
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false))
  }, [resultId])

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="검진 결과 상세"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.color.sub6.val} />
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {data && (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerCard}>
            <ThemedText style={styles.headerDate}>
              {data.checkupDate}
            </ThemedText>
            <ThemedText style={styles.headerPlace}>
              {data.checkupPlace}
            </ThemedText>
            {data.judgement ? (
              <View style={styles.judgementBadge}>
                <ThemedText style={styles.judgementText}>
                  종합 판정: {data.judgement}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <ResultGroup
            title="신체 계측"
            fields={[
              { label: "신장", value: data.height, unit: "cm" },
              { label: "체중", value: data.weight, unit: "kg" },
              { label: "체질량지수 (BMI)", value: data.bmi, unit: "kg/m²" },
              { label: "허리둘레", value: data.waistCircumference, unit: "cm" },
            ]}
          />

          <ResultGroup
            title="혈압"
            fields={[
              {
                label: "수축기 혈압",
                value: data.bloodPressureSystolic,
                unit: "mmHg",
              },
              {
                label: "이완기 혈압",
                value: data.bloodPressureDiastolic,
                unit: "mmHg",
              },
            ]}
          />

          <ResultGroup
            title="혈당"
            fields={[
              {
                label: "공복 혈당",
                value: data.fastingBloodSugar,
                unit: "mg/dL",
              },
            ]}
          />

          <ResultGroup
            title="콜레스테롤"
            fields={[
              {
                label: "총 콜레스테롤",
                value: data.totalCholesterol,
                unit: "mg/dL",
              },
              {
                label: "HDL 콜레스테롤",
                value: data.hdlCholesterol,
                unit: "mg/dL",
              },
              {
                label: "LDL 콜레스테롤",
                value: data.ldlCholesterol,
                unit: "mg/dL",
              },
              { label: "중성지방", value: data.triglyceride, unit: "mg/dL" },
            ]}
          />

          <ResultGroup
            title="혈액"
            fields={[{ label: "혈색소", value: data.hemoglobin, unit: "g/dL" }]}
          />

          <ResultGroup
            title="신장 기능"
            fields={[
              {
                label: "혈청 크레아티닌",
                value: data.serumCreatinine,
                unit: "mg/dL",
              },
              {
                label: "신사구체 여과율 (GFR)",
                value: data.gfr,
                unit: "mL/min",
              },
            ]}
          />

          <ResultGroup
            title="간 기능"
            fields={[
              { label: "AST (SGOT)", value: data.astSgot, unit: "U/L" },
              { label: "ALT (SGPT)", value: data.altSgpt, unit: "U/L" },
              { label: "감마-GTP", value: data.gammaGtp, unit: "U/L" },
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
  },
  errorText: {
    fontSize: 15,
    color: "#64748B",
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
