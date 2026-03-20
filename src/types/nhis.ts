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
  userName: string
  phoneNo: string
  identity: string
  searchStartYear: string
  searchEndYear: string
  authMethod: string
  telecomCode: string | null
}

export interface HealthCheckRequestRs {
  requestId: string
  status: string
  message: string
  pollIntervalMs: number
}

export interface HealthCheckConfirmRs {
  requestId: string
  status: string
  message: string
  resultId: number
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
  createdAt: string
}
