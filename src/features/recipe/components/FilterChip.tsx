// src/features/recipe/components/FilterChip.tsx
import { Pressable, useColorScheme } from "react-native"
import { XStack, Text } from "tamagui"

type FilterChipTheme = "default" | "primary" | "sub" | "tertiary" | "category"

interface FilterChipProps {
  label: string
  theme?: FilterChipTheme
  selected?: boolean
  onPress?: () => void
}

const THEME_COLORS = {
  default: {
    light: { border: "#ABABB4", text: "#66666B" },
    dark: { border: "#8686868F", text: "#E7E7EE" },
  },
  primary: {
    light: { border: "#FF9775", text: "#FF7246" },
    dark: { border: "#E78A63F2", text: "#E78A63" },
  },
  sub: {
    light: { border: "#44AF94", text: "#44AF94" },
    dark: { border: "#37A589F2", text: "#37A589" },
  },
  tertiary: {
    light: { border: "#8686868F", text: "#66666B" },
    dark: { border: "#9F9F9F", text: "#9F9F9F" },
  },
  category: {
    light: { border: "#81818D", text: "#81818D" },
    dark: { border: "#9F9F9F", text: "#9F9F9F" },
  },
} as const

const SELECTED_COLORS = {
  default: {
    light: { border: "#EE6145", text: "#EE6145" },
    dark: { border: "#E77661", text: "#E77661" },
  },
  primary: {
    light: { border: "#EE6145", text: "#EE6145" },
    dark: { border: "#E77661", text: "#E77661" },
  },
  sub: {
    light: { border: "#EE6145", text: "#EE6145" },
    dark: { border: "#E77661", text: "#E77661" },
  },
  tertiary: {
    light: { border: "#EE6145", text: "#EE6145" },
    dark: { border: "#E77661", text: "#E77661" },
  },
  category: {
    light: { border: "#474758", text: "#2A2A37" },
    dark: { border: "#E7E7EE8A", text: "#E7E7EE" },
  },
} as const

export function FilterChip({
  label,
  theme = "default",
  selected = false,
  onPress,
}: FilterChipProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  const palette = selected
    ? isDark
      ? SELECTED_COLORS[theme].dark
      : SELECTED_COLORS[theme].light
    : isDark
      ? THEME_COLORS[theme].dark
      : THEME_COLORS[theme].light

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <XStack
        alignItems="center"
        paddingHorizontal={6}
        paddingVertical={3}
        borderRadius={13}
        borderWidth={1}
        borderColor={palette.border}
      >
        <Text
          fontSize={12}
          lineHeight={16}
          fontWeight="500"
          fontFamily="$body"
          color={palette.text}
        >
          {label}
        </Text>
      </XStack>
    </Pressable>
  )
}
