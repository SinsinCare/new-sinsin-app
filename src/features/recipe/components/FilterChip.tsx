// src/features/recipe/components/FilterChip.tsx
import { Pressable, useColorScheme } from "react-native"
import { XStack, Text } from "tamagui"

type FilterChipTheme = "default" | "primary" | "sub" | "tertiary"

interface FilterChipProps {
  label: string
  theme?: FilterChipTheme
  onPress?: () => void
}

const THEME_COLORS = {
  default: {
    light: { border: "#8686864D", text: "#2A2A37" },
    dark: { border: "#8686868F", text: "#E7E7EE" },
  },
  primary: {
    light: { border: "#E78A63F2", text: "#E78A63" },
    dark: { border: "#E78A63F2", text: "#E78A63" },
  },
  sub: {
    light: { border: "#37A589F2", text: "#37A589" },
    dark: { border: "#37A589F2", text: "#37A589" },
  },
  tertiary: {
    light: { border: "#9F9F9F", text: "#9F9F9F" },
    dark: { border: "#9F9F9F", text: "#9F9F9F" },
  },
} as const

export function FilterChip({
  label,
  theme = "default",
  onPress,
}: FilterChipProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const palette = isDark ? THEME_COLORS[theme].dark : THEME_COLORS[theme].light

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
