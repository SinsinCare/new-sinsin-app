import React from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { ANNOUNCEMENTS } from "@/src/features/settings/data/constants"

export function AnnouncementListScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <ThemedView style={styles.container}>
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
              index < ANNOUNCEMENTS.length - 1 && styles.itemBorder,
              pressed && styles.itemPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/(settings)/announcement-detail",
                params: { id: item.id },
              })
            }
          >
            <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
            <ThemedText style={styles.itemDate}>{item.date}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  item: {
    paddingVertical: 20,
    gap: 6,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  itemPressed: {
    backgroundColor: "#FAFAFA",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  itemTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: "#17191C",
  },
  itemDate: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: "#94A3B8",
  },
})
