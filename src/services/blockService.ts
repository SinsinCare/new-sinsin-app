import { api } from "./core/apiClient"

export interface BlockedUser {
  id: number
  blockedNickName: string
  createdAt: string
}

export const blockService = {
  async blockUser(blockedNickName: string): Promise<BlockedUser> {
    const res = await api.post("/user/block", { blockedNickName })
    return res.data.result ?? res.data.data
  },

  async getBlockedUsers(): Promise<BlockedUser[]> {
    try {
      const res = await api.get("/user/block")
      return res.data.result ?? res.data.data ?? []
    } catch {
      return []
    }
  },
}
