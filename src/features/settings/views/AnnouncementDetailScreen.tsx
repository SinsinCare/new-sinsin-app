import React from "react"
import { StyleSheet, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { ANNOUNCEMENTS } from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

export function AnnouncementDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useSettingsColors()

  const announcement = ANNOUNCEMENTS.find((a) => a.id === id)

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
        {announcement ? (
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
