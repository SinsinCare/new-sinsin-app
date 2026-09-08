import { FONT_SCALE } from "@/src/design-system-v2/tokens/fontScaling"
import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 앱을 여는 동안의 전체 화면.
 *
 * 예전에는 링 스피너 + `신신당부를 여는 중이에요` 였다. 두 가지가 문제였다.
 *
 *  1. 네이티브 스플래시(로고)에서 이 화면으로 넘어오는 순간 로고가 사라지고 링이 뜬다 —
 *     같은 앱을 여는 한 동작이 두 장면으로 끊긴다.
 *  2. 부팅이 빠를 때(토큰이 이미 있고 네트워크가 붙어 있으면 흔하다) `여는 중` 글자가
 *     한 프레임 스쳐 지나간다. 읽히지 않는 글자는 깜빡임일 뿐이다.
 *
 * 그래서 스플래시가 보여 주던 브랜드 마크를 그대로 이어받아 천천히 숨 쉬게 하고,
 * 안내 문구는 **부팅이 실제로 오래 걸릴 때만** 뒤늦게 올린다. 링은 없다.
 */

import { useEffect } from "react"
import { StyleSheet, View, useColorScheme } from "react-native"
import { Image } from "expo-image"
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { useTranslation } from "react-i18next"

import {
  typography,
  useLoadingVisible,
  useV2Theme,
} from "@/src/design-system-v2"
import type { AnalyticsSurface } from "@/src/features/analytics"

const MARK_DARK = require("@/assets/images/Sin_dark.png")
const MARK_LIGHT = require("@/assets/images/Sin_light.png")

/** 마크 한 변. 스플래시보다 작게 — 이어받되 같은 장면을 반복하지는 않는다. */
const MARK_SIZE = 72
/** 한 번 숨 쉬는 시간(들이쉬고 내쉬는 각 구간). */
const BREATH_MS = 900
/** 이 시간이 지나도 안 끝나면 그때 문구를 올린다. */
const MESSAGE_DELAY_MS = 900

interface LoadingScreenProps {
  /** 무엇을 여는 동안인가. 이 화면은 부팅 경로마다 다른 뜻이라 호출부가 정한다. */
  surface: AnalyticsSurface
  message?: string
}

export function LoadingScreen({ surface, message }: LoadingScreenProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const scheme = useColorScheme()
  const reduced = useReducedMotion()
  const breath = useSharedValue(1)
  // `isLoading=true` 를 고정으로 넘긴다 — 이 화면이 떠 있는 동안은 언제나 로딩 중이고,
  // 훅은 "얼마나 지났는가" 만 판단한다.
  const showMessage = useLoadingVisible(true, {
    surface,
    delay: MESSAGE_DELAY_MS,
    minDuration: 0,
  })

  useEffect(() => {
    if (reduced) return
    breath.value = withRepeat(
      withSequence(
        withTiming(1.06, {
          duration: BREATH_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: BREATH_MS,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
    )
    return () => cancelAnimation(breath)
  }, [breath, reduced])

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }))

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? t("brand.opening")}
      style={[styles.root, { backgroundColor: colors.background.default }]}
    >
      <Animated.View style={markStyle}>
        <Image
          source={scheme === "dark" ? MARK_DARK : MARK_LIGHT}
          style={styles.mark}
          contentFit="contain"
          transition={0}
        />
      </Animated.View>

      {showMessage ? (
        <Animated.Text
          maxFontSizeMultiplier={FONT_SCALE.body}
          entering={reduced ? undefined : FadeIn.duration(240)}
          style={[styles.message, { color: colors.label.alternative }]}
        >
          {message ?? t("brand.opening")}
        </Animated.Text>
      ) : (
        // 문구가 붙었다 떨어졌다 하면 마크가 위아래로 흔들린다. 자리는 늘 잡아 둔다.
        <Text style={styles.messagePlaceholder} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  message: {
    ...typography.subtext.large,
    marginTop: 20,
    textAlign: "center",
  },
  // marginTop + 한 줄 높이. `message` 와 같은 세로 자리를 차지한다.
  messagePlaceholder: { marginTop: 20, height: 20 },
})
