// 사용자 프로필
export interface UserProfile {
  uid: string
  email: string
  displayName: string
  nickname: string
  birthDate: string
  gender: "MALE" | "FEMALE" | "OTHER"
  height: number
  weight: number
  ckdStage: 1 | 2 | 3 | 4 | 5
  onDialysis: boolean
  onboardingCompleted?: boolean
  referralCode?: string
  createdAt: Date
  updatedAt: Date
}

// 건강 기록
export interface HealthRecord {
  id: string
  userId: string
  gfr: number
  creatinine: number
  potassium: number
  bun: number
  uricAcid: number
  recordDate: Date
  createdAt: Date
}

// 음식 기록
export interface FoodRecord {
  id: string
  userId: string
  name: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  sodium: number
  potassium: number
  phosphorus: number
  hasBroth: boolean
  brothConsumed: boolean
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  recordDate: Date
  imageUrl?: string
}

// 일일 건강 로그
export interface DailyHealthLog {
  id: string
  userId: string
  date: Date
  steps: number
  waterIntake: number
  sleepHours: number
  weight?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  notes?: string
}

// 영양 한계치는 서버가 CKD 단계·체중으로 계산해 준다.
// useNutrientLimits() (src/features/nutrition/hooks) 를 쓸 것.
//
// 여기 있던 KIDNEY_SAFE_LIMITS 는 단계와 무관한 고정값이었고,
// src/features/home/data/nutrientConstants.ts 의 표와 칼륨이 달라
// (2000 vs 3000) 같은 사용자가 화면에 따라 다른 숫자를 봤다.
