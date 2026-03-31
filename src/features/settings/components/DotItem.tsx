import React from "react"
import { View, StyleSheet } from "react-native"

import { ThemedText } from "@/components/themed-text"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

interface DotItemProps {
  text: string
}

export function DotItem({ text }: DotItemProps) {
  const c = useSettingsColors()

  return (
    <View style={styles.dotItem}>
      <ThemedText style={[styles.dotBullet, { color: c.textSub }]}>
        •
      </ThemedText>
      <ThemedText style={[styles.dotText, { color: c.textSub }]}>
        {text}
      </ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
  dotItem: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  dotBullet: {
    fontSize: 14,
    lineHeight: 22,
  },
  dotText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
  },
})
