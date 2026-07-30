import { useKidneyProfile } from "@/src/features/settings/hooks/useKidneyProfile"

/**
 * 사용자의 1일 영양 목표. 서버가 CKD 단계·체중으로 계산한 값을 그대로 쓴다.
 *
 * 예전에는 화면마다 하드코딩 표를 그렸다. 단백질만 세 가지였고
 * (고정 48g / weightKg×0.8 / 반올림한 weightKg×0.8), 칼륨은 같은 사용자에게
 * 화면에 따라 2000 과 3000 이 동시에 보였다.
 *
 * 기존 useKidneyProfile 위에 얹어 ["kidneyProfile"] 캐시를 공유하므로
 * 이 훅을 여러 화면에서 불러도 요청은 한 번이다.
 */

export type NutrientKey = "protein" | "sodium" | "potassium" | "phosphorus"

export interface NutrientBar {
  nutrient: NutrientKey
  max: number
  unit: string
}

export interface NutrientLimits {
  sodiumMg: number | null
  potassiumMg: number | null
  phosphorusMg: number | null
  fluidMl: number | null
  /** 체중을 모르면 null. 지어내지 않는다. */
  proteinGDay: number | null
  /**
   * 통계 화면이 그리는 막대 목록. 단백질은 체중을 알 때만 들어간다 —
   * 모르는 목표를 48g 같은 고정값으로 채우면 환자가 잘못된 판정을 본다.
   */
  bars: NutrientBar[]
  /** true 면 아직 서버 값이 아니라 폴백을 보고 있다는 뜻. */
  isFallback: boolean
  isLoading: boolean
}

function toBars(
  limits: Omit<NutrientLimits, "bars" | "isFallback" | "isLoading">,
): NutrientBar[] {
  const bars: NutrientBar[] = []
  if (limits.proteinGDay != null) {
    bars.push({ nutrient: "protein", max: limits.proteinGDay, unit: "g" })
  }
  if (limits.sodiumMg != null && limits.sodiumMg > 0) {
    bars.push({ nutrient: "sodium", max: limits.sodiumMg, unit: "mg" })
  }
  if (limits.potassiumMg != null && limits.potassiumMg > 0) {
    bars.push({ nutrient: "potassium", max: limits.potassiumMg, unit: "mg" })
  }
  if (limits.phosphorusMg != null && limits.phosphorusMg > 0) {
    bars.push({ nutrient: "phosphorus", max: limits.phosphorusMg, unit: "mg" })
  }
  return bars
}

export function useNutrientLimits(): NutrientLimits {
  const { data: profile, isLoading } = useKidneyProfile()

  if (!profile) {
    // 모르는 값을 "가장 엄격한 수치"로 채우면 특히 수분에서 안전하지 않다.
    // 프로필을 받기 전에는 판정·퍼센트·한도를 그리지 않는다.
    const values = {
      sodiumMg: null,
      potassiumMg: null,
      phosphorusMg: null,
      fluidMl: null,
      proteinGDay: null,
    }
    return { ...values, bars: toBars(values), isFallback: true, isLoading }
  }

  const values = {
    sodiumMg: profile.sodiumMg,
    potassiumMg: profile.potassiumMg,
    phosphorusMg: profile.phosphorusMg,
    fluidMl: profile.fluidMl,
    // 서버가 이미 proteinGPerKg × 체중을 계산해 준다. 앱에서 다시 곱하지 않는다.
    proteinGDay: profile.proteinGDay,
  }
  return { ...values, bars: toBars(values), isFallback: false, isLoading }
}
