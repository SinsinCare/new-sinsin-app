import React from "react"
import { View, Switch, StyleSheet, Platform } from "react-native"

import { ThemedText } from "@/components/themed-text"

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
  return (
    <View style={styles.toggleItem}>
      <View style={styles.toggleItemLeft}>
        <ThemedText style={styles.toggleTitle}>{title}</ThemedText>
        <ThemedText style={styles.toggleDescription}>{description}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#E5E7EB", true: "#0D896A" }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E5E7EB"
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
    ...Platform.select({
      android: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#F0F0F0",
      },
    }),
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
    color: "#17191C",
  },
  toggleDescription: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
    color: "#C5C8CE",
  },
})
