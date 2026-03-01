// src/features/recipe/components/FilterChip.tsx
import { Pressable, useColorScheme } from "react-native"
import { XStack, Text } from "tamagui"

interface FilterChipProps {
  label: string
  isSelected?: boolean
  onPress?: () => void
}

const COLORS = {
  light: {
    border: "#8686864D",
    text: "#2A2A37",
    selectedBorder: "#028A67",
    selectedText: "#028A67",
  },
  dark: {
    border: "#8686868F",
    text: "#E7E7EE",
    selectedBorder: "#42AF94",
    selectedText: "#42AF94",
  },
} as const

export function FilterChip({
  label,
  isSelected = false,
  onPress,
}: FilterChipProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <XStack
        alignItems="center"
        paddingHorizontal={6}
        paddingVertical={3}
        borderRadius={13}
        borderWidth={1}
        borderColor={isSelected ? palette.selectedBorder : palette.border}
      >
        <Text
          fontSize={12}
          lineHeight={16}
          fontWeight="500"
          fontFamily="$body"
          color={isSelected ? palette.selectedText : palette.text}
        >
          {label}
        </Text>
      </XStack>
    </Pressable>
  )
}
