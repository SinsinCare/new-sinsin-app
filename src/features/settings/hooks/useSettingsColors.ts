import { useColorScheme } from "react-native"
import { tokens } from "@/src/theme/tokens"

export function useSettingsColors() {
  const isDark = useColorScheme() === "dark"

  return {
    isDark,
    // Backgrounds
    bg: isDark ? tokens.color.appBgDark.val : "#FFFFFF",
    cardBg: isDark ? tokens.color.cardBgDark.val : "#FFFFFF",
    secondaryBg: isDark ? tokens.color.cardBgDark.val : "#F5F6FA",
    inputBg: isDark ? "#2A2A32" : "#F0F2F5",
    pressedBg: isDark ? "#2A2A32" : "#F9F9F9",
    avatarBg: isDark ? "#3A3A42" : "#F0F0F0",
    // Text
    text: isDark ? tokens.color.textDark.val : "#17191C",
    textSub: isDark ? tokens.color.textDarkSub.val : "#555",
    textTertiary: isDark ? "#6B7280" : "#C5C8CE",
    textMuted: isDark ? "#6B7280" : "#94A3B8",
    // Borders
    border: isDark ? "#3A3A42" : "#E0E0E0",
    divider: isDark ? "#2A2A32" : "#DADFE699",
    // Icon
    icon: isDark ? tokens.color.textDarkSub.val : "#474758",
    iconLight: isDark ? "#6B7280" : "#C4C4C4",
    // Overlay / Modal
    modalBg: isDark ? "#2A2A32" : "#FFFFFF",
    // Green accents stay the same in both modes
  }
}
