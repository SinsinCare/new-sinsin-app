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

/**
 * 프로필을 아직 못 받았을 때만 쓰는 폴백. 가장 엄격한 행(5기/투석)이다.
 *
 * 잠깐 비관적으로 보이는 건 안전하지만 잠깐 낙관적으로 보이는 건 아니다.
 * 로딩 중에 느슨한 목표를 보여주면 환자가 그 순간 더 먹어도 된다고 읽는다.
 * 값은 백엔드 app/core/ckd_limits.py 의 STAGE_5 행과 같다.
 */
const STRICTEST_FALLBACK = {
  sodiumMg: 2000,
  potassiumMg: 2000,
  phosphorusMg: 800,
  fluidMl: 1000,
  proteinGPerKg: 0.6,
} as const

export interface NutrientBar {
  nutrient: string
  max: number
  unit: string
}

export interface NutrientLimits {
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  fluidMl: number
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
    bars.push({ nutrient: "단백질", max: limits.proteinGDay, unit: "g" })
  }
  bars.push({ nutrient: "나트륨", max: limits.sodiumMg, unit: "mg" })
  bars.push({ nutrient: "칼륨", max: limits.potassiumMg, unit: "mg" })
  bars.push({ nutrient: "인", max: limits.phosphorusMg, unit: "mg" })
  return bars
}

export function useNutrientLimits(): NutrientLimits {
  const { data: profile, isLoading } = useKidneyProfile()

  if (!profile) {
    const values = { ...STRICTEST_FALLBACK, proteinGDay: null }
    return { ...values, bars: toBars(values), isFallback: true, isLoading }
  }

  const values = {
    sodiumMg: profile.sodiumMg ?? STRICTEST_FALLBACK.sodiumMg,
    potassiumMg: profile.potassiumMg ?? STRICTEST_FALLBACK.potassiumMg,
    phosphorusMg: profile.phosphorusMg ?? STRICTEST_FALLBACK.phosphorusMg,
    fluidMl: profile.fluidMl ?? STRICTEST_FALLBACK.fluidMl,
    // 서버가 이미 proteinGPerKg × 체중을 계산해 준다. 앱에서 다시 곱하지 않는다.
    proteinGDay: profile.proteinGDay,
  }
  return { ...values, bars: toBars(values), isFallback: false, isLoading }
}
