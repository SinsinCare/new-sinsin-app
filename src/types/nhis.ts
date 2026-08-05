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

/**
 * 확인 흐름이 끝날 수 있는 네 갈래. 서버 계약(`healthcheck/service.ts::confirmOutcome`)과
 * 같은 집합이다 — `string` 으로 두면 화면이 `else` 로 뭉개고, 실제로 "기록 없음" 이
 * "인증 실패" 로 보였다(2026-08-05).
 */
export type HealthCheckConfirmStatus =
  | "SUCCESS"
  | "NO_RESULTS"
  | "FAILED"
  | "TIMEOUT"

export interface HealthCheckConfirmRs {
  requestId: string
  status: HealthCheckConfirmStatus
  /**
   * **다시 해 볼 만한가.** 화면이 스스로 판단하지 않는다 — `NO_RESULTS` 는 인증이
   * 성공했고 기록이 없는 것이라 재시도해도 같다. 서버가 아는 것을 서버가 말한다.
   */
  retryable?: boolean
  /** 사용자에게 보일 한 줄. 화면 고정 문구보다 이것이 언제나 더 구체적이다. */
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
