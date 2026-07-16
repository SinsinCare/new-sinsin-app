import { useEffect, useRef, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Image } from "expo-image"
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
          회원가입이{"\n"}완료되었습니다!
        </Text>
      </View>

      <V2BottomCTA primaryLabel="신신당부 시작하기" onPrimary={onStart} />
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
})
