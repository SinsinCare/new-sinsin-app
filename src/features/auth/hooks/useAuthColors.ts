import { tokens } from "@/src/theme/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

export function useAuthColors() {
  const isDark = useAppColorScheme() === "dark"

  return {
    isDark,
    bg: isDark ? tokens.color.appBgDark.val : "#FFFFFF",
    text: isDark ? tokens.color.textDark.val : "#17191C",
    textSub: isDark ? tokens.color.textDarkSub.val : "#787C83",
    icon: isDark ? tokens.color.textDarkSub.val : "#17191C",
    inputBg: isDark ? "#2A2A32" : "white",
    border: isDark ? "#3A3A42" : "rgba(218,223,230,0.6)",
    disabledBtn: isDark ? "#2A2A32" : "#C5C8CE",
  }
}
