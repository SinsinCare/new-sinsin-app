import AsyncStorage from "@react-native-async-storage/async-storage"

export const DISMISSED_ANNOUNCEMENT_IDS_KEY = "@sinsin/announcement-dismissed"

interface AnnouncementStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

function parseIds(raw: string | null): number[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is number => Number.isInteger(id))
  } catch {
    return []
  }
}

export function createDismissedAnnouncementStorage(
  storage: AnnouncementStorage,
) {
  return {
    async getIds(): Promise<number[]> {
      return parseIds(await storage.getItem(DISMISSED_ANNOUNCEMENT_IDS_KEY))
    },

    async has(id: number): Promise<boolean> {
      const ids = await this.getIds()
      return ids.includes(id)
    },

    async add(id: number): Promise<void> {
      const ids = await this.getIds()
      if (ids.includes(id)) return
      await storage.setItem(
        DISMISSED_ANNOUNCEMENT_IDS_KEY,
        JSON.stringify([...ids, id]),
      )
    },
  }
}

export const dismissedAnnouncementStorage =
  createDismissedAnnouncementStorage(AsyncStorage)
