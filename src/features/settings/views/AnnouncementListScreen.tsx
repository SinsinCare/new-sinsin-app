import React, { useEffect, useState } from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { announcementService } from "@/src/features/announcement/services/announcementService"
import type { AnnouncementNotice } from "@/src/features/announcement/types"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { ANNOUNCEMENTS } from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

type AnnouncementListItem = {
  id: string
  title: string
  date: string
}

export function AnnouncementListScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()
  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadAnnouncements() {
      try {
        const notices = await announcementService.fetchList()
        if (!mounted) return
        setAnnouncements(notices.map(toListItem))
      } catch {
        if (!mounted) return
        setAnnouncements(ANNOUNCEMENTS.map(toFallbackListItem))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadAnnouncements()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title="공지사항"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ThemedText style={[styles.empty, { color: c.textMuted }]}>
            공지사항을 불러오는 중입니다.
          </ThemedText>
        ) : announcements.length === 0 ? (
          <ThemedText style={[styles.empty, { color: c.textMuted }]}>
            등록된 공지사항이 없습니다.
          </ThemedText>
        ) : (
          announcements.map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.item,
                index < announcements.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: c.inputBg,
                },
                pressed && {
                  backgroundColor: c.pressedBg,
                  marginHorizontal: -20,
                  paddingHorizontal: 20,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/(settings)/announcement-detail",
                  params: { id: item.id },
                })
              }
            >
              <ThemedText style={[styles.itemTitle, { color: c.text }]}>
                {item.title}
              </ThemedText>
              <ThemedText style={[styles.itemDate, { color: c.textMuted }]}>
                {item.date}
              </ThemedText>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ThemedView>
  )
}

function toListItem(notice: AnnouncementNotice): AnnouncementListItem {
  return {
    id: String(notice.id),
    title: notice.title,
    date: formatNoticeDate(notice.createdAt),
  }
}

function toFallbackListItem(
  item: (typeof ANNOUNCEMENTS)[number],
): AnnouncementListItem {
  return {
    id: item.id,
    title: item.title,
    date: item.date,
  }
}

function formatNoticeDate(value: string): string {
  if (/^\d{4}\.\d{2}\.\d{2}/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("ko-KR")
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  item: {
    paddingVertical: 20,
    gap: 6,
  },
  itemTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  itemDate: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 60,
  },
})
