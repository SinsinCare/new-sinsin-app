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
      void imageRef.current?.stopAnimating()
      return
    }

    void imageRef.current?.startAnimating()
    const timer = setTimeout(() => {
      void imageRef.current?.stopAnimating()
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

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.label.normal }]}>
          {t("onboarding.completionTitle")}
        </Text>
        {/* 시트의 완료 캐릭터. 글자만 있던 화면이라 축하가 문구 하나로만 남아 있었다. */}
        <Image
          source={require("../../../../assets/images/signup-complete-character.png")}
          style={styles.character}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
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
  title: {
    ...typography.display.medium,
    textAlign: "center",
  },
  character: { width: 208, height: 230, marginTop: spacing[24] },
})
