import { useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useTranslation } from "react-i18next"

import { V2Disclosure, V2Text } from "@/src/design-system-v2"
import { fontFamily } from "@/src/design-system-v2/tokens/typography"
import { useSurface } from "@/src/hooks/useSurface"
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
import { presentError } from "@/src/lib/errorMessage"
import { STAGE_OPTIONS, hydrateStage, toServerStage } from "../utils/ckdStage"

import { RecordPageShell } from "@/src/features/home/components/record/pages/RecordPageShell"
import { RecordNumberField } from "@/src/features/home/components/record/pages/RecordNumberField"
import {
  RecordChoices,
  RecordMultiChoices,
} from "@/src/features/home/components/record/pages/RecordChoices"
import { RecordFieldHint } from "@/src/features/home/components/record/pages/RecordFieldHint"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import {
  FIELD,
  FORM,
  PAGE_X,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

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

/** 병기 칩의 값. `null`(없음)은 문자열 칩 값이 될 수 없어 sentinel 로 옮긴다. */
const STAGE_NONE = "NONE" as const
type StageChoice = (typeof STAGE_OPTIONS)[number]["key"] | typeof STAGE_NONE
type DialysisChoice = "YES" | "NO"

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

/**
 * 신장 건강 정보 수정 — 홈 건강기록 6페이지와 **같은 시스템**으로 그린다(2026-09-12).
 *
 * 뼈대는 `RecordPageShell`(큰 제목·안내문·하단 고정 CTA·키보드 도킹), 숫자는
 * `RecordNumberField`, 고르는 것은 `RecordChoices`/`RecordMultiChoices`, 오류는
 * `RecordFieldHint` 다. 치수·타이포는 `recordPageSpec` 한 벌에서만 온다 — 예전 화면은
 * 설정 전용 색·초록 틴트·자체 칩을 따로 들고 있어 홈과 다른 앱처럼 읽혔다.
 *
 * 저장 규칙은 재설계 전과 같다(아래 각 주석).
 */
export function KidneyProfileEditScreen() {
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { data: kidneyProfile } = useKidneyProfile()
  const s = useSurface()
  const { t } = useTranslation("settings")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [errors, setErrors] = useState<KidneyProfileValidationErrors>({})
  const heightTouchedRef = useRef(false)
  const weightTouchedRef = useRef(false)
  const heightRef = useRef<TextInput>(null)
  const weightRef = useRef<TextInput>(null)

  const [heightVal, setHeightVal] = useState("")
  const [weightVal, setWeightVal] = useState("")
  /*
    정본 stage 키를 그대로 들고 있는다. **세 값이다**: 단계 키 · `null`(사용자가 `없음` 을
    고름) · `undefined`(아직 모른다 — 프로필을 못 불러왔거나 서버 값이 아는 표기가 아니다).
    `undefined` 자리가 없으면 프로필이 도착하기 전에 저장을 누를 때 `ckdStage: null` 이 나가
    **서버가 CKD 를 지운다**(QA 2026-08-05). 지우는 것은 `없음` 을 직접 골랐을 때만.
  */
  const [ckdStage, setCkdStage] = useState<string | null | undefined>(undefined)
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
  const [otherFocused, setOtherFocused] = useState(false)

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
      // 서버가 준 키를 그대로 쓴다(STAGE_3B 가 3 → STAGE_3A 로 굳던 사고 방지).
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

  const clearFieldError = (field: KidneyProfileFieldKey) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const toggleComorbidity = (key: string) => {
    setSelectedComorbidities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const toggleCause = (key: string) => {
    if (key === "OTHER") clearFieldError("otherCause")
    setSelectedCauses((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    )
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
      const diagnosisDateStr = diagnosisDate
        ? `${diagnosisDate.year}-${String(diagnosisDate.month).padStart(2, "0")}-01`
        : null
      const heightNum = Number(heightVal.trim())
      /*
        **병기 축은 정해졌을 때만 보낸다.** 서버는 키가 없으면 "건드리지 마라", `null` 이면
        "CKD 아님으로 지워라" 로 읽는다. 규칙은 `utils/ckdStage.ts::toServerStage` 하나다.
      */
      const serverStage = toServerStage(ckdStage, onDialysis)
      const stageAxis =
        serverStage === undefined ? {} : { ckdStage: serverStage }

      await api.patch("/user/profile/kidney", {
        ...stageAxis,
        isDialysis: onDialysis,
        ...(diagnosisDateStr !== null
          ? { diagnosisDate: diagnosisDateStr }
          : {}),
        diagnosisCauses: selectedCauses,
        diagnosisCauseOther: otherCause.trim() || null,
        comorbidities: selectedComorbidities,
        heightCm: heightNum,
      })

      /*
        체중은 **사용자가 실제로 고쳤을 때만** 오늘 기록으로 남긴다 — `/weight-records` 는
        upsert 라 무조건 부르면 오늘 아침에 잰 진짜 체중을 프로필 값이 덮어쓴다.
      */
      const weight = Number(weightVal.trim())
      const weightChanged =
        weightTouchedRef.current && weight !== kidneyProfile?.weightKg
      if (weightChanged) {
        // 로컬 날짜 키여야 한다(UTC 로 만들면 KST 아침 측정이 전날 키가 된다).
        const today = toDateStr(new Date())
        await weightEdemaService.updateWeight(weight, today)
      }

      queryClient.invalidateQueries({ queryKey: ["kidneyProfile"] })
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis"] })
      if (weightChanged) {
        queryClient.invalidateQueries({ queryKey: ["weightRecords"] })
      }
      router.back()
    } catch (error) {
      const serverErrors = mapKidneyProfileServerFieldErrors(
        extractFieldErrors(error),
      )
      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors)
        return
      }
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

  const stageChoice: StageChoice | null =
    ckdStage === undefined
      ? null
      : ckdStage === null
        ? STAGE_NONE
        : (ckdStage as StageChoice)
  const dialysisChoice: DialysisChoice | null =
    ckdStage === undefined ? null : onDialysis ? "YES" : "NO"
  const otherSelected = selectedCauses.includes("OTHER")
  const formattedDate = diagnosisDate
    ? t("kidney.diagnosisDateValue", {
        year: diagnosisDate.year,
        month: String(diagnosisDate.month).padStart(2, "0"),
      })
    : ""
  const heightError = localizedFieldError("height")
  const weightError = localizedFieldError("weight")
  const dateError = localizedFieldError("diagnosisDate")
  const otherError = localizedFieldError("otherCause")

  return (
    <>
      <RecordPageShell
        title={t("kidney.title")}
        navigationTitle={t("kidney.navTitle")}
        intro={t("kidney.intro")}
        onBack={() => router.back()}
        ctaLabel={t("kidney.save")}
        ctaDisabled={!initialized}
        ctaLoading={isSubmitting}
        onCtaPress={() => void handleSave()}
      >
        <View style={styles.content}>
          {/* 키 · 체중 — 혈압 페이지의 짝 입력과 같은 면 */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("kidney.basic")}
            </V2Text>
            <View style={styles.pair}>
              <RecordNumberField
                inputRef={heightRef}
                paired
                label={t("kidney.height")}
                unit="cm"
                value={heightVal}
                onChangeText={handleChangeHeight}
                keyboardType="decimal-pad"
                placeholder={t("kidney.heightPlaceholder")}
                invalid={!!errors.height}
                returnKeyType="next"
                onSubmitEditing={() => weightRef.current?.focus()}
              />
              <RecordNumberField
                inputRef={weightRef}
                paired
                label={t("kidney.weight")}
                unit="kg"
                value={weightVal}
                onChangeText={handleChangeWeight}
                keyboardType="decimal-pad"
                placeholder={t("kidney.weightPlaceholder")}
                invalid={!!errors.weight}
                returnKeyType="done"
              />
            </View>
            <RecordFieldHint error={!!(heightError || weightError)}>
              {heightError ?? weightError ?? ""}
            </RecordFieldHint>
          </View>

          {/* 신장 병기 */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("kidney.stage.title")}
            </V2Text>
            <V2Text style={styles.hint} color={s.text}>
              {t("kidney.stageHint")}
            </V2Text>
            <RecordChoices<StageChoice>
              value={stageChoice}
              disabled={!initialized || isSubmitting}
              onChange={(value) => {
                if (value === STAGE_NONE) {
                  setCkdStage(null)
                  setOnDialysis(false)
                  return
                }
                setCkdStage(value)
              }}
              options={[
                ...STAGE_OPTIONS.map((option) => ({
                  value: option.key as StageChoice,
                  label: t("kidney.stage.value", {
                    stage: stageCode(option.key),
                  }),
                })),
                { value: STAGE_NONE, label: t("kidney.stage.none") },
              ]}
            />
          </View>

          {/* 투석 여부 — 병기가 '없음' 이면 묻지 않는다 */}
          <V2Disclosure open={ckdStage !== null}>
            <View style={styles.group}>
              <V2Text style={styles.label} color={s.textStrong}>
                {t("kidney.dialysisLabel")}
              </V2Text>
              <RecordChoices<DialysisChoice>
                value={dialysisChoice}
                disabled={!initialized || isSubmitting}
                onChange={(value) => setOnDialysis(value === "YES")}
                options={[
                  { value: "NO", label: t("kidney.dialysisNo") },
                  { value: "YES", label: t("kidney.dialysisYes") },
                ]}
              />
            </View>
          </V2Disclosure>

          {/* 진단 시기 — 숫자 칸과 같은 면의 선택 행. 오류 줄은 있을 때만(예약 두 줄이 아래 칩과의 간격을 두 배로 벌린다). */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("kidney.diagnosisDate")}
            </V2Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("kidney.diagnosisDateAccessibility")}
              accessibilityValue={{ text: formattedDate || undefined }}
              disabled={isSubmitting}
              onPress={() => setDatePickerVisible(true)}
              style={({ pressed }) => [
                styles.field,
                {
                  backgroundColor: pressed ? s.surfacePressed : s.surfaceSunken,
                  borderColor: errors.diagnosisDate
                    ? s.danger
                    : s.surfaceSunken,
                },
              ]}
            >
              <V2Text
                style={styles.fieldValue}
                color={formattedDate ? s.textStrong : recordFieldLabel(s)}
              >
                {formattedDate || t("kidney.diagnosisDatePlaceholder")}
              </V2Text>
              <Ionicons name="calendar-outline" size={20} color={s.text} />
            </Pressable>
            {dateError ? (
              <RecordFieldHint error>{dateError}</RecordFieldHint>
            ) : null}
          </View>

          {/* 주 진단 원인 — 여러 개 */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("kidney.diagnosisCause")}
            </V2Text>
            <V2Text style={styles.hint} color={s.text}>
              {t("kidney.causeHint")}
            </V2Text>
            <RecordMultiChoices
              values={selectedCauses}
              disabled={!initialized || isSubmitting}
              onToggle={toggleCause}
              options={DIAGNOSIS_CAUSE_OPTIONS.map((cause) => ({
                value: cause.key as string,
                label: t(DIAGNOSIS_CAUSE_LABEL_KEYS[cause.key]),
              }))}
            />
            <V2Disclosure open={otherSelected}>
              <View style={styles.otherWrap}>
                <View
                  style={[
                    styles.field,
                    styles.otherField,
                    {
                      backgroundColor: otherFocused
                        ? s.canvas
                        : s.surfaceSunken,
                      borderColor: errors.otherCause
                        ? s.danger
                        : otherFocused
                          ? s.brand
                          : s.surfaceSunken,
                    },
                  ]}
                >
                  <TextInput
                    multiline
                    value={otherCause}
                    onChangeText={handleChangeOtherCause}
                    onFocus={() => setOtherFocused(true)}
                    onBlur={() => setOtherFocused(false)}
                    placeholder={t("kidney.otherCausePlaceholder")}
                    placeholderTextColor={recordFieldLabel(s)}
                    selectionColor={s.brand}
                    textAlignVertical="top"
                    accessibilityLabel={t("kidney.causes.other")}
                    style={[styles.otherInput, { color: s.textStrong }]}
                  />
                </View>
                {otherError ? (
                  <RecordFieldHint error>{otherError}</RecordFieldHint>
                ) : null}
              </View>
            </V2Disclosure>
          </View>

          {/* 동반 질환 — 여러 개 */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("kidney.comorbiditiesTitle")}
            </V2Text>
            <V2Text style={styles.hint} color={s.text}>
              {t("kidney.comorbidityHint")}
            </V2Text>
            <RecordMultiChoices
              values={selectedComorbidities}
              disabled={!initialized || isSubmitting}
              onToggle={toggleComorbidity}
              options={COMORBIDITY_OPTIONS.map((opt) => ({
                value: opt.key as string,
                label: t(opt.labelKey),
              }))}
            />
          </View>
        </View>
      </RecordPageShell>

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
    </>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_X, gap: FORM.sectionGap },
  group: { gap: FORM.labelGap },
  label: FORM.label,
  hint: FORM.hint,
  pair: { flexDirection: "row", gap: S[3] },
  field: {
    minHeight: FIELD.height - S[6],
    borderRadius: FIELD.radius,
    borderWidth: 1,
    paddingHorizontal: FIELD.paddingX,
    paddingVertical: S[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[2],
  },
  fieldValue: { ...FORM.body, flex: 1 },
  otherWrap: { paddingTop: S[2] },
  otherField: { alignItems: "stretch", minHeight: FIELD.height },
  otherInput: {
    ...FORM.body,
    fontFamily: fontFamily.regular,
    flex: 1,
    padding: 0,
    includeFontPadding: false,
  },
})
