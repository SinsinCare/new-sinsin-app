// src/features/recipe/components/FilterChip.tsx
import { Pressable, useColorScheme } from "react-native"
import { XStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"

type FilterChipTheme = "default" | "primary" | "sub" | "tertiary" | "category"

interface FilterChipProps {
  label: string
  theme?: FilterChipTheme
  selected?: boolean
  onPress?: () => void
}

const THEME_COLORS = {
  default: {
    light: { border: tokens.color.textDarkSub.val, text: "#66666B" },
    dark: { border: "#8686868F", text: tokens.color.textDark.val },
  },
  primary: {
    light: { border: "#FF9D77B0", text: "#EE9A69" },
    dark: { border: "#D0A5946E", text: "#BC8362" },
  },
  sub: {
    light: { border: "#4889784F", text: "#44AF94B0" },
    dark: { border: "#4889784F", text: "#44AF94B0" },
  },
  tertiary: {
    light: { border: tokens.color.textDarkSub.val, text: "#858591" },
    dark: { border: "#535356", text: "#858591" },
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
    light: { border: "#FF9775", text: tokens.color.primaryAccent.val },
    dark: { border: "#EB9E7F", text: "#E48D68" },
  },
  sub: {
    light: { border: "#488978", text: "#3FA68C" },
    dark: { border: "#488978", text: "#3FA68C" },
  },
  tertiary: {
    light: { border: "#66666B", text: tokens.color.inputBgDark.val },
    dark: { border: "#E7E7EE8A", text: tokens.color.textDark.val },
  },
  category: {
    light: { border: "#474758", text: tokens.color.textLight.val },
    dark: { border: "#E7E7EE8A", text: tokens.color.textDark.val },
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
          fontSize={14}
          lineHeight={20}
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
