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
import { parseServerDate } from "@/src/shared/utils/serverDate"

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

/**
 * 서버 `createdAt` → 사용자 로케일 날짜.
 *
 * 서버는 **오프셋 표기가 없는 UTC** 를 준다(`2026-08-20T10:59:07.030000` — bun
 * `user/service.ts`). ES 명세는 그런 문자열을 **로컬**로 읽으므로 맨 `new Date(value)`
 * 는 KST 에서 9시간 이르게 읽혔고, 그래서 자정 근처(00:00~09:00 KST)에 올라온 공지가
 * **전날 날짜**로 나왔다. `parseServerDate` 가 UTC 로 읽고, 그리는 것은 그대로 기기
 * 로컬 날짜다 — 읽는 사람의 "며칠" 이 맞다. 이미 `Z`/`+09:00` 이 붙은 값은 건드리지
 * 않으므로 서버가 표기를 붙여도 반대로 어긋나지 않는다.
 *
 * 번들 폴백(`ANNOUNCEMENTS`)은 이미 `YYYY.MM.DD` 라 위 조기 반환으로 그대로 나간다.
 */
function formatNoticeDate(value: string): string {
  if (/^\d{4}\.\d{2}\.\d{2}/.test(value)) return value
  const date = parseServerDate(value)
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
