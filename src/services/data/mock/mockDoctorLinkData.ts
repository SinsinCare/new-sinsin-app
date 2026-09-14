/**
 * 의사 연결 · 데이터 공유의 목 데이터.
 *
 * 왜 필요한가: 옛 `doctorService` 에는 목이 **없었다.** `EXPO_PUBLIC_USE_MOCK_MODE=true` 로
 * 띄워도 의사 관련 호출만 실제 네트워크로 나가서, 목 모드에서 그 화면이 아예 안 열렸다.
 * 여기서는 상태를 메모리에 들고 있어서 검색 → 연결 → 공유 설정 → 해지까지 서버 없이 왕복한다.
 *
 * 상태를 모듈 수준 변수로 두는 이유: 화면을 오갈 때 방금 켠 토글이 꺼져 있으면 목이 아니라
 * 버그처럼 보인다. 앱을 재시작하면 초기값으로 돌아간다.
 */

import type {
  DoctorCard,
  DoctorConnection,
  DoctorReportDetail,
  DoctorReportList,
  ShareGrant,
  ShareGrantUpdate,
} from "@/src/types/doctorLink"
import { EMPTY_SHARE_GRANT } from "@/src/types/doctorLink"

const DOCTORS: DoctorCard[] = [
  {
    id: "101",
    name: "김신장",
    speciality: "신장내과",
    department: "신장내과",
    organizationId: "1",
    organizationName: "서울대학교병원",
    needsProfileCompletion: false,
  },
  {
    id: "102",
    name: "이수현",
    speciality: "신장내과",
    department: "신장내과",
    organizationId: "2",
    organizationName: "서울삼성병원",
    needsProfileCompletion: false,
  },
  {
    id: "103",
    name: "박정우",
    speciality: "내분비내과",
    department: "내분비내과",
    organizationId: "1",
    organizationName: "서울대학교병원",
    needsProfileCompletion: false,
  },
  // 조직이 비어 있는 경우. 화면이 병원명 자리를 어떻게 비우는지 목에서도 보이게 둔다.
  {
    id: "104",
    name: "최은비",
    speciality: "신장내과",
    department: null,
    organizationId: null,
    organizationName: null,
    needsProfileCompletion: true,
  },
]

interface MockState {
  connections: DoctorConnection[]
  nextId: number
}

const state: MockState = {
  connections: [
    {
      id: "1",
      doctor: DOCTORS[0],
      status: "APPROVED",
      initiatedBy: "PATIENT",
      requestMessage: null,
      requestedAt: "2026-07-02T09:12:00",
      respondedAt: "2026-07-02T14:30:00",
      sharing: {
        ...EMPTY_SHARE_GRANT,
        examResults: true,
        consentVersion: "2026-08-01",
        agreedAt: "2026-07-02T14:35:00",
        updatedAt: "2026-07-02T14:35:00",
      },
    },
    {
      id: "2",
      doctor: DOCTORS[1],
      status: "PENDING",
      initiatedBy: "PATIENT",
      requestMessage: null,
      requestedAt: "2026-07-28T11:00:00",
      respondedAt: null,
      sharing: null,
    },
  ],
  nextId: 3,
}

/**
 * 상세까지 들고 있는 리포트. 목록은 여기서 상세 칸을 떼어 낸다 — 서버도 같은 행에서
 * 두 투영을 만든다. 검사 패널은 eGFR 하락·칼륨 높음·인 정상이 한 화면에 다 보이게 골랐다.
 */
