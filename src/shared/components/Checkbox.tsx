import { Pressable, StyleSheet, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2HStack, V2Text } from "@/src/design-system-v2"
import Ionicons from "@expo/vector-icons/Ionicons"
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
      <V2HStack align="center" gap={10}>
        {/* 상자는 크기가 prop 으로 오므로 인라인 스타일이다 — 토큰으로 못 접는다. */}
        <View
          style={[
            styles.box,
            {
              width: size,
              height: size,
              borderColor: checked ? tokens.color.sub6.val : uncheckedBorder,
              backgroundColor: checked ? tokens.color.sub6.val : uncheckedBg,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {checked && (
            <Ionicons name="checkmark" size={size - 6} color="white" />
          )}
        </View>
        {label && (
          <V2Text style={styles.label} color={labelColor}>
            {label}
          </V2Text>
        )}
      </V2HStack>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  /* letterSpacing 0 은 원본 그대로 — tamagui 기본값이 0 이 아니어서 명시돼 있었다. */
  label: { fontSize: 14, letterSpacing: 0 },
})
