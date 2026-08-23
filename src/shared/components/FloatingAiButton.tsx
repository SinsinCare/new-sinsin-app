import { Pressable, StyleSheet } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useAppRouter } from "@/src/shared/navigation"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { hapticSelection } from "@/src/lib/haptics"
import { Icon } from "@/src/shared/components/Icon"
import { MOTION } from "@/src/theme/surface"
import { useTranslation } from "react-i18next"
import { FLOATING_AI_BUTTON_HEIGHT as PILL_HEIGHT } from "./floatingAiButtonLayout"

/**
 * 어디서든 AI에게 묻는 전역 플로팅 필. 탭바 위 우하단 고정 —
 * 상담이 탭에서 빠진 대신 모든 탭에서 한 번에 닿는다.
 *
 * 브랜드 오렌지 대신 잉크색 필을 쓴다 — 화면마다 있는 주황 액션 버튼(글쓰기 등)과
 * 위계가 섞이지 않고, 어떤 배경 위에서도 어시스턴트로 읽힌다.
 * 플로팅은 쉐도우리스 규칙의 유일한 예외다. 떠 있음은 그림자만이 말할 수 있다.
 */

const PILL_BG = { light: "#1D1E20", dark: "#F4F4F6" } as const
const PILL_CONTENT = { light: "#FFFFFF", dark: "#17181C" } as const

export function FloatingAiButton({ bottom }: { bottom: number }) {
  const { t } = useTranslation("common")
  const router = useAppRouter()
  const isDark = useAppColorScheme() === "dark"
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const contentColor = isDark ? PILL_CONTENT.dark : PILL_CONTENT.light

  return (
    <Animated.View
      style={[styles.wrap, { bottom }, animatedStyle]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("consult.open")}
        onPressIn={() => {
          scale.value = withSpring(0.94, MOTION.spring)
        }}
        onPressOut={() => {
          scale.value = withSpring(1, MOTION.spring)
        }}
        onPress={() => {
          hapticSelection()
          router.push("/consult")
        }}
        style={[
          styles.pill,
          { backgroundColor: isDark ? PILL_BG.dark : PILL_BG.light },
        ]}
      >
        {/* 두 톤 채움이라 tint 를 받지 않는다 — registry 의 sparkle 주석. */}
        <Icon name="sparkle" size={18} />
        <Text style={[styles.label, { color: contentColor }]}>
          {t("consult.shortTitle")}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 20,
  },
  pill: {
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    paddingLeft: 16,
    paddingRight: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.22,
    elevation: 8,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.3,
    fontWeight: "700",
  },
})

/**
 * 좌표 상수의 정본은 `floatingAiButtonLayout.ts`(순수 모듈)다. 여기서 다시 적지 않고
 * re-export 만 한다 — 화면이 "마지막 줄이 이 필에 가리지 않을 만큼" 바닥을 비우는
 * 계산을 jest 로 못 박아야 하는데, 이 파일은 `react-native-reanimated` 를 들여와
 * node 환경의 jest 가 파싱하지 못한다. 자세한 이유는 그 파일 머리말.
 */
export {
  FLOATING_AI_BUTTON_BOTTOM,
  FLOATING_AI_BUTTON_COVERAGE,
  FLOATING_AI_BUTTON_HEIGHT,
  floatingAiButtonBottomInScreen,
  floatingAiButtonScrollInset,
} from "./floatingAiButtonLayout"
