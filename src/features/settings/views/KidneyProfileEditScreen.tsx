import React, { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { DatePickerModal } from "@/src/features/settings/components"
import { DIAGNOSIS_CAUSE_OPTIONS } from "@/src/features/settings/data/constants"
import {
  mapKidneyProfileServerFieldErrors,
  validateKidneyProfileInput,
  type KidneyProfileFieldKey,
  type KidneyProfileValidationErrors,
} from "@/src/features/settings/utils/kidneyProfileValidation"
import { api } from "@/src/services/core/apiClient"
import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { toDateStr } from "@/src/features/home/utils/dateUtils"
import { useKidneyProfile } from "@/src/features/settings/hooks/useKidneyProfile"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"
import { presentError } from "@/src/lib/errorMessage"
import { STAGE_OPTIONS, hydrateStage } from "../utils/ckdStage"

const COMORBIDITY_OPTIONS = [
  { key: "DIABETES", labelKey: "kidney.comorbidities.diabetes" },
  { key: "HYPERTENSION", labelKey: "kidney.comorbidities.hypertension" },
  { key: "HEART_DISEASE", labelKey: "kidney.comorbidities.heartDisease" },
  { key: "GOUT", labelKey: "kidney.comorbidities.gout" },
  { key: "ANEMIA", labelKey: "kidney.comorbidities.anemia" },
  { key: "BONE_MINERAL", labelKey: "kidney.comorbidities.boneMineral" },
] as const

const DIAGNOSIS_CAUSE_LABEL_KEYS = {
  DIABETIC_KIDNEY_DISEASE: "kidney.causes.diabetic",
  HYPERTENSION: "kidney.causes.hypertension",
  GLOMERULONEPHRITIS: "kidney.causes.glomerulonephritis",
  POLYCYSTIC_KIDNEY_DISEASE: "kidney.causes.polycystic",
  OTHER: "kidney.causes.other",
} as const

function stageCode(stage: string): string {
  return stage.replace(/^STAGE_/, "").toUpperCase()
}

function extractFieldErrors(error: unknown): unknown {
  if (!isAxiosError(error)) return undefined

  const data = error.response?.data
  if (typeof data !== "object" || data === null || !("fieldErrors" in data)) {
    return undefined
  }

  return data.fieldErrors
}

export function KidneyProfileEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { data: kidneyProfile } = useKidneyProfile()
  const c = useSettingsColors()
  const { t } = useTranslation("settings")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [errors, setErrors] = useState<KidneyProfileValidationErrors>({})
  const heightTouchedRef = useRef(false)
  const weightTouchedRef = useRef(false)

  const [heightVal, setHeightVal] = useState("")
  const [weightVal, setWeightVal] = useState("")
  // 정본 stage 키를 그대로 들고 있는다. 예전에는 number 라 3A/3B 를 표현할 수 없었고,
  // 저장할 때 3 -> STAGE_3A 로 굳어져 3B 환자의 제한이 조용히 완화됐다.
  const [ckdStage, setCkdStage] = useState<string | null>(null)
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

  const localizedFieldError = (field: KidneyProfileFieldKey): string | null => {
    if (!errors[field]) return null
    if (field === "height") {
      if (!heightVal.trim()) return t("kidney.validation.heightRequired")
      return Number.isFinite(Number(heightVal))
        ? t("kidney.validation.heightRange")
        : t("kidney.validation.heightNumber")
    }
    if (field === "weight") {
      if (!weightVal.trim()) return t("kidney.validation.weightRequired")
      return Number.isFinite(Number(weightVal))
        ? t("kidney.validation.weightRange")
        : t("kidney.validation.weightNumber")
    }
    if (field === "otherCause") {
      if (otherCause.trim().length > 500) {
        return t("kidney.validation.otherTooLong")
      }
      return selectedCauses.includes("OTHER")
        ? t("kidney.validation.otherRequired")
        : t("kidney.validation.otherSelect")
    }
    return t("kidney.validation.dateFuture")
  }

  useEffect(() => {
    if (!kidneyProfile || initialized) return
    if (kidneyProfile.ckdStage === "DIALYSIS") {
      setCkdStage("STAGE_5")
      setOnDialysis(true)
    } else {
      // 서버가 준 키를 그대로 쓴다. 예전에는 parseInt 로 숫자만 뽑아
      // STAGE_3B -> 3 -> STAGE_3A 가 됐다.
      setCkdStage(hydrateStage(kidneyProfile.ckdStage))
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

  const clearFieldError = (field: KidneyProfileFieldKey) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const toggleCause = (key: string) => {
    if (key === "OTHER") clearFieldError("otherCause")
    setSelectedCauses((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    )
  }

  const navigateBackOrFallback = () => {
    router.back()
  }

  const handleSave = async () => {
    if (isSubmitting) return
    const validationErrors = validateKidneyProfileInput({
      heightVal,
      weightVal,
      otherCause,
      selectedCauses,
      diagnosisDate,
    })

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      const ckdStageStr = onDialysis
        ? "DIALYSIS"
        : ckdStage != null
          ? ckdStage
          : null
      const diagnosisDateStr = diagnosisDate
        ? `${diagnosisDate.year}-${String(diagnosisDate.month).padStart(2, "0")}-01`
        : null
      const heightNum = Number(heightVal.trim())

      await api.patch("/user/profile/kidney", {
        ckdStage: ckdStageStr,
        isDialysis: onDialysis,
        ...(diagnosisDateStr !== null
          ? { diagnosisDate: diagnosisDateStr }
          : {}),
        diagnosisCauses: selectedCauses,
        diagnosisCauseOther: otherCause.trim() || null,
        comorbidities: selectedComorbidities,
        heightCm: heightNum,
      })

      const weight = Number(weightVal.trim())
      // 반드시 **로컬** 날짜 키여야 한다. toISOString() 은 UTC 기준이라 KST 아침
      // 09시 이전 측정이 전날 키로 저장됐다 — 저장은 upsert 라서 전날의 실제
      // 측정값을 덮어쓰고, 오늘 카드는 빈 채로 남았다. 읽는 쪽은 전부 로컬 날짜다.
      const today = toDateStr(new Date())
      await weightEdemaService.updateWeight(weight, today)

      queryClient.invalidateQueries({ queryKey: ["kidneyProfile"] })
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis"] })
      navigateBackOrFallback()
    } catch (error) {
      const serverErrors = mapKidneyProfileServerFieldErrors(
        extractFieldErrors(error),
      )

      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors)
        return
      }

      // 필드 오류가 아니면 원인은 서버만 안다. 화면 폴백("신장 건강 정보를 저장하지
      // 못했어요")은 그 원인을 덮으면서 알려 주는 것도 없었다.
      presentError(error, {
        scope: "kidney-profile-save",
        retry: () => void handleSave(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeHeight = (text: string) => {
    heightTouchedRef.current = true
    clearFieldError("height")
    setHeightVal(text)
  }

  const handleChangeWeight = (text: string) => {
    weightTouchedRef.current = true
    clearFieldError("weight")
    setWeightVal(text)
  }

  const handleChangeOtherCause = (text: string) => {
    clearFieldError("otherCause")
    setOtherCause(text)
  }

  const formattedDate = diagnosisDate
    ? `${String(diagnosisDate.month).padStart(2, "0")}/${diagnosisDate.year}`
    : ""

  /*
    선택·강조 면. 이 화면만 초록 계열(#F0FDF4 / sub6·sub8)을 쓰고 있어서
    가입·기록·레시피와 색이 따로 놀았다. 브랜드는 #FE7139 하나다
    (theme/tokens.ts: "화면에서 브랜드 색이 필요하면 이걸 쓴다").
    primary1 은 그 브랜드의 가장 옅은 틴트 — 시트의 선택 칩이 쓰는 면과 같다.
  */
  const selectedTintBg = c.isDark ? "#3A2318" : tokens.color.primary1.val

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title={t("kidney.title")}
        paddingTop={insets.top + 8}
        onBack={navigateBackOrFallback}
        rightElement={
          <Pressable onPress={handleSave} hitSlop={8} disabled={isSubmitting}>
            <ThemedText
              style={[styles.saveButtonText, isSubmitting && { opacity: 0.5 }]}
            >
              {isSubmitting ? t("kidney.saving") : t("kidney.save")}
            </ThemedText>
          </Pressable>
        }
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.sectionLabel}>
          {t("kidney.section")}
        </ThemedText>

        {/* 키 / 체중 */}
        <ThemedText
          style={[styles.subsectionTitle, { marginTop: 20, color: c.textSub }]}
        >
          {t("kidney.basic")}
        </ThemedText>
        <View style={styles.basicInfoRow}>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: c.text }]}>
              {t("kidney.height")}
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  marginTop: 6,
                  backgroundColor: c.bg,
                  borderColor: errors.height
                    ? tokens.color.error.val
                    : c.border,
                  color: c.text,
                },
              ]}
              value={heightVal}
              onChangeText={handleChangeHeight}
              keyboardType="numeric"
              placeholder={t("kidney.heightPlaceholder")}
              placeholderTextColor={c.textTertiary}
            />
            {errors.height ? (
              <ThemedText style={styles.fieldError}>
                {localizedFieldError("height")}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: c.text }]}>
              {t("kidney.weight")}
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  marginTop: 6,
                  backgroundColor: c.bg,
                  borderColor: errors.weight
                    ? tokens.color.error.val
                    : c.border,
                  color: c.text,
                },
              ]}
              value={weightVal}
              onChangeText={handleChangeWeight}
              keyboardType="numeric"
              placeholder={t("kidney.weightPlaceholder")}
              placeholderTextColor={c.textTertiary}
            />
            {errors.weight ? (
              <ThemedText style={styles.fieldError}>
                {localizedFieldError("weight")}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* 단백질 목표 안내 */}
        <View
          style={[styles.proteinHintBox, { backgroundColor: selectedTintBg }]}
        >
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={tokens.color.primary.val}
          />
          <ThemedText style={styles.proteinHintText}>
            {t("kidney.proteinNote")}
          </ThemedText>
        </View>

        {/* CKD 병기 */}
        <View style={[styles.subsectionRow, { marginTop: 24 }]}>
          <ThemedText style={[styles.subsectionTitle, { color: c.textSub }]}>
            {t("kidney.stage.title")}
          </ThemedText>
          <ThemedText style={styles.currentStageText}>
            {ckdStage != null
              ? t("kidney.stage.current", {
                  stage: t("kidney.stage.value", {
                    stage: stageCode(ckdStage),
                  }),
                })
              : ""}
          </ThemedText>
        </View>
        <View style={[styles.stageButtonsRow, { marginTop: 8 }]}>
          {STAGE_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: ckdStage === option.key }}
              accessibilityLabel={t("kidney.stage.accessibility", {
                stage: stageCode(option.key),
              })}
              style={[
                styles.stageButton,
                { borderColor: c.border },
                ckdStage === option.key && {
                  backgroundColor: selectedTintBg,
                  borderWidth: 1.4,
                  borderColor: tokens.color.primary.val,
                },
              ]}
              onPress={() => setCkdStage(option.key)}
            >
              <ThemedText
                style={[
                  styles.stageButtonText,
                  { color: c.text },
                  ckdStage === option.key && styles.stageButtonTextSelected,
                ]}
              >
                {t("kidney.stage.value", {
                  stage: stageCode(option.key),
                })}
              </ThemedText>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: ckdStage === null }}
            accessibilityLabel={t("kidney.stage.noneAccessibility")}
            style={[
              styles.stageButton,
              { borderColor: c.border },
              ckdStage === null && {
                backgroundColor: selectedTintBg,
                borderWidth: 1.4,
                borderColor: tokens.color.primary.val,
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
              {t("kidney.stage.none")}
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
              { backgroundColor: selectedTintBg },
            ]}
          >
            <Ionicons
              name="pulse-outline"
              size={24}
              color={tokens.color.primary.val}
            />
          </View>
          <View style={styles.dialysisInfo}>
            <ThemedText style={[styles.dialysisTitle, { color: c.text }]}>
              {t("kidney.dialysis.title")}
            </ThemedText>
            <ThemedText
              style={[styles.dialysisDescription, { color: c.textMuted }]}
            >
              {t("kidney.dialysis.body")}
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel={t("kidney.dialysis.accessibility")}
            value={onDialysis}
            onValueChange={setOnDialysis}
            trackColor={{ false: c.border, true: tokens.color.primary.val }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={c.border}
          />
        </View>

        {/* 진단 시기 */}
        <ThemedText
          style={[styles.subsectionTitle, { marginTop: 36, color: c.textSub }]}
        >
          {t("kidney.diagnosisDate")}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("kidney.diagnosisDateAccessibility")}
          style={[
            styles.dateInputRow,
            {
              marginTop: 8,
              borderColor: errors.diagnosisDate
                ? tokens.color.error.val
                : c.border,
              backgroundColor: c.bg,
            },
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
        {errors.diagnosisDate ? (
          <ThemedText style={styles.fieldError}>
            {localizedFieldError("diagnosisDate")}
          </ThemedText>
        ) : null}

        {/* 주 진단 원인 */}
        <ThemedText
          style={[styles.subsectionTitle, { marginTop: 36, color: c.textSub }]}
        >
          {t("kidney.diagnosisCause")}
        </ThemedText>
        <View style={[styles.causeButtonsWrap, { marginTop: 8 }]}>
          {DIAGNOSIS_CAUSE_OPTIONS.map((cause) => (
            <Pressable
              key={cause.key}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: selectedCauses.includes(cause.key),
              }}
              style={[
                styles.causeButton,
                { borderColor: c.border },
                selectedCauses.includes(cause.key) && {
                  backgroundColor: selectedTintBg,
                  borderWidth: 1.4,
                  borderColor: tokens.color.primary.val,
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
                {t(DIAGNOSIS_CAUSE_LABEL_KEYS[cause.key])}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[
            styles.otherCauseInput,
            {
              marginTop: 8,
              borderColor: errors.otherCause
                ? tokens.color.error.val
                : c.border,
              color: c.text,
              backgroundColor: c.bg,
            },
          ]}
          multiline
          value={otherCause}
          onChangeText={handleChangeOtherCause}
          placeholder={t("kidney.otherCausePlaceholder")}
          placeholderTextColor={c.textTertiary}
          textAlignVertical="top"
        />
        {errors.otherCause ? (
          <ThemedText style={styles.fieldError}>
            {localizedFieldError("otherCause")}
          </ThemedText>
        ) : null}

        {/* 동반 질환 */}
        <ThemedText
          style={[styles.subsectionTitle, { marginTop: 36, color: c.textSub }]}
        >
          {t("kidney.comorbiditiesTitle")}
        </ThemedText>
        <View style={[styles.causeButtonsWrap, { marginTop: 8 }]}>
          {COMORBIDITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: selectedComorbidities.includes(opt.key),
              }}
              style={[
                styles.causeButton,
                { borderColor: c.border },
                selectedComorbidities.includes(opt.key) && {
                  backgroundColor: selectedTintBg,
                  borderWidth: 1.4,
                  borderColor: tokens.color.primary.val,
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
                {t(opt.labelKey)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("kidney.saveAccessibility")}
          style={[
            styles.completeButton,
            { marginTop: 36 },
            isSubmitting && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
          <ThemedText style={styles.completeButtonText}>
            {t("kidney.save")}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <DatePickerModal
        visible={datePickerVisible}
        selected={diagnosisDate}
        onClose={() => setDatePickerVisible(false)}
        onSelect={(year, month) => {
          clearFieldError("diagnosisDate")
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
    color: tokens.color.primary.val,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    lineHeight: 16 * 1.4,
    fontWeight: "600",
    color: tokens.color.primary.val,
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
    color: tokens.color.primary.val,
  },
  inputLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: tokens.color.error.val,
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
    color: tokens.color.primary.val,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  // 칩이 7개다. 한 줄에 밀어 넣으면 칸당 글자 상자가 37pt 인데 영어 라벨은
  // "Stage 1"(50pt) 이라 "Stag"/"e 1" 로 글자 중간에서 쪼개졌다. 줄바꿈을 허용하고
  // 고정 높이를 최소 높이로 바꿔 두 줄이 되어도 잘리지 않게 한다.
  stageButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stageButton: {
    minWidth: 76,
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stageButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },
  stageButtonTextSelected: {
    color: tokens.color.primary.val,
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
    backgroundColor: tokens.color.primary.val,
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
