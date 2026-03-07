import React from "react"
import { View, Pressable, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { ThemedText } from "@/components/themed-text"

interface ScreenHeaderProps {
  title: string
  paddingTop?: number
  onBack?: () => void
  rightElement?: React.ReactNode
}

export function ScreenHeader({ title, paddingTop = 0, onBack, rightElement }: ScreenHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#17191C" />
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
      <ThemedText style={styles.headerTitle}>{title}</ThemedText>
      {rightElement !== undefined ? rightElement : <View style={styles.placeholder} />}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: "#17191C",
  },
  placeholder: {
    width: 24,
  },
})
