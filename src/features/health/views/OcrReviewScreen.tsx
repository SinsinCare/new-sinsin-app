import React, { useCallback, useEffect, useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { useLoadingVisible } from "@/src/design-system-v2"
import { OcrReviewSkeleton } from "../components/HealthSkeletons"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { examOcrService, getOcrErrorMessage } from "@/src/services/data"
import { logger } from "@/src/lib/logger"
import type { OcrConfirmItem, OcrReport } from "@/src/features/health/types"
import { useHealthTheme } from "../hooks/useHealthTheme"

import { showErrorToast, showSuccessToast } from "@/src/lib/toast"

// 화면에서 편집 가능한 항목 (id는 React 리스트 key 용 로컬 식별자)
type EditableItem = {
  key: string
  itemId?: number // 서버 추출 항목만 존재. 사용자 추가 항목은 undefined
  examName: string
  rawText: string
  examValue: string
  unit: string
  include: boolean
  mapped: boolean
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function toEditableItems(report: OcrReport): EditableItem[] {
  return report.items.map((item, index) => ({
    key: `srv-${item.itemId}-${index}`,
    itemId: item.itemId,
    examName: item.examName ?? "",
    rawText: item.rawText ?? "",
    examValue: item.examValue ?? "",
    unit: item.unit ?? "",
    include: true,
    mapped: item.mapped,
  }))
}

// 검사일 입력 자동 포맷: 숫자만 추출 후 YYYY-MM-DD 형태로 하이픈 삽입
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

export function OcrReviewScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { t } = useTranslation("health")
  const { healthColors } = useHealthTheme()
  const { reportId: reportIdParam } = useLocalSearchParams<{
    reportId: string
  }>()
  const reportId = Number(reportIdParam)

  const [report, setReport] = useState<OcrReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 캐시/로컬 응답이 빠를 때 스켈레톤이 한 프레임 스쳐 지나가지 않게 한다.
  const showSkeleton = useLoadingVisible(loading)
  const [measuredAt, setMeasuredAt] = useState("")
  const [items, setItems] = useState<EditableItem[]>([])
  const [customSeq, setCustomSeq] = useState(0)
  const [saving, setSaving] = useState(false)

  const loadReport = useCallback(() => {
    if (!reportId) {
      setError(t("ocrReview.missingReport"))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    examOcrService
      .getOcrReport(reportId)
      .then((data) => {
        setReport(data)
        setMeasuredAt(data.measuredAt ?? "")
        setItems(toEditableItems(data))
      })
      .catch((err) => {
        logger.error("[ocr] fetch report failed", err)
        setError(getOcrErrorMessage(err))
      })
      .finally(() => setLoading(false))
  }, [reportId, t])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const alreadyConfirmed = report?.status === "CONFIRMED"
  const includedCount = items.filter(
    (i) => i.include && i.examName.trim() && i.examValue.trim(),
  ).length

  const updateItem = (key: string, patch: Partial<EditableItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    )
  }

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }

  const addCustomItem = () => {
    const seq = customSeq + 1
    setCustomSeq(seq)
    setItems((prev) => [
      ...prev,
      {
        key: `custom-${seq}`,
        examName: "",
        rawText: "",
        examValue: "",
        unit: "",
        include: true,
        mapped: true,
        itemId: undefined,
      },
    ])
  }

  const handleSave = async () => {
    if (saving || alreadyConfirmed) return

    if (!DATE_PATTERN.test(measuredAt)) {
      showErrorToast(
        t("ocrReview.invalidDateTitle"),
        t("ocrReview.invalidDateDescription"),
      )
      return
    }

    // examName이 있는 항목만 전송. include 플래그는 그대로 보내 서버가 저장 여부 판단
    const payloadItems: OcrConfirmItem[] = items
      .filter((i) => i.examName.trim())
      .map((i) => ({
        ...(i.itemId != null ? { itemId: i.itemId } : {}),
        examName: i.examName.trim(),
        examValue: i.examValue.trim(),
        unit: i.unit.trim() ? i.unit.trim() : null,
        include: i.include,
      }))

    if (!payloadItems.some((i) => i.include && i.examValue)) {
      showErrorToast(
        t("ocrReview.noItemsTitle"),
        t("ocrReview.noItemsDescription"),
      )
      return
    }

    setSaving(true)
    try {
      const result = await examOcrService.confirmOcr(reportId, {
        measuredAt,
        items: payloadItems,
      })
      // 저장은 끝났다 — 확인을 받아 낼 이유가 없으니 화면을 닫으며 알린다.
      router.dismissAll()
      showSuccessToast(
        t("ocrReview.saveSuccessTitle"),
        t("ocrReview.saveSuccessDescription", { count: result.savedCount }),
      )
    } catch (err) {
      logger.error("[ocr] confirm failed", err)
      showErrorToast(t("ocrReview.saveErrorTitle"), getOcrErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: healthColors.background }]}
      >
        <ScreenHeader
          title={t("ocrReview.title")}
          paddingTop={insets.top + 8}
          onBack={() => router.back()}
        />
        {showSkeleton ? <OcrReviewSkeleton /> : null}
      </ThemedView>
    )
  }

  if (error || !report) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: healthColors.background }]}
      >
        <ScreenHeader
          title={t("ocrReview.title")}
          paddingTop={insets.top + 8}
          onBack={() => router.back()}
        />
        <View style={styles.center}>
          <ThemedText
            style={[styles.errorText, { color: healthColors.textSecondary }]}
          >
            {error ?? t("ocrReview.fallbackLoadError")}
          </ThemedText>
          <Pressable
            style={[
              styles.retryButton,
              { backgroundColor: healthColors.surfaceMuted },
            ]}
            onPress={loadReport}
          >
            <ThemedText
              style={[styles.retryText, { color: healthColors.text }]}
            >
              {t("ocrReview.retryLoad")}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    )
  }

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: healthColors.background }]}
    >
      <ScreenHeader
        title={t("ocrReview.title")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={[styles.title, { color: healthColors.text }]}>
          {t("ocrReview.heading")}
        </ThemedText>
        <ThemedText
          style={[styles.subtitle, { color: healthColors.textSecondary }]}
        >
          {t("ocrReview.description")}
        </ThemedText>

        {/* 원본 검사지 미리보기 */}
        {report.imageUrl ? (
          <Image
            source={{ uri: report.imageUrl }}
            style={styles.preview}
            contentFit="cover"
          />
        ) : null}

        {alreadyConfirmed && (
          <View
            style={[
              styles.confirmedBanner,
              { backgroundColor: healthColors.positiveWeak },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={tokens.color.sub8.val}
            />
            <ThemedText
              style={[styles.confirmedText, { color: healthColors.positive }]}
            >
              {t("ocrReview.alreadySaved")}
            </ThemedText>
          </View>
        )}

        {/* 검사일 */}
        <View
          style={[
            styles.dateCard,
            {
              backgroundColor: healthColors.surface,
              borderColor: healthColors.line,
            },
          ]}
        >
          <ThemedText
            style={[styles.fieldLabel, { color: healthColors.textSecondary }]}
          >
            {t("ocrReview.examDate")}
          </ThemedText>
          <TextInput
            style={[
              styles.dateInput,
              {
                color: healthColors.text,
                borderColor: healthColors.line,
                backgroundColor: healthColors.surfaceMuted,
              },
            ]}
            value={measuredAt}
            onChangeText={(t) => setMeasuredAt(formatDateInput(t))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={healthColors.textAssistive}
            keyboardType="number-pad"
            maxLength={10}
            editable={!alreadyConfirmed}
          />
          {!report.measuredAt && (
            <ThemedText
              style={[styles.dateHint, { color: healthColors.cautionary }]}
            >
              {t("ocrReview.missingDate")}
            </ThemedText>
          )}
        </View>

        {/* 항목 리스트 */}
        <View style={styles.itemsHeader}>
          <ThemedText
            style={[styles.sectionTitle, { color: healthColors.text }]}
          >
            {t("ocrReview.items")}{" "}
            <ThemedText style={styles.sectionCount}>
              {t("ocrReview.selectedCount", { count: includedCount })}
            </ThemedText>
          </ThemedText>
        </View>

        {items.map((item) => {
          const isUnmapped = !item.mapped
          return (
            <View
              key={item.key}
              style={[
                styles.itemCard,
                {
                  backgroundColor: healthColors.surface,
                  borderColor: healthColors.line,
                },
                isUnmapped && { borderColor: healthColors.cautionary },
              ]}
            >
              <View style={styles.itemTopRow}>
                {/* include 체크박스 */}
                <Pressable
                  style={styles.checkbox}
                  onPress={() =>
                    updateItem(item.key, { include: !item.include })
                  }
                  hitSlop={8}
                  disabled={alreadyConfirmed}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      {
                        backgroundColor: healthColors.surface,
                        borderColor: healthColors.line,
                      },
                      item.include && styles.checkboxBoxChecked,
                    ]}
                  >
                    {item.include && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                </Pressable>

                {/* 검사명 */}
                <View style={styles.itemNameWrap}>
                  {item.itemId == null ? (
                    <TextInput
                      style={[
                        styles.nameInput,
                        {
                          color: healthColors.text,
                          borderBottomColor: healthColors.line,
                        },
                      ]}
                      value={item.examName}
                      onChangeText={(t) =>
                        updateItem(item.key, { examName: t })
                      }
                      placeholder={t("ocrReview.examNamePlaceholder")}
                      placeholderTextColor={healthColors.textAssistive}
                      editable={!alreadyConfirmed}
                    />
                  ) : (
                    <View style={styles.nameRow}>
                      <ThemedText
                        style={[
                          styles.itemName,
                          { color: healthColors.text },
                          isUnmapped && styles.itemNameUnmapped,
                        ]}
                        numberOfLines={1}
                      >
                        {item.examName || t("ocrReview.nameNeedsReview")}
                      </ThemedText>
                      {isUnmapped && (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: healthColors.surfaceMuted },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.badgeText,
                              { color: healthColors.textSecondary },
                            ]}
                          >
                            {t("ocrReview.reviewBadge")}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                  {item.rawText && item.rawText !== item.examName ? (
                    <ThemedText
                      style={[
                        styles.rawText,
                        { color: healthColors.textAssistive },
                      ]}
                      numberOfLines={1}
                    >
                      {t("ocrReview.sourceLabel", { text: item.rawText })}
                    </ThemedText>
                  ) : null}
                </View>

                {/* 삭제 */}
                {!alreadyConfirmed && (
                  <Pressable
                    onPress={() => removeItem(item.key)}
                    hitSlop={8}
                    style={styles.deleteBtn}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={healthColors.textAssistive}
                    />
                  </Pressable>
                )}
              </View>

              {/* 값 / 단위 입력 */}
              <View style={styles.valueRow}>
                <TextInput
                  style={[
                    styles.valueInput,
                    styles.valueInputValue,
                    {
                      color: healthColors.text,
                      backgroundColor: healthColors.surfaceMuted,
                      borderColor: healthColors.line,
                    },
                  ]}
                  value={item.examValue}
                  onChangeText={(t) => updateItem(item.key, { examValue: t })}
                  placeholder={t("ocrReview.valuePlaceholder")}
                  placeholderTextColor={healthColors.textAssistive}
                  editable={!alreadyConfirmed}
                />
                <TextInput
                  style={[
                    styles.valueInput,
                    styles.valueInputUnit,
                    {
                      color: healthColors.text,
                      backgroundColor: healthColors.surfaceMuted,
                      borderColor: healthColors.line,
                    },
                  ]}
                  value={item.unit}
                  onChangeText={(t) => updateItem(item.key, { unit: t })}
                  placeholder={t("ocrReview.unitPlaceholder")}
                  placeholderTextColor={healthColors.textAssistive}
                  editable={!alreadyConfirmed}
                />
              </View>
            </View>
          )
        })}

        {/* 항목 직접 추가 */}
        {!alreadyConfirmed && (
          <Pressable
            style={({ pressed }) => [
              styles.addItemButton,
              {
                borderColor: healthColors.line,
                backgroundColor: healthColors.surface,
              },
              pressed && { backgroundColor: healthColors.surfacePressed },
            ]}
            onPress={addCustomItem}
          >
            <Ionicons name="add" size={18} color={tokens.color.sub6.val} />
            <ThemedText
              style={[styles.addItemText, { color: healthColors.positive }]}
            >
              {t("ocrReview.addItem")}
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>

      <BottomActionBar
        label={saving ? t("actions.saving") : t("actions.save")}
        disabled={saving || alreadyConfirmed || includedCount === 0}
        paddingBottom={insets.bottom + 16}
        onPress={handleSave}
      />
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
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    color: "#17191C",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#94A3B8",
    marginBottom: 4,
  },
  preview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  confirmedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  confirmedText: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.color.sub8.val,
  },
  // 검사일
  dateCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#17191C",
  },
  dateHint: {
    fontSize: 12,
    color: "#F59E0B",
  },
  // 항목 섹션
  itemsHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#17191C",
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "500",
    color: tokens.color.sub6.val,
  },
  // 항목 카드
  itemCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  itemCardUnmapped: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    paddingTop: 1,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxBoxChecked: {
    backgroundColor: tokens.color.sub6.val,
    borderColor: tokens.color.sub6.val,
  },
  itemNameWrap: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#17191C",
    flexShrink: 1,
  },
  itemNameUnmapped: {
    color: "#94A3B8",
  },
  nameInput: {
    fontSize: 15,
    fontWeight: "600",
    color: "#17191C",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 4,
  },
  badge: {
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  rawText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  deleteBtn: {
    padding: 2,
  },
  valueRow: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 32,
  },
  valueInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: "#17191C",
  },
  valueInputValue: {
    flex: 2,
  },
  valueInputUnit: {
    flex: 1,
  },
  // 항목 추가
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  addItemButtonPressed: {
    backgroundColor: "#F0FDF4",
  },
  addItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.color.sub6.val,
  },
})
