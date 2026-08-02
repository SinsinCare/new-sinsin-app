/**
 * 공지사항 목록.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 2026-07-31: **네 번째 디자인 시스템을 쓰고 있었다**
 *
 * 이 화면은 앱의 나머지와 다른 부품으로 조립돼 있었다:
 *
 *  - `ThemedView`/`ThemedText` — Expo 템플릿에서 온 컴포넌트. 앱 어디에도 이 팔레트가 없다.
 *  - `useSettingsColors()` — 설정 화면 전용 색 훅(legacy).
 *  - `ScreenHeader`(legacy) — 상세·보관함이 쓰는 `V2ScreenHeader` 와 제목 크기·위치가 다르다.
 *  - 좌우 여백 20 — 앱의 격자는 `GUTTER`(16)다.
 *  - `fontWeight: "600"` — Pretendard 가 굵기별 4파일로 로드돼 있어 face 위에 weight 를
 *    겹치면 iOS 에서 가짜 볼드가 난다(`typography.ts` 머리말). v2 는 굵기를 face 로만 말한다.
 *  - 행 사이 1px 실선 — 앱 규칙은 보더리스이고 목록은 헤어라인으로 끊는다.
 *
 * 즉 색·타이포·격자·헤더가 전부 다른 시스템이었다. **바꾼 것은 이 화면의 취향이 아니라
 * 소속**이다 — 레시피 상세·보관함·식당이 이미 서 있는 design-system-v2 로 옮겼다.
 *
 * ■ 그대로 둔 것
 *
 * 데이터 경로(서버 실패 시 번들 상수로 떨어지는 폴백)와 날짜 표기 규칙은 건드리지 않았다.
 * 그건 디자인이 아니라 동작이고, 이 작업의 범위가 아니다.
 */
import { useEffect, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import {
  GUTTER,
  SECTION_GAP,
  V2Divider,
  V2Skeleton,
  V2SkeletonGroup,
  V2ScreenHeader,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { announcementService } from "@/src/features/announcement/services/announcementService"
import type { AnnouncementNotice } from "@/src/features/announcement/types"
import { ANNOUNCEMENTS } from "@/src/features/settings/data/constants"
import appI18n, { getAppLanguage } from "@/src/i18n"

type AnnouncementListItem = {
  id: string
  title: string
  date: string
}

export function AnnouncementListScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { colors } = useV2Theme()
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
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <V2ScreenHeader
        title={t("announcements.title")}
        onBack={() => router.back()}
      />

      {loading ? (
        // 공지는 제목 한 줄 + 날짜 한 줄이 반복되는 목록이다. 그 리듬을 그대로 깐다.
        <V2SkeletonGroup style={styles.skeletonList}>
          {[0, 1, 2, 3, 4].map((index) => (
            <View key={index} style={styles.skeletonRow}>
              <V2Skeleton width="72%" height={16} />
              <V2Skeleton width={84} height={13} />
            </View>
          ))}
        </V2SkeletonGroup>
      ) : (
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{ paddingBottom: insets.bottom + SECTION_GAP }}
          showsVerticalScrollIndicator={false}
        >
          {announcements.length === 0 ? (
            <Text style={[styles.empty, { color: colors.label.alternative }]}>
              {t("announcements.empty")}
            </Text>
          ) : (
            announcements.map((item, index) => (
              <View key={item.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() =>
                    router.push({
                      pathname: "/(settings)/announcement-detail",
                      params: { id: item.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.item,
                    pressed && { backgroundColor: colors.fill.pressed },
                  ]}
                >
                  <Text
                    style={[styles.itemTitle, { color: colors.label.normal }]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.itemDate,
                      { color: colors.label.alternative },
                    ]}
                  >
                    {item.date}
                  </Text>
                </Pressable>
                {/* 줄 사이는 헤어라인 하나. 마지막 줄 뒤에는 긋지 않는다 —
                    목록이 끝났는데 선이 남으면 다음 항목을 기다리게 된다. */}
                {index < announcements.length - 1 && (
                  <V2Divider tone="alternative" style={styles.divider} />
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
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
  skeletonList: { paddingHorizontal: GUTTER, paddingTop: SECTION_GAP },
  skeletonRow: { gap: 8, paddingVertical: 16 },
  container: { flex: 1 },
  /** 한 줄. 좌우는 화면 격자(`GUTTER`), 위아래는 두 줄이 숨 쉴 만큼. */
  item: {
    paddingHorizontal: GUTTER,
    paddingVertical: spacing[16],
    gap: spacing[4],
  },
  /** 헤어라인은 글자 시작선에 맞춰 들여 쓴다 — 화면 끝까지 그으면 섹션 경계처럼 보인다. */
  divider: { marginLeft: GUTTER },
  itemTitle: { ...typography.label.small },
  itemDate: { ...typography.subtext.medium },
  empty: {
    ...typography.body.mediumWeak,
    textAlign: "center",
    marginTop: SECTION_GAP * 3,
    paddingHorizontal: GUTTER,
  },
})
