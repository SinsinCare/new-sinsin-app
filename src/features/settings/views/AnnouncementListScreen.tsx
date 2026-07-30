import React, { useEffect, useState } from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { announcementService } from "@/src/features/announcement/services/announcementService"
import type { AnnouncementNotice } from "@/src/features/announcement/types"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { ANNOUNCEMENTS } from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import appI18n, { getAppLanguage } from "@/src/i18n"

type AnnouncementListItem = {
  id: string
  title: string
  date: string
}

export function AnnouncementListScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()
  const { t } = useTranslation("settings")
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
        ) : announcements.length === 0 ? (
          <ThemedText style={[styles.empty, { color: c.textMuted }]}>
            {t("announcements.empty")}
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
    title: getFallbackTitle(item.id),
    date: item.date,
  }
}

function getFallbackTitle(id: string): string {
  switch (id) {
    case "1":
      return appI18n.t("announcements.fallback.1.title", { ns: "settings" })
    case "2":
      return appI18n.t("announcements.fallback.2.title", { ns: "settings" })
    case "3":
      return appI18n.t("announcements.fallback.3.title", { ns: "settings" })
    default:
      return ""
  }
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
