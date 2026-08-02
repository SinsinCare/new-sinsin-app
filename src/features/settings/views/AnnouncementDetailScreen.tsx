import React, { useEffect, useState } from "react"
import { StyleSheet, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { announcementService } from "@/src/features/announcement/services/announcementService"
import type { AnnouncementNotice } from "@/src/features/announcement/types"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { ANNOUNCEMENTS } from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import appI18n, { getAppLanguage } from "@/src/i18n"

type AnnouncementDetail = {
  id: string
  title: string
  content: string
  date: string
}

export function AnnouncementDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useSettingsColors()
  const { t } = useTranslation("settings")
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
        title={t("announcements.title")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ThemedText style={[styles.empty, { color: c.textMuted }]}>
            {t("announcements.loading")}
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
            {t("announcements.notFound")}
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
    title: getFallbackText(item.id, "title"),
    content: getFallbackText(item.id, "content"),
    date: item.date,
  }
}

function getFallbackText(id: string, field: "title" | "content"): string {
  if (id === "1") {
    return field === "title"
      ? appI18n.t("announcements.fallback.1.title", { ns: "settings" })
      : appI18n.t("announcements.fallback.1.content", { ns: "settings" })
  }
  if (id === "2") {
    return field === "title"
      ? appI18n.t("announcements.fallback.2.title", { ns: "settings" })
      : appI18n.t("announcements.fallback.2.content", { ns: "settings" })
  }
  if (id === "3") {
    return field === "title"
      ? appI18n.t("announcements.fallback.3.title", { ns: "settings" })
      : appI18n.t("announcements.fallback.3.content", { ns: "settings" })
  }
  return ""
}

function formatNoticeDate(value: string): string {
  if (/^\d{4}\.\d{2}\.\d{2}/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(getAppLanguage() === "en" ? "en-US" : "ko-KR")
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
