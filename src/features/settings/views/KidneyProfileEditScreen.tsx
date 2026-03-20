import React, { useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { DatePickerModal } from "@/src/features/settings/components"
import { DIAGNOSIS_CAUSES } from "@/src/features/settings/data/constants"
import { useUserStore } from "@/src/stores/userStore"

export function KidneyProfileEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const profile = useUserStore((s) => s.profile)

  const [heightVal, setHeightVal] = useState(
    profile?.height ? String(profile.height) : "",
  )
  const [weightVal, setWeightVal] = useState(
    profile?.weight ? String(profile.weight) : "",
  )
  const [ckdStage, setCkdStage] = useState<number>(profile?.ckdStage ?? 1)
  const [onDialysis, setOnDialysis] = useState(profile?.onDialysis ?? false)
  const [diagnosisDate, setDiagnosisDate] = useState<{
    year: number
    month: number
  } | null>(null)
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [selectedCauses, setSelectedCauses] = useState<number[]>([])
  const [otherCause, setOtherCause] = useState("")

  const toggleCause = (index: number) => {
    setSelectedCauses((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    )
  }

  const handleSave = () => {
    // TODO: API 호출 및 userStore 업데이트
    router.back()
  }

  const formattedDate = diagnosisDate
    ? `${String(diagnosisDate.month).padStart(2, "0")}/${diagnosisDate.year}`
    : ""

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="신장 프로필 수정"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
        rightElement={
          <Pressable onPress={handleSave} hitSlop={8}>
            <ThemedText style={styles.saveButtonText}>저장</ThemedText>
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
        <ThemedText style={[styles.subsectionTitle, { marginTop: 20 }]}>
          기본 정보
        </ThemedText>
        <View style={styles.basicInfoRow}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>키 (cm)</ThemedText>
            <TextInput
              style={[styles.textInput, { marginTop: 6 }]}
              value={heightVal}
              onChangeText={setHeightVal}
              keyboardType="numeric"
              placeholder="키 입력"
              placeholderTextColor="#C5C8CE"
            />
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>체중 (kg)</ThemedText>
            <TextInput
              style={[styles.textInput, { marginTop: 6 }]}
              value={weightVal}
              onChangeText={setWeightVal}
              keyboardType="numeric"
              placeholder="체중 입력"
              placeholderTextColor="#C5C8CE"
            />
          </View>
        </View>

        {/* CKD 병기 */}
        <View style={[styles.subsectionRow, { marginTop: 24 }]}>
          <ThemedText style={styles.subsectionTitle}>CKD 병기</ThemedText>
          <ThemedText style={styles.currentStageText}>
            현재: {ckdStage}기
          </ThemedText>
        </View>
        <View style={[styles.stageButtonsRow, { marginTop: 8 }]}>
          {[1, 2, 3, 4, 5].map((stage) => (
            <Pressable
              key={stage}
              style={[
                styles.stageButton,
                ckdStage === stage && styles.stageButtonSelected,
              ]}
              onPress={() => setCkdStage(stage)}
            >
              <ThemedText
                style={[
                  styles.stageButtonText,
                  ckdStage === stage && styles.stageButtonTextSelected,
                ]}
              >
                {stage}기
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* 투석 여부 */}
        <View style={[styles.dialysisBox, { marginTop: 12 }]}>
          <View style={styles.dialysisIconContainer}>
            <Ionicons name="pulse-outline" size={24} color="#0D896A" />
          </View>
          <View style={styles.dialysisInfo}>
            <ThemedText style={styles.dialysisTitle}>현재 투석 여부</ThemedText>
            <ThemedText style={styles.dialysisDescription}>
              투석 중이라면 체크해주세요
            </ThemedText>
          </View>
          <Switch
            value={onDialysis}
            onValueChange={setOnDialysis}
            trackColor={{ false: "#E5E7EB", true: "#0D896A" }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        {/* 진단 시기 */}
        <ThemedText style={[styles.subsectionTitle, { marginTop: 36 }]}>
          진단 시기
        </ThemedText>
        <Pressable
          style={[styles.dateInputRow, { marginTop: 8 }]}
          onPress={() => setDatePickerVisible(true)}
        >
          <ThemedText
            style={[
              styles.dateInputText,
              !diagnosisDate && styles.dateInputPlaceholder,
            ]}
          >
            {formattedDate || "mm/yyyy"}
          </ThemedText>
          <Ionicons name="calendar-outline" size={24} color="#94A3B8" />
        </Pressable>

        {/* 주 진단 원인 */}
        <ThemedText style={[styles.subsectionTitle, { marginTop: 36 }]}>
          주 진단 원인
        </ThemedText>
        <View style={[styles.causeButtonsWrap, { marginTop: 8 }]}>
          {DIAGNOSIS_CAUSES.map((cause, index) => (
            <Pressable
              key={index}
              style={[
                styles.causeButton,
                selectedCauses.includes(index) && styles.stageButtonSelected,
              ]}
              onPress={() => toggleCause(index)}
            >
              <ThemedText
                style={[
                  styles.stageButtonText,
                  selectedCauses.includes(index) &&
                    styles.stageButtonTextSelected,
                ]}
              >
                {cause}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.otherCauseInput, { marginTop: 8 }]}
          multiline
          value={otherCause}
          onChangeText={setOtherCause}
          placeholder="기타 원인이 있다면 적어주세요..."
          placeholderTextColor="#C5C8CE"
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.completeButton, { marginTop: 36 }]}
          onPress={handleSave}
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
    backgroundColor: "#FFFFFF",
  },
  saveButtonText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: "#44AF94",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    lineHeight: 16 * 1.4,
    fontWeight: "600",
    color: "#0D896A",
  },
  subsectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#64748B",
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
    color: "#0D896A",
  },
  inputLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: "#0F172A",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#2A2A37",
  },
  basicInfoRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
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
    borderColor: "#E2E8F0",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stageButtonSelected: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.4,
    borderColor: "#44AF94",
  },
  stageButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#0F172A",
  },
  stageButtonTextSelected: {
    color: "#0D896A",
  },
  dialysisBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 12,
  },
  dialysisIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
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
    color: "#0F172A",
  },
  dialysisDescription: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: "#94A3B8",
  },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  dateInputText: {
    fontSize: 16,
    color: "#2A2A37",
  },
  dateInputPlaceholder: {
    color: "#C5C8CE",
  },
  causeButtonsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  causeButton: {
    height: 48,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  otherCauseInput: {
    height: 96,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#2A2A37",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#44AF94",
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
