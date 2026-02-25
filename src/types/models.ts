// 사용자 프로필
export interface UserProfile {
  uid: string
  email: string
  displayName: string
  nickname: string
  birthDate: string
  gender: "male" | "female"
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

// 영양 한계치 (신장 환자용)
export const KIDNEY_SAFE_LIMITS = {
  sodium: 2000, // mg
  potassium: 2000, // mg
  phosphorus: 1000, // mg
  protein: 0.8, // g per kg body weight
} as const
