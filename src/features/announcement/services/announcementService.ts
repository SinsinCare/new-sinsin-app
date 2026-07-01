import { api } from "@/src/services/core"
import type { AnnouncementNotice } from "../types"

type ActivePopupResponse = {
  result?: AnnouncementNotice | null
  data?: AnnouncementNotice | null
}

type NoticeListResponse = {
  result?: AnnouncementNotice[] | null
  data?: AnnouncementNotice[] | null
}

export const announcementService = {
  async fetchList(): Promise<AnnouncementNotice[]> {
    const response = await api.get<NoticeListResponse>("/user/notices")
    return response.data.result ?? response.data.data ?? []
  },

  async fetchActivePopup(): Promise<AnnouncementNotice | null> {
    const response = await api.get<ActivePopupResponse>("/notices/active-popup")
    return response.data.result ?? response.data.data ?? null
  },
}
