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
  /**
   * 회차별 상태 개수. 목록 카드의 "정상 2 · 주의 1" 이 이걸 쓴다.
   *
   * **optional 인 이유**: 새 서버(`sinsin-be-bun`)만 실어 보낸다. 구 파이썬 서버
   * (`/health-check/results`)는 resultId·checkupDate·checkupPlace·createdAt 만 준다.
   * 없으면 화면이 요약 줄을 그리지 않는다 — 0 으로 채우면 "전부 정상" 이라는 거짓이 된다.
   *
   * 세 값이 **모두 0** 인 것도 "전부 정상" 이 아니다. 카탈로그 항목이 하나도 안 잡혔다는
   * 뜻(복호화 실패 등)이라, 그때도 요약 줄을 그리지 않는다.
   */
  normalCount?: number
  cautionCount?: number
  warningCount?: number
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
