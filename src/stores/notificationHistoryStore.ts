import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type NotificationItemType = "food_analysis"

export interface NotificationItem {
  id: string
  type: NotificationItemType
  title: string
  body: string
  timestamp: string // ISO string
  read: boolean
}

interface NotificationHistoryState {
  items: NotificationItem[]
  addNotification: (item: Omit<NotificationItem, "id" | "timestamp" | "read">) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  unreadCount: () => number
}

export const useNotificationHistoryStore = create<NotificationHistoryState>()(
  persist(
    (set, get) => ({
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
          items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllAsRead: () =>
        set((state) => ({
          items: state.items.map((n) => ({ ...n, read: true })),
        })),
      clearAll: () => set({ items: [] }),
      unreadCount: () => get().items.filter((n) => !n.read).length,
    }),
    {
      name: "@sinsin/notification-history",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
