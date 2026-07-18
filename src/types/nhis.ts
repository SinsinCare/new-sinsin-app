export interface AuthMethodRs {
  key: "kakao" | "pass"
  displayName: string
  requiresTelecom: boolean
  telecomOptions: TelecomOptionsRs[]
}

export interface TelecomOptionsRs {
  code: string
  label: string
}

export interface HealthCheckRequestRq {
  loginOrgCd: string
  resNm: string
  resNo: string // 생년월일 YYYYMMDD
  mobileNo: string
  mobileCo: string | null // S: SKT, K: KT, L: LGT — PASS 필수
}

export interface HealthCheckRequestRs {
  requestId: string
  status: string
  message?: string
}

export interface HealthCheckConfirmRs {
  requestId: string
  status: string
  message?: string
  resultId?: number
}

export interface HealthCheckResultsRs {
  resultId: number
  checkupDate: string
  checkupPlace: string
  createdAt: string
}

export interface HealthCheckResultDetailRs {
  resultId: number
  checkupDate: string
  checkupPlace: string
  height: string
  weight: string
  bmi: string
  waistCircumference: string
  bloodPressureSystolic: string
  bloodPressureDiastolic: string
  fastingBloodSugar: string
  totalCholesterol: string
  hdlCholesterol: string
  ldlCholesterol: string
  triglyceride: string
  hemoglobin: string
  serumCreatinine: string
  gfr: string
  astSgot: string
  altSgpt: string
  gammaGtp: string
  judgement: string
  judgementCode?: string
  judgementDescription?: string
  createdAt: string
}
