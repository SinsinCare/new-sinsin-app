import React from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { ANNOUNCEMENTS } from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

export function AnnouncementListScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()

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
        {ANNOUNCEMENTS.map((item, index) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.item,
              index < ANNOUNCEMENTS.length - 1 && {
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
        ))}
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
})
