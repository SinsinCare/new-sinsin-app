import i18n, { getAppLanguage } from "@/src/i18n"
import type { OnboardingStep } from "../types"

const CKD_OPTION_KEYS: Record<number, readonly string[]> = {
  // 1단계는 병기만 담는다. 투석·이식은 같은 스텝의 followUp 으로, 결석은 3단계로 갔다.
  // DIALYSIS·KIDNEY_STONE 은 구버전 서버에 붙었을 때를 위해 목록에 남긴다 —
  // 서버가 아직 옛 선택지를 내려주면 번역이라도 붙어야 한다.
  1: [
    "STAGE_1",
    "STAGE_2",
    "STAGE_3A",
    "STAGE_3B",
    "STAGE_4",
    "STAGE_5",
    "DIALYSIS",
    "KIDNEY_STONE",
    "UNKNOWN",
  ],
  2: ["WITHIN_1M", "WITHIN_6M", "SIX_M_TO_2Y", "OVER_2Y", "PREVENTIVE"],
  3: [
    "DIABETES",
    "HYPERTENSION",
    "HEART_DISEASE",
    "GOUT",
    "ANEMIA",
    "BONE_MINERAL",
    "KIDNEY_STONE",
    "NONE",
  ],
  5: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"],
  6: [
    "READING_LABELS",
    "HIDDEN_PHOSPHORUS",
    "EATING_OUT",
    "PORTION_SIZE",
    "POTASSIUM_FOODS",
    "TASTY_DIET",
    "SODIUM_CONTROL",
    "FLUID_MANAGEMENT",
    "CONSISTENCY",
  ],
  7: [
    "HOME_COOK",
    "HOME_AND_OUT",
    "MOSTLY_OUT",
    "MEAL_PREP",
    "COOKED_BY_OTHERS",
  ],
  8: ["RARELY", "WEEKLY_1", "WEEKLY_2_3", "WEEKLY_4_PLUS"],
  // 9(진단 연·월)는 선택지가 없다 — 제목·부제만 번역한다.
  10: [
    "DIABETIC_KIDNEY_DISEASE",
    "HYPERTENSION",
    "GLOMERULONEPHRITIS",
    "POLYCYSTIC_KIDNEY_DISEASE",
    "OTHER",
    "UNKNOWN",
  ],
}

/** input 필드 라벨은 선택지가 아니라 필드 이름이라 별도 리소스를 본다. */
const INPUT_FIELD_LABEL_KEYS: Record<string, string> = {
  weight: "onboarding.weight",
  height: "onboarding.height",
}

/** 같은 스텝의 두 번째 축. 병기 키와 접두사로 갈리므로 목록도 따로 둔다. */
const CKD_FOLLOW_UP_KEYS: Record<number, readonly string[]> = {
  1: ["KRT_NONE", "KRT_HEMODIALYSIS", "KRT_PERITONEAL", "KRT_TRANSPLANT"],
}

const NON_CKD_OPTION_KEYS: Record<number, readonly string[]> = {
  1: [
    "HYPERTENSION",
    "DIABETES",
    "HIGH_PROTEIN_DIET",
    "FAMILY_HISTORY",
    "ABNORMAL_TEST",
    "KIDNEY_STONE",
    "NONE",
    "UNKNOWN",
  ],
  2: [
    "PREVENTIVE",
    "EXERCISE",
    "RECENT_CHECKUP",
    "DIET_CONCERN",
    "FAMILY_PATIENT",
    "GENERAL_INFO",
  ],
  3: ["HOME_LOW_SODIUM", "HOME_AND_OUT", "MOSTLY_OUT", "UNKNOWN"],
}

function resourceString(path: string, fallback: string): string {
  const value = i18n.getResource(getAppLanguage(), "auth", path)
  return typeof value === "string" ? value : fallback
}

/**
 * 온보딩 API의 답안 key는 그대로 보존하고 표시문만 현재 언어로 바꾼다.
 * 서버가 새 질문을 추가하면 원문으로 fallback해 답안 제출 계약을 깨지 않는다.
 */
export function localizeOnboardingStep(
  step: OnboardingStep,
  hasCkd: boolean | null,
): OnboardingStep {
  const flow = hasCkd === false ? "nonCkd" : "ckd"
  const path = `onboarding.${flow}.${step.step}`
  const optionKeys =
    flow === "ckd" ? CKD_OPTION_KEYS[step.step] : NON_CKD_OPTION_KEYS[step.step]

  const followUpKeys =
    flow === "ckd" ? CKD_FOLLOW_UP_KEYS[step.step] : undefined
  const followUp =
    step.followUp && followUpKeys
      ? {
          ...step.followUp,
          title: resourceString(`${path}.followUp.title`, step.followUp.title),
          values: step.followUp.values.map((option, index) => {
            const resourceKey = followUpKeys.includes(option.key)
              ? option.key
              : followUpKeys[index]
            if (!resourceKey) return option
            return {
              ...option,
              value: resourceString(
                `${path}.followUp.options.${resourceKey}`,
                option.value,
              ),
            }
          }),
        }
      : (step.followUp ?? null)

  return {
    ...step,
    title: resourceString(`${path}.title`, step.title),
    subTitle: resourceString(`${path}.subtitle`, step.subTitle),
    followUp,
    values: step.values.map((option, index) => {
      const labelKey = INPUT_FIELD_LABEL_KEYS[option.key]
      if (labelKey) {
        return {
          ...option,
          label: resourceString(labelKey, option.label ?? ""),
        }
      }

      const resourceKey = optionKeys?.includes(option.key)
        ? option.key
        : optionKeys?.[index]
      if (!resourceKey) return option

      return {
        ...option,
        value: resourceString(`${path}.options.${resourceKey}`, option.value),
      }
    }),
  }
}
