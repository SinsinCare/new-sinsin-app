import { Pressable } from "react-native"
import { XStack, Text, useThemeName } from "tamagui"
import { Icon, type IconName } from "./Icon"

interface ChipProps {
  icon?: IconName
  label: string
  isSelected?: boolean
  onPress?: () => void
}

const COLORS = {
  light: {
    default: { bg: "#EAEAF0", fg: "#3C3C43" },
    selected: { bg: "#0D896C", fg: "#FFFFFF" },
  },
  dark: {
    default: { bg: "#313138", fg: "#ABABB4" },
    selected: { bg: "#42AF94", fg: "#2E2E34" },
  },
} as const

export function Chip({ icon, label, isSelected = false, onPress }: ChipProps) {
  const themeName = useThemeName()
  const isDark = themeName === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light
  const colors = isSelected ? palette.selected : palette.default

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <XStack
        alignItems="center"
        gap="$1.5"
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius="$12"
        backgroundColor={colors.bg}
      >
        {icon && <Icon name={icon} size={16} color={colors.fg} />}
        <Text fontSize={12} lineHeight={16} color={colors.fg} fontWeight="500">
          {label}
        </Text>
      </XStack>
    </Pressable>
  )
}
