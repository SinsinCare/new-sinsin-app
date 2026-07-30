import React from "react"
import { View, Switch, StyleSheet, Platform } from "react-native"

import { ThemedText } from "@/components/themed-text"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"

interface ToggleItemProps {
  title: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
}

export function ToggleItem({
  title,
  description,
  value,
  onValueChange,
}: ToggleItemProps) {
  const c = useSettingsColors()

  return (
    <View
      style={[
        styles.toggleItem,
        Platform.OS === "android" && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.border,
        },
      ]}
    >
      <View style={styles.toggleItemLeft}>
        <ThemedText style={[styles.toggleTitle, { color: c.text }]}>
          {title}
        </ThemedText>
        <ThemedText
          style={[styles.toggleDescription, { color: c.textTertiary }]}
        >
          {description}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: c.isDark ? "#3A3A42" : "#E5E7EB",
          true: tokens.color.sub8.val,
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={c.isDark ? "#3A3A42" : "#E5E7EB"}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  toggleItemLeft: {
    flex: 1,
    gap: 4,
    paddingRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
  },
  toggleDescription: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
  },
})
