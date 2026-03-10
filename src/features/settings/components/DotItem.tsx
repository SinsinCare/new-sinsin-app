import React from "react"
import { View, StyleSheet } from "react-native"

import { ThemedText } from "@/components/themed-text"

interface DotItemProps {
  text: string
}

export function DotItem({ text }: DotItemProps) {
  return (
    <View style={styles.dotItem}>
      <ThemedText style={styles.dotBullet}>•</ThemedText>
      <ThemedText style={styles.dotText}>{text}</ThemedText>
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
    color: "#555",
  },
  dotText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
    fontWeight: "400",
  },
})