const MOCK_REPORTS: DoctorReportDetail[] = [
  {
    id: "9001",
    doctor: DOCTORS[0] ?? null,
    comment:
      "지난 한 달 기록 잘 봤습니다. 칼륨이 조금 올라서 이번 달은 과일 간식만 줄여보면 좋겠어요. 국물을 남기신 날이 늘어난 건 아주 잘하고 계신 거예요. 다음 진료 때 뵙겠습니다.",
    tasks: ["바나나 대신 사과로 바꾸기", "감자·고구마는 삶아서 물 버리고 먹기", "국물은 반만 먹기"],
    includeSummary: true,
    mealPlanIncluded: false,
    sentAt: "2026-09-10T09:12:00",
    labs: [
      { date: "2026-09-01", egfr: 38, creatinine: 1.9, potassium: 5.2, phosphorus: 4.1, uacr: null, systolic: 128, hba1c: null, fastingGlucose: null },
      { date: "2026-08-01", egfr: 41, creatinine: 1.8, potassium: 4.6, phosphorus: 4.0, uacr: null, systolic: 130, hba1c: null, fastingGlucose: null },
    ],
    windowDays: 28,
    limits: { sodiumMg: 2000, potassiumMg: 2000, phosphorusMg: 800, proteinG: 41, fluidMl: 1200 },
    nextVisit: { label: "다음 진료", date: "2026-10-09", time: "10:30" },
    demoLabs: false,
  },
  // 코멘트 없이 과제만·검사 미공유·일정 없음. 카드가 셋 빠진 화면을 목에서도 볼 수 있게.
  {
    id: "9002",
    doctor: DOCTORS[0] ?? null,
    comment: "",
    tasks: ["매일 아침 혈압 기록"],
    includeSummary: false,
    mealPlanIncluded: false,
    sentAt: "2026-08-12T10:00:00",
    labs: [],
    windowDays: null,
    limits: { sodiumMg: 2000, potassiumMg: null, phosphorusMg: null, proteinG: 41, fluidMl: null },
    nextVisit: null,
    demoLabs: true,
  },
]

function contains(haystack: string | null, needle: string): boolean {
  if (!haystack) return false
  return haystack.toLowerCase().includes(needle.trim().toLowerCase())
}

export const mockDoctorLink = {
  search(params: { name?: string; hospital?: string; department?: string }) {
    const { name, hospital, department } = params
    const items = DOCTORS.filter((doctor) => {
      if (name?.trim() && !contains(doctor.name, name)) return false
      if (hospital?.trim() && !contains(doctor.organizationName, hospital)) {
        return false
      }
      if (department?.trim() && !contains(doctor.department, department)) {
        return false
      }
      return true
    })
    return { items, total: items.length }
  },

  listReports(): DoctorReportList {
    const items = MOCK_REPORTS.map(
      ({ labs: _labs, windowDays: _w, limits: _l, nextVisit: _n, demoLabs: _dl, ...report }) =>
        report,
    )
    return { items, total: items.length }
  },

  getReport(reportId: string): DoctorReportDetail {
    const found = MOCK_REPORTS.find((report) => report.id === reportId)
    if (!found) throw new Error("report not found")
    return found
  },

  list() {
    // 해지된 것은 서버와 마찬가지로 목록에서 뺀다.
    const items = state.connections.filter((c) => c.status !== "REVOKED")
    return { items, total: items.length }
  },

  request(doctorId: string, message?: string | null): DoctorConnection {
    const doctor = DOCTORS.find((d) => d.id === doctorId) ?? null
    const existing = state.connections.find((c) => c.doctor?.id === doctorId)
    if (existing) {
      // 이미 승인된 연결을 재요청이 깨면 안 된다. 서버와 같은 규칙.
      if (existing.status !== "APPROVED") {
        existing.status = "PENDING"
        existing.requestMessage = message ?? null
        existing.respondedAt = null
      }
      return existing
    }
    const created: DoctorConnection = {
      id: String(state.nextId++),
      doctor,
      status: "PENDING",
      initiatedBy: "PATIENT",
      requestMessage: message ?? null,
      requestedAt: new Date().toISOString().slice(0, 19),
      respondedAt: null,
      sharing: null,
    }
    state.connections.unshift(created)
    return created
  },

  revoke(connectionId: string): void {
    const found = state.connections.find((c) => c.id === connectionId)
    if (!found) throw new Error("connection not found")
    found.status = "REVOKED"
    if (found.sharing) {
      found.sharing.revokedAt = new Date().toISOString().slice(0, 19)
    }
  },

  getSharing(connectionId: string): ShareGrant {
    const found = state.connections.find((c) => c.id === connectionId)
    if (!found) throw new Error("connection not found")
    return found.sharing ?? { ...EMPTY_SHARE_GRANT }
  },

  putSharing(connectionId: string, next: ShareGrantUpdate): ShareGrant {
    const found = state.connections.find((c) => c.id === connectionId)
    if (!found) throw new Error("connection not found")
    const now = new Date().toISOString().slice(0, 19)
    const grant: ShareGrant = {
      examResults: next.examResults,
      dietRecords: next.dietRecords,
      vitals: next.vitals,
      realtime: next.realtime,
      consentVersion: next.consentVersion,
      agreedAt: found.sharing?.agreedAt ?? now,
      updatedAt: now,
      revokedAt: null,
    }
    found.sharing = grant
    return grant
  },
}
