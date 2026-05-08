import { useColorScheme } from "react-native"
import { useThemeStore } from "@/src/stores/themeStore"

export function useAppColorScheme(): "light" | "dark" {
  const themeMode = useThemeStore((s) => s.themeMode)
  const system = useColorScheme()
  if (themeMode === "system") return system === "dark" ? "dark" : "light"
  return themeMode
}
