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
    const res = await api.post("/user/report", request)
    return res.data.result ?? res.data.data
  },
}
