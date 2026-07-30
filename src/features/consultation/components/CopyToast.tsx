import Animated, { FadeInDown, FadeOut } from "react-native-reanimated"
import { StyleSheet, Text } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

/**
 * 복사 확인 토스트. 레이아웃에 끼어들지 않는 플로팅 잉크 필 —
 * 호출부가 absolute 오버레이에 얹는다(pointerEvents 없음).
 */
export function CopyToast({ message }: { message: string }) {
  const isDark = useAppColorScheme() === "dark"
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(180)}
      style={[
        styles.pill,
        { backgroundColor: isDark ? "#3A3B40" : "rgba(29,30,32,0.94)" },
      ]}
    >
      <Text style={styles.label}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.18,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.28,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Pretendard-SemiBold",
  },
})
