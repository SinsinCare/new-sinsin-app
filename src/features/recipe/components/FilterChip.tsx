// src/features/recipe/components/FilterChip.tsx
import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
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
    light: {
      border: tokens.color.textDarkSub.val,
      text: "#66666B",
      background: "transparent",
    },
    dark: {
      border: "#8686868F",
      text: tokens.color.textDark.val,
      background: "transparent",
    },
  },
  primary: {
    light: { border: "#FF9D77B0", text: "#EE9A69", background: "transparent" },
    dark: { border: "#D0A5946E", text: "#BC8362", background: "transparent" },
  },
  sub: {
    light: {
      border: "#4889784F",
      text: "#44AF94B0",
      background: "transparent",
    },
    dark: { border: "#4889784F", text: "#44AF94B0", background: "transparent" },
  },
  tertiary: {
    light: {
      border: tokens.color.textDarkSub.val,
      text: "#858591",
      background: "transparent",
    },
    dark: { border: "#535356", text: "#858591", background: "transparent" },
  },
  category: {
    light: { border: "#81818D", text: "#81818D", background: "transparent" },
    dark: { border: "#9F9F9F", text: "#9F9F9F", background: "transparent" },
  },
} as const

const SELECTED_COLORS = {
  default: {
    light: { border: "#EE6145", text: "#FFFFFF", background: "#EE6145" },
    dark: { border: "#E77661", text: "#1F1F21", background: "#E77661" },
  },
  primary: {
    light: { border: "#FF9775", text: "#FFFFFF", background: "#FF9775" },
    dark: { border: "#EB9E7F", text: "#1F1F21", background: "#EB9E7F" },
  },
  sub: {
    light: { border: "#488978", text: "#FFFFFF", background: "#488978" },
    dark: { border: "#63C3AC", text: "#1F1F21", background: "#63C3AC" },
  },
  tertiary: {
    light: { border: "#66666B", text: "#FFFFFF", background: "#66666B" },
    dark: { border: "#E7E7EE", text: "#1F1F21", background: "#E7E7EE" },
  },
  category: {
    light: { border: "#474758", text: "#FFFFFF", background: "#474758" },
    dark: { border: "#E7E7EE", text: "#1F1F21", background: "#E7E7EE" },
  },
} as const

export function FilterChip({
  label,
  theme = "default",
  selected = false,
  onPress,
}: FilterChipProps) {
  const colorScheme = useAppColorScheme()
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
        backgroundColor={palette.background}
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
