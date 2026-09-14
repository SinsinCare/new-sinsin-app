/**
 * 의사 연결 · 데이터 공유 API 클라이언트.
 *
 * 서버는 `sinsin-be-bun` 의 `src/domains/doctorlink/`.
 *
 * 옛 `src/services/doctorService.ts` 와의 관계: 그쪽은 파이썬 라우터를 부르는데, 그 라우터는
 * 별도 의사 DB(`DOCTOR_DATABASE_URL`)를 보고 그 변수가 없으면 **요청마다 503** 이다.
 * 옛 파일은 초대코드 경로(`/doctor/enroll`)를 위해 남겨 두고, 새 화면은 여기를 쓴다.
 * 둘을 섞어 쓰지 마라 — 같은 개념의 타입이 두 벌이라 `email` 유무부터 다르다.
 */

import { api } from "../core"
import { isMockMode } from "../../config/appConfig"
import type {
  DoctorConnection,
  DoctorConnectionList,
  DoctorReportDetail,
  DoctorReportList,
  DoctorSearchParams,
  DoctorSearchResult,
  ShareGrant,
  ShareGrantUpdate,
} from "@/src/types/doctorLink"
import { mockDoctorLink } from "./mock/mockDoctorLinkData"

/** 목 모드에서 즉답이면 스켈레톤이 한 프레임만 번쩍인다. 실제 왕복과 비슷한 지연을 준다. */
function mockDelay<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const doctorLinkService = {
  /**
   * 이름·병원·진료과 중 **하나 이상**이 있어야 한다. 셋 다 비면 서버가 400 을 준다
   * (조건 없는 검색은 전 의사 명단 덤프가 된다). 화면이 CTA 를 비활성화하는 것과 같은 규칙.
   */
  async search(params: DoctorSearchParams): Promise<DoctorSearchResult> {
    if (isMockMode()) return mockDelay(mockDoctorLink.search(params))
    const { data } = await api.get("/doctors/search", { params })
    return data.result
  },

  async listConnections(): Promise<DoctorConnectionList> {
    if (isMockMode()) return mockDelay(mockDoctorLink.list())
    const { data } = await api.get("/doctor/connections")
    return data.result
  },

  async requestConnection(params: {
    doctorId: string
    message?: string | null
  }): Promise<DoctorConnection> {
    if (isMockMode()) {
      return mockDelay(
        mockDoctorLink.request(params.doctorId, params.message ?? null),
      )
    }
    const { data } = await api.post("/doctor/connections", {
      doctorId: params.doctorId,
      message: params.message ?? null,
    })
    return data.result
  },

  /**
   * 연결 해지. 서버는 행을 **지우지 않고** status 를 REVOKED 로 바꾸고 공유 동의도 함께 닫는다 —
   * "공유한 적이 있다" 는 사실이 사라지면 감사에 답할 수 없다.
   */
  async revokeConnection(connectionId: string): Promise<void> {
    if (isMockMode()) {
      mockDoctorLink.revoke(connectionId)
      await mockDelay(null)
      return
    }
    await api.delete(`/doctor/connections/${connectionId}`)
  },

  /** 동의한 적이 없어도 404 가 아니라 **전부 false 인 기본값**이 온다. */
  /**
   * 의료진이 보낸 리포트(최신순). 콘솔의 "환자 앱으로 보내기" 가 남긴 행이 여기로 온다 —
   * 이 조회가 없으면 콘솔이 "보냈다" 고 말한 것이 앱 어디에도 닿지 않는다.
   */
  async listReports(): Promise<DoctorReportList> {
    if (isMockMode()) return mockDelay(mockDoctorLink.listReports())
    const { data } = await api.get("/doctor/reports")
    return data.result
  },

  /** 리포트 한 건의 상세. 남의 것·없는 id 는 `DOCTOR_ERROR_005`(404). */
  async getReport(reportId: string): Promise<DoctorReportDetail> {
    if (isMockMode()) return mockDelay(mockDoctorLink.getReport(reportId))
    const { data } = await api.get(`/doctor/reports/${reportId}`)
    return data.result
  },

  async getSharing(connectionId: string): Promise<ShareGrant> {
    if (isMockMode()) return mockDelay(mockDoctorLink.getSharing(connectionId))
    const { data } = await api.get(
      `/doctor/connections/${connectionId}/sharing`,
    )
    return data.result
  },

  /**
   * 승인(APPROVED)된 연결에서만 성공한다. 승인 전에 범위를 켜 두면 승인되는 순간
   * 사용자가 다시 확인하지 않은 범위가 열리기 때문이다(서버가 409 로 막는다).
   */
  async updateSharing(
    connectionId: string,
    next: ShareGrantUpdate,
  ): Promise<ShareGrant> {
    if (isMockMode()) {
      return mockDelay(mockDoctorLink.putSharing(connectionId, next))
    }
    const { data } = await api.put(
      `/doctor/connections/${connectionId}/sharing`,
      next,
    )
    return data.result
  },
}
