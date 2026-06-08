import React, { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { DatePickerModal } from "@/src/features/settings/components"
import { DIAGNOSIS_CAUSE_OPTIONS } from "@/src/features/settings/data/constants"
import { api } from "@/src/services/core/apiClient"
import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { useKidneyProfile } from "@/src/features/settings/hooks/useKidneyProfile"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"

const COMORBIDITY_OPTIONS = [
  { key: "DIABETES", label: "당뇨" },
  { key: "HYPERTENSION", label: "고혈압" },
  { key: "HEART_DISEASE", label: "심장질환" },
  { key: "GOUT", label: "통풍" },
  { key: "ANEMIA", label: "빈혈" },
  { key: "BONE_MINERAL", label: "골미네랄 장애" },
]

export function KidneyProfileEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: kidneyProfile } = useKidneyProfile()
  const c = useSettingsColors()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const heightTouchedRef = useRef(false)
  const weightTouchedRef = useRef(false)

  const [heightVal, setHeightVal] = useState("")
  const [weightVal, setWeightVal] = useState("")
  const [ckdStage, setCkdStage] = useState<number | null>(null)
  const [onDialysis, setOnDialysis] = useState(false)
  const [diagnosisDate, setDiagnosisDate] = useState<{
    year: number
    month: number
  } | null>(null)
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])
  const [otherCause, setOtherCause] = useState("")
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>(
    [],
  )

  useEffect(() => {
    if (!kidneyProfile || initialized) return
    if (kidneyProfile.ckdStage === "DIALYSIS") {
      setCkdStage(5)
      setOnDialysis(true)
    } else {
      const num = parseInt((kidneyProfile.ckdStage ?? "").replace(/\D/g, ""))
      setCkdStage(num || null)
      setOnDialysis(kidneyProfile.isDialysis)
    }
    if (kidneyProfile.diagnosisDate) {
      const parts = kidneyProfile.diagnosisDate.split("-")
      if (parts.length >= 2) {
        setDiagnosisDate({
          year: parseInt(parts[0]),
          month: parseInt(parts[1]),
        })
      }
    }
    if (!heightTouchedRef.current && kidneyProfile.heightCm != null)
      setHeightVal(String(kidneyProfile.heightCm))
    if (!weightTouchedRef.current && kidneyProfile.weightKg != null)
      setWeightVal(String(kidneyProfile.weightKg))
    setSelectedCauses(kidneyProfile.diagnosisCauses ?? [])
    setOtherCause(kidneyProfile.diagnosisCauseOther ?? "")
    setSelectedComorbidities(kidneyProfile.comorbidities ?? [])
    setInitialized(true)
  }, [kidneyProfile, initialized])

  const toggleComorbidity = (key: string) => {
    setSelectedComorbidities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const toggleCause = (key: string) => {
    setSelectedCauses((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    )
  }

  const CKD_STAGE_MAP: Record<number, string> = {
    1: "STAGE_1",
    2: "STAGE_2",
    3: "STAGE_3A",
    4: "STAGE_4",
    5: "STAGE_5",
  }

  const handleSave = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const ckdStageStr = onDialysis
        ? "DIALYSIS"
        : ckdStage != null
          ? (CKD_STAGE_MAP[ckdStage] ?? null)
          : null
      const diagnosisDateStr = diagnosisDate
        ? `${diagnosisDate.year}-${String(diagnosisDate.month).padStart(2, "0")}-01`
        : null
      const heightNum = parseFloat(heightVal)

      await api.patch("/user/profile/kidney", {
        ckdStage: ckdStageStr,
        isDialysis: onDialysis,
        ...(diagnosisDateStr !== null
          ? { diagnosisDate: diagnosisDateStr }
          : {}),
        diagnosisCauses: selectedCauses,
        diagnosisCauseOther: otherCause.trim() || null,
        comorbidities: selectedComorbidities,
        ...(!isNaN(heightNum) && heightNum > 0 ? { heightCm: heightNum } : {}),
      })

      const weight = parseFloat(weightVal)
      if (!isNaN(weight) && weight > 0) {
        const today = new Date().toISOString().split("T")[0]
        await weightEdemaService.updateWeight(weight, today)
      }

      queryClient.invalidateQueries({ queryKey: ["kidneyProfile"] })
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis"] })
      router.back()
    } catch {
      Alert.alert("오류", "저장에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeHeight = (text: string) => {
    heightTouchedRef.current = true
    setHeightVal(text)
  }

  const handleChangeWeight = (text: string) => {
    weightTouchedRef.current = true
    setWeightVal(text)
  }

  const formattedDate = diagnosisDate
    ? `${String(diagnosisDate.month).padStart(2, "0")}/${diagnosisDate.year}`
    : ""

  const greenTintBg = c.isDark ? "#1A3A2E" : "#F0FDF4"

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title="신장 프로필 수정"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
        rightElement={
          <Pressable onPress={handleSave} hitSlop={8} disabled={isSubmitting}>
            <ThemedText
              style={[styles.saveButtonText, isSubmitting && { opacity: 0.5 }]}
            >
              {isSubmitting ? "저장 중..." : "저장"}
            </ThemedText>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.sectionLabel}>나의 신장 프로필</ThemedText>

        {/* 키 / 체중 */}
        <ThemedText
          style={[styles.subsectionTitle, { marginTop: 20, color: c.textSub }]}
        >
          기본 정보
        </ThemedText>
        <View style={styles.basicInfoRow}>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: c.text }]}>
              키 (cm)
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  marginTop: 6,
                  backgroundColor: c.bg,
                  borderColor: c.border,
                  color: c.text,
                },
              ]}
              value={heightVal}
              onChangeText={handleChangeHeight}
              keyboardType="numeric"
              placeholder="키 입력"
              placeholderTextColor={c.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: c.text }]}>
              체중 (kg)
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  marginTop: 6,
                  backgroundColor: c.bg,
                  borderColor: c.border,
                  color: c.text,
                },
              ]}
              value={weightVal}
              onChangeText={handleChangeWeight}
              keyboardType="numeric"
              placeholder="체중 입력"
              placeholderTextColor={c.textTertiary}
            />
          </View>
        </View>

        {/* 단백질 권장 섭취량 안내 */}
        <View style={[styles.proteinHintBox, { backgroundColor: greenTintBg }]}>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={tokens.color.sub8.val}
          />
          <ThemedText style={styles.proteinHintText}>
            {weightVal && !isNaN(parseFloat(weightVal))
              ? `체중 ${weightVal}kg → 하루 단백질 ${Math.round(parseFloat(weightVal) * 0.8)}g 이내 권장 (1kg당 0.8g)`
              : "CKD 환자 단백질 권장 섭취량: 체중 1kg당 0.8g"}
          </ThemedText>
        </View>

        {/* CKD 병기 */}
        <View style={[styles.subsectionRow, { marginTop: 24 }]}>
          <ThemedText style={[styles.subsectionTitle, { color: c.textSub }]}>
            CKD 병기
          </ThemedText>
          <ThemedText style={styles.currentStageText}>
            {ckdStage != null ? `현재: ${ckdStage}기` : ""}
          </ThemedText>
        </View>
        <View style={[styles.stageButtonsRow, { marginTop: 8 }]}>
          {[1, 2, 3, 4, 5].map((stage) => (
            <Pressable
              key={stage}
              style={[
                styles.stageButton,
                { borderColor: c.border },
                ckdStage === stage && {
                  backgroundColor: greenTintBg,
                  borderWidth: 1.4,
                  borderColor: tokens.color.sub6.val,
                },
              ]}
              onPress={() => setCkdStage(stage)}
            >
              <ThemedText
                style={[
                  styles.stageButtonText,
                  { color: c.text },
                  ckdStage === stage && styles.stageButtonTextSelected,
                ]}
              >
                {stage}기
              </ThemedText>
            </Pressable>
          ))}
          <Pressable
            style={[
              styles.stageButton,
              { borderColor: c.border },
              ckdStage === null && {
                backgroundColor: greenTintBg,
                borderWidth: 1.4,
                borderColor: tokens.color.sub6.val,
              },
            ]}
            onPress={() => {
              setCkdStage(null)
              setOnDialysis(false)
            }}
          >
            <ThemedText
              style={[
                styles.stageButtonText,
                { color: c.text },
                ckdStage === null && styles.stageButtonTextSelected,
              ]}
            >
              없음
            </ThemedText>
          </Pressable>
        </View>

        {/* 투석 여부 */}
        <View
          style={[
            styles.dialysisBox,
            { marginTop: 12, borderColor: c.isDark ? c.border : "#F1F5F9" },
          ]}
        >
          <View
            style={[
              styles.dialysisIconContainer,
              { backgroundColor: greenTintBg },
            ]}
          >
            <Ionicons
              name="pulse-outline"
              size={24}
              color={tokens.color.sub8.val}
            />
          </View>
          <View style={styles.dialysisInfo}>
            <ThemedText style={[styles.dialysisTitle, { color: c.text }]}>
              현재 투석 여부
            </ThemedText>
            <ThemedText
              style={[styles.dialysisDescription, { color: c.textMuted }]}
            >
              투석 중이라면 체크해주세요
            </ThemedText>
          </View>
          <Switch
            value={onDialysis}
            onValueChange={setOnDialysis}
            trackColor={{ false: c.border, true: tokens.color.sub8.val }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={c.border}
          />
        </View>

        {/* 진단 시기 */}
        <ThemedText
          style={[styles.subsectionTitle, { marginTop: 36, color: c.textSub }]}
        >
          진단 시기
        </ThemedText>
        <Pressable
          style={[
            styles.dateInputRow,
            { marginTop: 8, borderColor: c.border, backgroundColor: c.bg },
          ]}
          onPress={() => setDatePickerVisible(true)}
        >
          <ThemedText
            style={[
              styles.dateInputText,
              { color: c.text },
              !diagnosisDate && { color: c.textTertiary },
            ]}
          >
            {formattedDate || "mm/yyyy"}
          </ThemedText>
          <Ionicons name="calendar-outline" size={24} color={c.textMuted} />
        </Pressable>

        {/* 주 진단 원인 */}
        <ThemedText
          style={[styles.subsectionTitle, { marginTop: 36, color: c.textSub }]}
        >
          주 진단 원인
        </ThemedText>
        <View style={[styles.causeButtonsWrap, { marginTop: 8 }]}>
          {DIAGNOSIS_CAUSE_OPTIONS.map((cause) => (
            <Pressable
              key={cause.key}
              style={[
                styles.causeButton,
                { borderColor: c.border },
                selectedCauses.includes(cause.key) && {
                  backgroundColor: greenTintBg,
                  borderWidth: 1.4,
                  borderColor: tokens.color.sub6.val,
                },
              ]}
              onPress={() => toggleCause(cause.key)}
            >
              <ThemedText
                style={[
                  styles.stageButtonText,
                  { color: c.text },
                  selectedCauses.includes(cause.key) &&
                    styles.stageButtonTextSelected,
                ]}
              >
                {cause.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[
            styles.otherCauseInput,
            {
              marginTop: 8,
              borderColor: c.border,
              color: c.text,
              backgroundColor: c.bg,
            },
          ]}
          multiline
          value={otherCause}
          onChangeText={setOtherCause}
          placeholder="기타 원인이 있다면 적어주세요..."
          placeholderTextColor={c.textTertiary}
          textAlignVertical="top"
        />

        {/* 동반 질환 */}
        <ThemedText
          style={[styles.subsectionTitle, { marginTop: 36, color: c.textSub }]}
        >
          동반 질환
        </ThemedText>
        <View style={[styles.causeButtonsWrap, { marginTop: 8 }]}>
          {COMORBIDITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              style={[
                styles.causeButton,
                { borderColor: c.border },
                selectedComorbidities.includes(opt.key) && {
                  backgroundColor: greenTintBg,
                  borderWidth: 1.4,
                  borderColor: tokens.color.sub6.val,
                },
              ]}
              onPress={() => toggleComorbidity(opt.key)}
            >
              <ThemedText
                style={[
                  styles.stageButtonText,
                  { color: c.text },
                  selectedComorbidities.includes(opt.key) &&
                    styles.stageButtonTextSelected,
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[
            styles.completeButton,
            { marginTop: 36 },
            isSubmitting && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
          <ThemedText style={styles.completeButtonText}>저장하기</ThemedText>
        </Pressable>
      </ScrollView>

      <DatePickerModal
        visible={datePickerVisible}
        selected={diagnosisDate}
        onClose={() => setDatePickerVisible(false)}
        onSelect={(year, month) => {
          setDiagnosisDate({ year, month })
          setDatePickerVisible(false)
        }}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveButtonText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: tokens.color.sub6.val,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    lineHeight: 16 * 1.4,
    fontWeight: "600",
    color: tokens.color.sub8.val,
  },
  subsectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  subsectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentStageText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: tokens.color.sub8.val,
  },
  inputLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  basicInfoRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  proteinHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  proteinHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: tokens.color.sub8.val,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  stageButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  stageButton: {
    flex: 1,
    height: 48,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stageButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  stageButtonTextSelected: {
    color: tokens.color.sub8.val,
  },
  dialysisBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  dialysisIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dialysisInfo: {
    flex: 1,
    gap: 2,
  },
  dialysisTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  dialysisDescription: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dateInputText: {
    fontSize: 16,
  },
  causeButtonsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  causeButton: {
    height: 48,
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  otherCauseInput: {
    height: 96,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: tokens.color.sub6.val,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  completeButtonText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})
