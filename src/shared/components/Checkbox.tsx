import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, Text, XStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"

interface CheckboxProps {
  checked: boolean
  onToggle: () => void
  label?: string
  size?: number
  disabled?: boolean
}

export function Checkbox({
  checked,
  onToggle,
  label,
  size = 22,
  disabled = false,
}: CheckboxProps) {
  const isDark = useAppColorScheme() === "dark"
  const uncheckedBg = isDark ? tokens.color.cardBgDark.val : "white"
  const uncheckedBorder = isDark ? "#6B7280" : "#C5C8CE"
  const labelColor = isDark ? tokens.color.textDark.val : "#3F444F"

  return (
    <Pressable onPress={onToggle} disabled={disabled}>
      <XStack alignItems="center" gap={10}>
        <YStack
          width={size}
          height={size}
          borderRadius={4}
          borderWidth={1.5}
          borderColor={checked ? tokens.color.sub6.val : uncheckedBorder}
          backgroundColor={checked ? tokens.color.sub6.val : uncheckedBg}
          alignItems="center"
          justifyContent="center"
          opacity={disabled ? 0.5 : 1}
        >
          {checked && (
            <Ionicons name="checkmark" size={size - 6} color="white" />
          )}
        </YStack>
        {label && (
          <Text fontSize={14} color={labelColor} letterSpacing={0}>
            {label}
          </Text>
        )}
      </XStack>
    </Pressable>
  )
}
