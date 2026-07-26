import { useEffect, useRef, useState } from "react"
import { Image, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { Image as AnimatedImage } from "expo-image"
import { V2Button, typography, useV2Theme } from "@/src/design-system-v2"
import {
  COMPLETION_PARTICLE_DURATION_MS,
  shouldPlayCompletionParticles,
} from "@/src/features/onboarding/data/onboardingPresentation"
import { useReduceMotionEnabled } from "@/src/features/onboarding/hooks/useReduceMotionEnabled"
import { useAuthStore, useSignupStore } from "@/src/stores"

const signupSuccessCharacter = require("@/assets/images/signup-success-character.png")

function stopParticleAnimation(image: AnimatedImage | null) {
  if (!image) return
  void image.stopAnimating().catch(() => undefined)
}

export function SignupCompleteScreen() {
  const { colors } = useV2Theme()
  const prefersReducedMotion = useReduceMotionEnabled()
  const shouldPlayParticles =
    shouldPlayCompletionParticles(prefersReducedMotion)
  const particleRef = useRef<AnimatedImage | null>(null)
  const [particlesLoaded, setParticlesLoaded] = useState(false)
  const entryGate = useAuthStore((state) => state.entryGate)
  const setSignupInProgress = useSignupStore(
    (state) => state.setSignupInProgress,
  )
  const destination =
    entryGate === "ONBOARDING" ? "/onboarding" : "/(tabs)/home"

  const continueToApp = () => {
    setSignupInProgress(false)
    router.replace(destination)
  }

  useEffect(() => {
    if (!particlesLoaded) return
    if (!shouldPlayParticles) {
      stopParticleAnimation(particleRef.current)
      return
    }

    void particleRef.current?.startAnimating().catch(() => undefined)
    const timer = setTimeout(() => {
      stopParticleAnimation(particleRef.current)
    }, COMPLETION_PARTICLE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [particlesLoaded, shouldPlayParticles])

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <AnimatedImage
        ref={particleRef}
        source={require("@/assets/videos/signup-completion-particles.gif")}
        style={styles.particles}
        contentFit="contain"
        autoplay={false}
        pointerEvents="none"
        accessibilityIgnoresInvertColors
        onLoad={() => setParticlesLoaded(true)}
        onError={() => setParticlesLoaded(false)}
      />
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          typography.title.medium,
          { color: colors.label.normal },
        ]}
      >
        {"회원가입이\n완료되었습니다!"}
      </Text>
      <Image
        source={signupSuccessCharacter}
        accessibilityLabel="회원가입 완료 캐릭터"
        style={styles.character}
      />
      <View
        style={[styles.footer, { backgroundColor: colors.background.default }]}
      >
        <V2Button size="xl" color="brand" fullWidth onPress={continueToApp}>
          시작하기
        </V2Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  particles: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  title: {
    position: "absolute",
    top: 122,
    left: 0,
    right: 0,
    height: 60,
    textAlign: "center",
    lineHeight: 30,
  },
  character: {
    position: "absolute",
    top: 334,
    alignSelf: "center",
    width: 144,
    height: 144,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 112,
    paddingTop: 36,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
})
