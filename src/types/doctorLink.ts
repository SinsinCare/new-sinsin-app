/**
 * 의사 연결 · 데이터 공유 API 계약.
 *
 * 서버는 `sinsin-be-bun` 의 `src/domains/doctorlink/` 다. 기존 `src/services/doctorService.ts`
 * 가 부르던 파이썬 라우터(`app/domain/user/doctor_connection_router.py`)는 **별도 의사
 * 데이터베이스**(`DOCTOR_DATABASE_URL`)를 보는데 그 변수가 없는 환경에서는 요청마다 503 이
 * 나온다. 그래서 이 화면들은 새 서버의 소비자 DB 구현을 본다.
 *
 * 옛 `doctorService.DoctorDirectoryItem` 에는 `email` 이 있었다. 여기에는 **없다** —
 * 아무 환자에게나 의사 이메일을 내려보내는 건 검색 기능이 할 일이 아니다.
 */

/** 검색 결과 · 연결 카드에 들어가는 의사 한 명. */
export interface DoctorCard {
  id: string
  name: string
  speciality: string | null
  department: string | null
  organizationId: string | null
  /** 병원명. 조직이 연결돼 있지 않으면 null 이라 화면에서 자리를 비워야 한다. */
  organizationName: string | null
  needsProfileCompletion: boolean
}

export type DoctorConnectionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REVOKED"

/**
 * 환자가 의사에게 무엇을 보여 줄지.
 *
 * 연결(승인)과 **별개**다. 승인은 접근의 전제일 뿐이고, 무엇을 여는지는 이 값이 정한다.
 * 서버는 동의 행이 없을 때 404 대신 전부 false 인 기본값을 준다 — 화면이 토글 3개를
 * 항상 그려야 하기 때문이다.
 */
export interface ShareGrant {
  /** 혈액검사·소변검사 결과 */
  examResults: boolean
  /** 영양성분·수분 섭취량 */
  dietRecords: boolean
  /** 혈압·체중의 일일 수치 및 변화 추이 */
  vitals: boolean
  /**
   * "기록 시 즉시 병원으로 전송".
   * 오늘 서버에 의사를 향한 실시간 채널이 없으므로 이건 **의도의 기록**이다.
   * 켜져 있어도 지금 당장 무언가 전송되지는 않는다.
   */
  realtime: boolean
  consentVersion: string | null
  agreedAt: string | null
  updatedAt: string | null
  revokedAt: string | null
}

export interface DoctorConnection {
  id: string
  doctor: DoctorCard | null
  status: DoctorConnectionStatus
  initiatedBy: "PATIENT" | "DOCTOR" | null
  requestMessage: string | null
  requestedAt: string | null
  respondedAt: string | null
  /** 아직 공유 설정을 한 적이 없으면 null. */
  sharing: ShareGrant | null
}

export interface DoctorSearchParams {
  name?: string
  hospital?: string
  department?: string
}

export interface DoctorSearchResult {
  items: DoctorCard[]
  total: number
}

export interface DoctorConnectionList {
  items: DoctorConnection[]
  total: number
}

/** `PUT .../sharing` 본문. `ShareGrant` 의 읽기 전용 시각 칸을 뺀 것. */
export interface ShareGrantUpdate {
  examResults: boolean
  dietRecords: boolean
  vitals: boolean
  realtime: boolean
  consentVersion: string
}

/**
 * 오늘 화면에 떠 있는 공유 동의 문구의 판.
 *
 * 문구를 고치면 이 값을 올려야 한다 — 그래야 누가 어느 판에 동의했는지 갈린다.
 * 올리지 않고 문구만 바꾸면, 옛 문구에 동의한 사람과 새 문구에 동의한 사람이
 * 서버에서 구분되지 않는다.
 */
export const SHARE_CONSENT_VERSION = "2026-08-01"

/** 전부 꺼진 기본값. 서버가 아직 동의 행을 만들지 않았을 때 화면이 쓰는 값. */
export const EMPTY_SHARE_GRANT: ShareGrant = {
  examResults: false,
  dietRecords: false,
  vitals: false,
  realtime: false,
  consentVersion: null,
  agreedAt: null,
  updatedAt: null,
  revokedAt: null,
}

/** 공유 설정 화면의 토글 3개. 화면과 서버 필드를 잇는 단일 목록. */
export const SHARE_SCOPE_KEYS = [
  "examResults",
  "dietRecords",
  "vitals",
] as const

export type ShareScopeKey = (typeof SHARE_SCOPE_KEYS)[number]
