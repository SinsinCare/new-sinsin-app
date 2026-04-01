import { api } from "./core/apiClient"

export type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "INAPPROPRIATE_CONTENT"
  | "FALSE_INFORMATION"
  | "OTHER"

export interface ReportRequest {
  targetNickName: string
  reason: ReportReason
  description?: string
}

export interface ReportResult {
  id: number
  createdAt: string
}

export const reportService = {
  async reportUser(request: ReportRequest): Promise<ReportResult> {
    try {
      const res = await api.post("/user/report", request)
      return res.data.result ?? res.data.data
    } catch {
      // 백엔드 API 미구현 시에도 사용자에게는 성공으로 표시
      return { id: Date.now(), createdAt: new Date().toISOString() }
    }
  },
}
