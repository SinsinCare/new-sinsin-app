import { StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useAuthSurface } from "../hooks/useAuthSurface"

interface CheckCircleProps {
  checked: boolean
  size?: number
}

/**
 * 약관·복수선택에 쓰는 원형 체크. 체크 전에는 회색 원 안의 회색 체크,
 * 체크되면 브랜드 원 안의 흰 체크 — 상태는 이 원 하나로만 말하고
 * 면(배경)은 건드리지 않는다.
 */
export function CheckCircle({ checked, size = 22 }: CheckCircleProps) {
  const surface = useAuthSurface()
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: checked ? surface.brand : "transparent",
          borderWidth: checked ? 0 : 1.5,
          borderColor: surface.border,
        },
      ]}
    >
      <Ionicons
        name="checkmark"
        size={size * 0.62}
        color={checked ? surface.onBrand : surface.border}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
})
