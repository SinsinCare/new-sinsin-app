import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { MealType } from "@/src/features/home/types"

export type NotificationItemType = "food_analysis"

export interface NotificationItem {
  id: string
  type: NotificationItemType
  /** 새 항목은 의미 데이터로 저장해 현재 앱 언어에서 문장을 만든다. */
  foodName?: string
  mealType?: MealType
  /** 이전 버전에서 저장한 항목과의 호환용. 새 항목에는 쓰지 않는다. */
  title?: string
  body?: string
  timestamp: string // ISO string
  read: boolean
}

interface NotificationHistoryState {
  items: NotificationItem[]
  addNotification: (
    item: Omit<NotificationItem, "id" | "timestamp" | "read">,
  ) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
}

export const useNotificationHistoryStore = create<NotificationHistoryState>()(
  persist(
    (set) => ({
      items: [],
      addNotification: (item) =>
        set((state) => ({
          items: [
            {
              ...item,
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...state.items,
          ].slice(0, 50), // 최대 50개 유지
        })),
      markAsRead: (id) =>
        set((state) => ({
          items: state.items.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),
      markAllAsRead: () =>
        set((state) => ({
          items: state.items.map((n) => ({ ...n, read: true })),
        })),
      clearAll: () => set({ items: [] }),
    }),
    {
      name: "@sinsin/notification-history",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
