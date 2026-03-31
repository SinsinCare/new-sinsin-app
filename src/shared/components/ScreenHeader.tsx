import React from "react"
import { View, Pressable, StyleSheet, useColorScheme } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { ThemedText } from "@/components/themed-text"
import { tokens } from "@/src/theme/tokens"

interface ScreenHeaderProps {
  title: string
  paddingTop?: number
  onBack?: () => void
  rightElement?: React.ReactNode
}

export function ScreenHeader({
  title,
  paddingTop = 0,
  onBack,
  rightElement,
}: ScreenHeaderProps) {
  const isDark = useColorScheme() === "dark"
  const textColor = isDark ? tokens.color.textDark.val : "#17191C"

  return (
    <View style={[styles.header, { paddingTop }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
      <ThemedText style={[styles.headerTitle, { color: textColor }]}>
        {title}
      </ThemedText>
      {rightElement !== undefined ? (
        rightElement
      ) : (
        <View style={styles.placeholder} />
      )}
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
  },
  placeholder: {
    width: 24,
  },
})
