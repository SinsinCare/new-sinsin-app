import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2HStack, V2Text } from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"
import type { MealType } from "../types"
import { useTranslation } from "react-i18next"

interface MealTypeToggleProps {
  value: MealType
  onChange: (type: MealType) => void
}

export function MealTypeToggle({ value, onChange }: MealTypeToggleProps) {
  const { t } = useTranslation()
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"

  const activeColor = tokens.color.primaryAccent.val
  const inactiveColor = isDark
    ? tokens.color.textDarkSub.val
    : tokens.color.grey5.val
  const activeBg = isDark ? "rgba(238,97,69,0.15)" : "rgba(238,97,69,0.1)"

  return (
    <V2HStack
      gap={4}
      padding={3}
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        borderRadius: 20,
      }}
    >
      {(["LUNCH", "DINNER"] as const).map((type) => {
        const isActive = value === type
        const label = type === "LUNCH" ? t("meal.LUNCH") : t("meal.DINNER")
        return (
          <Pressable key={type} onPress={() => onChange(type)}>
            <V2HStack
              paddingHorizontal={14}
              paddingVertical={6}
              style={{
                borderRadius: 16,
                backgroundColor: isActive ? activeBg : "transparent",
              }}
            >
              <V2Text
                color={isActive ? activeColor : inactiveColor}
                style={{ fontSize: 13, fontWeight: isActive ? "700" : "500" }}
              >
                {label}
              </V2Text>
            </V2HStack>
          </Pressable>
        )
      })}
    </V2HStack>
  )
}
