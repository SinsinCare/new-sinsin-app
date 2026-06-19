import { api } from "@/src/services/core"
import type { AnnouncementNotice } from "../types"

type ActivePopupResponse = {
  result?: AnnouncementNotice | null
  data?: AnnouncementNotice | null
}

export const announcementService = {
  async fetchActivePopup(): Promise<AnnouncementNotice | null> {
    const response = await api.get<ActivePopupResponse>("/notices/active-popup")
    return response.data.result ?? response.data.data ?? null
  },
}
