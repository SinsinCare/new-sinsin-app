import { Pressable, useColorScheme } from "react-native"
import { XStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import type { MealType } from "../types"

interface MealTypeToggleProps {
  value: MealType
  onChange: (type: MealType) => void
}

export function MealTypeToggle({ value, onChange }: MealTypeToggleProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  const activeColor = tokens.color.primaryAccent.val
  const inactiveColor = isDark
    ? tokens.color.textDarkSub.val
    : tokens.color.grey5.val
  const activeBg = isDark ? "rgba(238,97,69,0.15)" : "rgba(238,97,69,0.1)"

  return (
    <XStack
      gap={4}
      backgroundColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
      borderRadius={20}
      padding={3}
    >
      {(["LUNCH", "DINNER"] as const).map((type) => {
        const isActive = value === type
        const label = type === "LUNCH" ? "점심" : "저녁"
        return (
          <Pressable key={type} onPress={() => onChange(type)}>
            <XStack
              paddingHorizontal={14}
              paddingVertical={6}
              borderRadius={16}
              backgroundColor={isActive ? activeBg : "transparent"}
            >
              <Text
                fontSize={13}
                fontFamily="$body"
                fontWeight={isActive ? "700" : "500"}
                color={isActive ? activeColor : inactiveColor}
              >
                {label}
              </Text>
            </XStack>
          </Pressable>
        )
      })}
    </XStack>
  )
}
