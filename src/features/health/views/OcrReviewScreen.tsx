import React, { useCallback, useEffect, useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { examOcrService, getOcrErrorMessage } from "@/src/services/data"
import { logger } from "@/src/lib/logger"
import type { OcrConfirmItem, OcrReport } from "@/src/features/health/types"

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
  const router = useRouter()
  const { reportId: reportIdParam } = useLocalSearchParams<{
    reportId: string
  }>()
  const reportId = Number(reportIdParam)

  const [report, setReport] = useState<OcrReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [measuredAt, setMeasuredAt] = useState("")
  const [items, setItems] = useState<EditableItem[]>([])
  const [customSeq, setCustomSeq] = useState(0)
  const [saving, setSaving] = useState(false)

  const loadReport = useCallback(() => {
    if (!reportId) {
      setError("잘못된 접근입니다.")
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
  }, [reportId])

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
      Alert.alert(
        "검사일 확인",
        "검사일을 YYYY-MM-DD 형식으로 입력해주세요. (예: 2026-05-01)",
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
      Alert.alert("항목 선택", "저장할 항목을 최소 1개 이상 선택해주세요.")
      return
    }

    setSaving(true)
    try {
      const result = await examOcrService.confirmOcr(reportId, {
        measuredAt,
        items: payloadItems,
      })
      Alert.alert(
        "저장 완료",
        `${result.savedCount}건의 검사 결과가 저장되었어요.`,
        [
          {
            text: "확인",
            onPress: () => router.dismissAll(),
          },
        ],
      )
    } catch (err) {
      logger.error("[ocr] confirm failed", err)
      Alert.alert("저장 실패", getOcrErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader
          title="검사 결과 확인"
          paddingTop={insets.top + 8}
          onBack={() => router.back()}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.color.sub6.val} />
        </View>
      </ThemedView>
    )
  }

  if (error || !report) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader
          title="검사 결과 확인"
          paddingTop={insets.top + 8}
          onBack={() => router.back()}
        />
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>
            {error ?? "데이터를 불러올 수 없습니다."}
          </ThemedText>
          <Pressable style={styles.retryButton} onPress={loadReport}>
            <ThemedText style={styles.retryText}>다시 시도</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="검사 결과 확인"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.title}>
          추출된 검사 수치를 확인해주세요
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          잘못 인식된 값은 직접 수정하고, 저장할 항목을 선택할 수 있어요.
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
          <View style={styles.confirmedBanner}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={tokens.color.sub8.val}
            />
            <ThemedText style={styles.confirmedText}>
              이미 저장이 완료된 검사지입니다.
            </ThemedText>
          </View>
        )}

        {/* 검사일 */}
        <View style={styles.dateCard}>
          <ThemedText style={styles.fieldLabel}>검사일</ThemedText>
          <TextInput
            style={styles.dateInput}
            value={measuredAt}
            onChangeText={(t) => setMeasuredAt(formatDateInput(t))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={10}
            editable={!alreadyConfirmed}
          />
          {!report.measuredAt && (
            <ThemedText style={styles.dateHint}>
              검사지에서 검사일을 인식하지 못했어요. 직접 입력해주세요.
            </ThemedText>
          )}
        </View>

        {/* 항목 리스트 */}
        <View style={styles.itemsHeader}>
          <ThemedText style={styles.sectionTitle}>
            검사 항목{" "}
            <ThemedText style={styles.sectionCount}>
              {includedCount}개 선택됨
            </ThemedText>
          </ThemedText>
        </View>

        {items.map((item) => {
          const isUnmapped = !item.mapped
          return (
            <View
              key={item.key}
              style={[styles.itemCard, isUnmapped && styles.itemCardUnmapped]}
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
                      style={styles.nameInput}
                      value={item.examName}
                      onChangeText={(t) =>
                        updateItem(item.key, { examName: t })
                      }
                      placeholder="검사 항목명"
                      placeholderTextColor="#94A3B8"
                      editable={!alreadyConfirmed}
                    />
                  ) : (
                    <View style={styles.nameRow}>
                      <ThemedText
                        style={[
                          styles.itemName,
                          isUnmapped && styles.itemNameUnmapped,
                        ]}
                        numberOfLines={1}
                      >
                        {item.examName || "(미상 항목)"}
                      </ThemedText>
                      {isUnmapped && (
                        <View style={styles.badge}>
                          <ThemedText style={styles.badgeText}>
                            미인식
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                  {item.rawText && item.rawText !== item.examName ? (
                    <ThemedText style={styles.rawText} numberOfLines={1}>
                      원문: {item.rawText}
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
                    <Ionicons name="close" size={18} color="#94A3B8" />
                  </Pressable>
                )}
              </View>

              {/* 값 / 단위 입력 */}
              <View style={styles.valueRow}>
                <TextInput
                  style={[styles.valueInput, styles.valueInputValue]}
                  value={item.examValue}
                  onChangeText={(t) => updateItem(item.key, { examValue: t })}
                  placeholder="수치"
                  placeholderTextColor="#94A3B8"
                  editable={!alreadyConfirmed}
                />
                <TextInput
                  style={[styles.valueInput, styles.valueInputUnit]}
                  value={item.unit}
                  onChangeText={(t) => updateItem(item.key, { unit: t })}
                  placeholder="단위"
                  placeholderTextColor="#94A3B8"
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
              pressed && styles.addItemButtonPressed,
            ]}
            onPress={addCustomItem}
          >
            <Ionicons name="add" size={18} color={tokens.color.sub6.val} />
            <ThemedText style={styles.addItemText}>항목 직접 추가</ThemedText>
          </Pressable>
        )}
      </ScrollView>

      <BottomActionBar
        label={saving ? "저장 중..." : "저장하기"}
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
