import React, { useEffect, useState } from "react"
import { StyleSheet, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { announcementService } from "@/src/features/announcement/services/announcementService"
import type { AnnouncementNotice } from "@/src/features/announcement/types"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { ANNOUNCEMENTS } from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

type AnnouncementDetail = {
  id: string
  title: string
  content: string
  date: string
}

export function AnnouncementDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useSettingsColors()
  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(
    null,
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadAnnouncement() {
      const noticeId = String(id ?? "")
      try {
        const notices = await announcementService.fetchList()
        if (!mounted) return
        const notice = notices.find((item) => String(item.id) === noticeId)
        setAnnouncement(notice ? toDetail(notice) : findFallback(noticeId))
      } catch {
        if (!mounted) return
        setAnnouncement(findFallback(noticeId))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadAnnouncement()

    return () => {
      mounted = false
    }
  }, [id])

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
        ) : announcement ? (
          <>
            <ThemedText style={[styles.title, { color: c.text }]}>
              {announcement.title}
            </ThemedText>
            <ThemedText style={[styles.date, { color: c.textMuted }]}>
              {announcement.date}
            </ThemedText>
            <ThemedText style={[styles.content, { color: c.textSub }]}>
              {announcement.content}
            </ThemedText>
          </>
        ) : (
          <ThemedText style={[styles.empty, { color: c.textMuted }]}>
            공지사항을 찾을 수 없습니다.
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  )
}

function toDetail(notice: AnnouncementNotice): AnnouncementDetail {
  return {
    id: String(notice.id),
    title: notice.title,
    content: notice.content,
    date: formatNoticeDate(notice.createdAt),
  }
}

function findFallback(id: string): AnnouncementDetail | null {
  const item = ANNOUNCEMENTS.find((announcement) => announcement.id === id)
  if (!item) return null
  return {
    id: item.id,
    title: item.title,
    content: item.content,
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
    paddingTop: 12,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    marginBottom: 24,
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "400",
  },
  empty: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 60,
  },
})
