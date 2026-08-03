import { useEffect, useRef, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"
import {
  spacing,
  typography,
  useV2Theme,
  V2BottomCTA,
} from "@/src/design-system-v2"
import { useReduceMotionEnabled } from "../hooks/useReduceMotionEnabled"
import {
  COMPLETION_PARTICLE_DURATION_MS,
  shouldPlayCompletionParticles,
} from "../data/onboardingPresentation"

type OnboardingCompletionContentProps = {
  onStart: () => void
}

/**
 * `startAnimating`/`stopAnimating` 의 rejection 을 삼킨다.
 *
 * 둘 다 Promise 를 돌려주는데, 네이티브 뷰가 이미 사라졌으면 거절한다:
 *
 *     Error: Calling the 'stopAnimating' function has failed
 *     → The 1st argument cannot be cast to type View<ImageView>
 *     → Unable to find the 'ImageView' view with tag '1506'
 *
 * 예전에는 `void` 로 버렸는데, `void` 는 **거절을 처리하지 않는다** — 그래서
 * 온보딩을 마치고 홈으로 넘어가는 순간(= 이 화면이 언마운트되는 순간) 타이머가
 * 이미 떠난 뷰를 붙잡아 unhandled rejection 이 났다. 개발 빌드에서는 빨간 배너로,
 * 릴리스에서는 조용히.
 *
 * 언마운트 경합은 `clearTimeout` 으로 다 막을 수 없다 — 정지 요청이 네이티브로
 * 건너간 뒤에 뷰가 사라지는 창은 여전히 남는다. 애초에 **이 실패는 무해하다**:
 * 정지시키려던 그림이 이미 없다는 뜻이라 화면에 아무 차이가 없다. 그러니 막으려
 * 애쓰는 대신 거절을 명시적으로 삼킨다.
 */
function ignoreDetachedView(result: Promise<void> | undefined): void {
  result?.catch(() => {})
}

export function OnboardingCompletionContent({
  onStart,
}: OnboardingCompletionContentProps) {
  const { t } = useTranslation("auth")
  const { colors } = useV2Theme()
  const prefersReducedMotion = useReduceMotionEnabled()
  const shouldPlay = shouldPlayCompletionParticles(prefersReducedMotion)
  const imageRef = useRef<Image | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!isLoaded || !shouldPlay) {
      ignoreDetachedView(imageRef.current?.stopAnimating())
      return
    }

    ignoreDetachedView(imageRef.current?.startAnimating())
    const timer = setTimeout(() => {
      ignoreDetachedView(imageRef.current?.stopAnimating())
    }, COMPLETION_PARTICLE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [isLoaded, shouldPlay])

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background.default }]}
    >
      <Image
        ref={imageRef}
        source={require("../../../../assets/videos/signup-completion-particles.gif")}
        style={styles.particles}
        contentFit="contain"
        autoplay={false}
        pointerEvents="none"
        accessibilityIgnoresInvertColors
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(false)}
      />

      {/* 위계: 그림(축하) → 제목(무슨 일이 끝났는지) → 보조문(그래서 뭘 해주는지) → CTA.
          캐릭터가 제목 위로 올라간 건 완료 화면의 시선 순서가 그림부터이기 때문이다.
          제목만 Bold 28, 보조문은 Regular 17 + 낮은 명도로 두 단 떨어뜨려 굵기·크기·색이
          같은 방향을 가리키게 했다. */}
      <View style={styles.content}>
        {/* 시트의 완료 캐릭터. 글자만 있던 화면이라 축하가 문구 하나로만 남아 있었다. */}
        <Image
          source={require("../../../../assets/images/signup-complete-character.png")}
          style={styles.character}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <Text
          style={[styles.title, { color: colors.label.normal }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {t("onboarding.completionTitle")}
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.label.neutral }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {t("onboarding.completionSubtitle")}
        </Text>
      </View>

      <V2BottomCTA
        primaryLabel={t("onboarding.startApp")}
        onPrimary={onStart}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  particles: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[20],
  },
  character: { width: 208, height: 230 },
  title: {
    ...typography.display.medium,
    textAlign: "center",
    marginTop: spacing[24],
  },
  subtitle: {
    ...typography.body.mediumWeak,
    textAlign: "center",
    marginTop: spacing[12],
  },
})
