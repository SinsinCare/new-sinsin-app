import AsyncStorage from "@react-native-async-storage/async-storage"
import type { AnnouncementNotice } from "../types"

export const DISMISSED_ANNOUNCEMENT_IDS_KEY = "@sinsin/announcement-dismissed"

interface DismissedAnnouncement {
  id: number
  revision: string | null
}

interface DismissalTarget extends DismissedAnnouncement {
  usesServerRevision: boolean
}

interface AnnouncementStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

function normalizeRevision(revision: string | number | null | undefined) {
  return revision == null ? null : String(revision)
}

export function getAnnouncementRevision(notice: AnnouncementNotice): string {
  return String(notice.revision ?? notice.updatedAt ?? notice.createdAt)
}

function parseDismissals(raw: string | null): DismissedAnnouncement[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((value): DismissedAnnouncement[] => {
      if (Number.isInteger(value)) {
        return [{ id: value as number, revision: null }]
      }
      if (
        typeof value !== "object" ||
        value === null ||
        !Number.isInteger(value.id)
      ) {
        return []
      }

      return [
        {
          id: value.id as number,
          revision: normalizeRevision(value.revision),
        },
      ]
    })
  } catch {
    return []
  }
}

function getDismissalTarget(
  noticeOrId: AnnouncementNotice | number,
  revision?: string | number | null,
): DismissalTarget {
  if (typeof noticeOrId === "number") {
    return {
      id: noticeOrId,
      revision: normalizeRevision(revision),
      usesServerRevision: revision != null,
    }
  }
  return {
    id: noticeOrId.id,
    revision: getAnnouncementRevision(noticeOrId),
    usesServerRevision:
      noticeOrId.revision != null || noticeOrId.updatedAt != null,
  }
}

export function createDismissedAnnouncementStorage(
  storage: AnnouncementStorage,
) {
  async function getDismissals(): Promise<DismissedAnnouncement[]> {
    return parseDismissals(
      await storage.getItem(DISMISSED_ANNOUNCEMENT_IDS_KEY),
    )
  }

  async function setDismissals(entries: DismissedAnnouncement[]) {
    await storage.setItem(
      DISMISSED_ANNOUNCEMENT_IDS_KEY,
      JSON.stringify(entries),
    )
  }

  return {
    async has(
      noticeOrId: AnnouncementNotice | number,
      revision?: string | number | null,
    ): Promise<boolean> {
      const target = getDismissalTarget(noticeOrId, revision)
      const entries = await getDismissals()
      const exactMatch = entries.some(
        (entry) => entry.id === target.id && entry.revision === target.revision,
      )
      if (exactMatch) return true

      const legacyMatch = entries.some(
        (entry) => entry.id === target.id && entry.revision === null,
      )
      if (!legacyMatch) return false
      return !target.usesServerRevision
    },

    async add(
      noticeOrId: AnnouncementNotice | number,
      revision?: string | number | null,
    ): Promise<void> {
      const target = getDismissalTarget(noticeOrId, revision)
      const entries = await getDismissals()
      if (
        entries.some(
          (entry) =>
            entry.id === target.id && entry.revision === target.revision,
        )
      ) {
        return
      }

      await setDismissals([
        ...entries.filter((entry) => entry.id !== target.id),
        { id: target.id, revision: target.revision },
      ])
    },
  }
}

export const dismissedAnnouncementStorage =
  createDismissedAnnouncementStorage(AsyncStorage)
