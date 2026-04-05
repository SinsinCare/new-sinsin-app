import React from "react"
import { View, Pressable, StyleSheet } from "react-native"

import { ThemedText } from "@/components/themed-text"
import { tokens } from "@/src/theme/tokens"

interface BottomActionBarProps {
  label: string
  onPress: () => void
  disabled?: boolean
  paddingBottom?: number
}

export function BottomActionBar({
  label,
  onPress,
  disabled = false,
  paddingBottom = 16,
}: BottomActionBarProps) {
  return (
    <View style={[styles.bottomBar, { paddingBottom }]}>
      <Pressable
        style={[styles.button, !disabled && styles.buttonActive]}
        disabled={disabled}
        onPress={onPress}
      >
        <ThemedText
          style={[styles.buttonText, !disabled && styles.buttonTextActive]}
        >
          {label}
        </ThemedText>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  button: {
    backgroundColor: `${tokens.color.sub6.val}59`,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: tokens.color.sub6.val,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: "#FFFFFF24",
  },
  buttonTextActive: {
    color: "#FFFFFF",
  },
})
