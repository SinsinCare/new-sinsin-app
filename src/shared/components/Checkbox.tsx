import { Pressable } from "react-native"
import { YStack, Text, XStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"

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
  return (
    <Pressable onPress={onToggle} disabled={disabled}>
      <XStack alignItems="center" gap={10}>
        <YStack
          width={size}
          height={size}
          borderRadius={4}
          borderWidth={1.5}
          borderColor={checked ? "#44AF94" : "#C5C8CE"}
          backgroundColor={checked ? "#44AF94" : "white"}
          alignItems="center"
          justifyContent="center"
          opacity={disabled ? 0.5 : 1}
        >
          {checked && (
            <Ionicons name="checkmark" size={size - 6} color="white" />
          )}
        </YStack>
        {label && (
          <Text fontSize={14} color="#3F444F" letterSpacing={-0.28}>
            {label}
          </Text>
        )}
      </XStack>
    </Pressable>
  )
}
