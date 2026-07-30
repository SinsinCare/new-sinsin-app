import i18n, { getAppLanguage } from "@/src/i18n"
import type { OnboardingStep } from "../types"

const CKD_OPTION_KEYS: Record<number, readonly string[]> = {
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
}

const NON_CKD_OPTION_KEYS: Record<number, readonly string[]> = {
  1: [
    "HYPERTENSION",
    "DIABETES",
    "HIGH_PROTEIN_DIET",
    "FAMILY_HISTORY",
    "ABNORMAL_TEST",
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

  return {
    ...step,
    title: resourceString(`${path}.title`, step.title),
    subTitle: resourceString(`${path}.subtitle`, step.subTitle),
    values: step.values.map((option, index) => {
      if (option.key === "weight") {
        return {
          ...option,
          label: resourceString("onboarding.weight", option.label ?? ""),
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
