import { Pressable, StyleSheet } from "react-native"

import { V2HStack, V2Text } from "@/src/design-system-v2"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Icon, type IconName } from "./Icon"
import { tokens } from "@/src/theme/tokens"

interface ChipProps {
  icon?: IconName
  label: string
  isSelected?: boolean
  onPress?: () => void
}

const COLORS = {
  light: {
    default: { bg: tokens.color.borderLight.val, fg: "#3C3C43" },
    selected: { bg: "#0D896C", fg: "#FFFFFF" },
  },
  dark: {
    default: {
      bg: tokens.color.cardBgDark.val,
      fg: tokens.color.textDarkSub.val,
    },
    selected: { bg: "#42AF94", fg: tokens.color.inputBgDark.val },
  },
} as const

export function Chip({ icon, label, isSelected = false, onPress }: ChipProps) {
  /*
    tamagui `useThemeName()` → `useAppColorScheme()`.
    같은 값을 주면서 tamagui 에 의존하지 않는다 — 이 앱의 다크모드 판정은 이미
    그 훅 하나로 모여 있다(`Checkbox` 등 다른 shared 컴포넌트와 같은 경로).
  */
  const isDark = useAppColorScheme() === "dark"
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
      <V2HStack
        align="center"
        gap={6}
        paddingHorizontal={12}
        paddingVertical={8}
        style={[styles.chip, { backgroundColor: colors.bg }]}
      >
        {icon && <Icon name={icon} size={16} color={colors.fg} />}
        <V2Text style={styles.label} color={colors.fg}>
          {label}
        </V2Text>
      </V2HStack>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  /* tamagui `$12` = 999(pill). 값이 아니라 의도를 옮긴다. */
  chip: { borderRadius: 999 },
  /* fontWeight 500 은 V2Text 가 Pretendard-Medium face 로 바꾼다. */
  label: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
})
