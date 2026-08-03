import { ReactNode, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { hapticStepAdvance } from "@/src/lib/haptics"
import { V2DotLoader } from "@/src/design-system-v2"
import { AuthKeyboardFooter } from "./AuthKeyboardFooter"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_MOTION, AUTH_TYPE } from "../data/authSurface"
import type { SignupStepDirection } from "../hooks/useSignupSteps"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...AUTH_MOTION.spring, reduceMotion: ReduceMotion.System }
const TIMING = {
  duration: AUTH_MOTION.duration.base,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}

/**
 * 스텝 전환. 앞으로 갈 때 오른쪽에서 들어오고 뒤로 갈 때 왼쪽에서 들어온다.
 * 밀림은 24pt 뿐이고 나머지는 투명도가 맡는다 — 질문 한 줄짜리 화면에서 크게 밀면
 * 글자가 날아가는 것처럼 보인다. 시스템 "동작 줄이기"는 reanimated 가 존중한다.
 */
function makeEntering(direction: SignupStepDirection) {
  return (_values: EntryAnimationsValues) => {
    "worklet"
    const from =
      direction === "forward" ? AUTH_MOTION.shift : -AUTH_MOTION.shift
    return {
      initialValues: { opacity: 0, transform: [{ translateX: from }] },
      animations: {
        opacity: withTiming(1, TIMING),
        transform: [{ translateX: withSpring(0, SPRING) }],
      },
    }
  }
}

function makeExiting(direction: SignupStepDirection) {
  return (_values: ExitAnimationsValues) => {
    "worklet"
    const to = direction === "forward" ? -AUTH_MOTION.shift : AUTH_MOTION.shift
    return {
      initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
      animations: {
        opacity: withTiming(0, {
          duration: AUTH_MOTION.duration.fast,
          easing: EASE,
          reduceMotion: ReduceMotion.System,
        }),
        transform: [
          {
            translateX: withTiming(to, {
              duration: AUTH_MOTION.duration.fast,
              easing: EASE,
              reduceMotion: ReduceMotion.System,
            }),
          },
        ],
      },
    }
  }
}

function StepProgress({ progress }: { progress: number }) {
  const surface = useAuthSurface()
  const [trackWidth, setTrackWidth] = useState(0)
  const fill = useSharedValue(progress)

  useEffect(() => {
    fill.value = withSpring(progress, SPRING)
  }, [fill, progress])

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(fill.value, 0.001) }],
  }))

  return (
    <View
      // 화면 폭을 꽉 채운다. 좌우를 20pt 씩 띄우면 진행바가 카드처럼 보이고
      // 헤더와 본문 사이의 경계 역할을 못 한다.
      style={[styles.progressTrack, { backgroundColor: surface.hairline }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {/* 폭 대신 scaleX 를 움직인다 — 매 프레임 레이아웃을 다시 돌리지 않으려고. */}
      <Animated.View
        style={[
          styles.progressFill,
          { width: trackWidth, backgroundColor: surface.brand },
          fillStyle,
        ]}
      />
    </View>
  )
}

interface SignupStepLayoutProps {
  /** 스텝 식별자. 바뀌면 전환 애니메이션이 재생된다. */
  stepKey: string
  direction?: SignupStepDirection
  /** 두 줄로 끊어 쓰는 질문. 한 화면에 하나만 묻는다. */
  title: string
  subtitle?: string
  /** 0~1. 진행바. 생략하면 안 그린다. */
  progress?: number
  onBack?: () => void
  ctaLabel?: string
  ctaDisabled?: boolean
  ctaLoading?: boolean
  onCtaPress: () => void
  /** CTA 위에 붙는 서버 오류 문구. */
  errorMessage?: string
  children: ReactNode
}

export function SignupStepLayout({
  stepKey,
  direction = "forward",
  title,
  subtitle,
  progress,
  onBack,
  ctaLabel,
  ctaDisabled,
  ctaLoading,
  onCtaPress,
  errorMessage,
  children,
}: SignupStepLayoutProps) {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation("auth")
  const surface = useAuthSurface()
  const isCtaActive = !ctaDisabled && !ctaLoading
  const activeness = useSharedValue(isCtaActive ? 1 : 0)
  const press = useSharedValue(0)

  useEffect(() => {
    activeness.value = withTiming(isCtaActive ? 1 : 0, TIMING)
  }, [activeness, isCtaActive])

  const ctaStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeness.value,
      [0, 1],
      [surface.ctaOffBg, surface.brand],
    ),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }))

  const ctaTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeness.value,
      [0, 1],
      [surface.ctaOffText, surface.onBrand],
    ),
  }))

  const handleCtaPress = () => {
    if (!isCtaActive) return
    hapticStepAdvance()
    onCtaPress()
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.previousStep")}
            onPress={onBack}
            hitSlop={12}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={surface.textStrong}
            />
          </Pressable>
        )}
      </View>

      {progress !== undefined && <StepProgress progress={progress} />}

      <View style={styles.stage}>
        <Animated.View
          key={stepKey}
          entering={makeEntering(direction)}
          exiting={makeExiting(direction)}
          style={styles.step}
        >
          <Text style={[styles.question, { color: surface.textStrong }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: surface.textWeak }]}>
              {subtitle}
            </Text>
          ) : null}

          <View style={styles.field}>{children}</View>
        </Animated.View>
      </View>

      <AuthKeyboardFooter
        horizontalPadding={AUTH_LAYOUT.screenX}
        backgroundColor={surface.canvas}
      >
        {errorMessage ? (
          <Animated.View
            entering={FadeIn.duration(AUTH_MOTION.duration.fast)}
            exiting={FadeOut}
          >
            <Text style={[styles.footerError, { color: surface.brand }]}>
              {errorMessage}
            </Text>
          </Animated.View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !isCtaActive }}
          onPress={handleCtaPress}
          onPressIn={() => {
            press.value = withTiming(1, { duration: 90, easing: EASE })
          }}
          onPressOut={() => {
            press.value = withSpring(0, SPRING)
          }}
          disabled={!isCtaActive}
        >
          <Animated.View style={[styles.cta, ctaStyle]}>
            {ctaLoading && <V2DotLoader size="s" color={surface.ctaOffText} />}
            <Animated.Text style={[styles.ctaLabel, ctaTextStyle]}>
              {ctaLoading
                ? t("common.checking")
                : (ctaLabel ?? t("common.next"))}
            </Animated.Text>
          </Animated.View>
        </Pressable>
      </AuthKeyboardFooter>
    </View>
  )
}

/**
 * 입력 아래 한 줄. 오류면 브랜드색, 아니면 도움말 톤.
 * 라벨은 두지 않는다 — 질문이 이미 라벨이라 같은 말을 두 번 쓰게 된다.
 *
 * 줄바꿈 규칙은 토스트·다이얼로그와 같은 것을 쓴다(`shared/components/Toast.tsx`).
 * 이 자리에 들어오는 오류 문구가 "원인 + 해결" 두 문장이라 대부분 두 줄을 넘기는데,
 * 기본 규칙은 어절 한가운데를 끊어 "인증번호를 보낼 수 없어 / 요" 처럼 읽힌다.
 */
export function StepHelperText({
  message,
  tone = "hint",
}: {
  message: string
  tone?: "hint" | "error"
}) {
  const surface = useAuthSurface()
  return (
    <Animated.View
      entering={FadeIn.duration(AUTH_MOTION.duration.fast)}
      exiting={FadeOut.duration(AUTH_MOTION.duration.fast)}
    >
      <Text
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
        style={[
          styles.helper,
          { color: tone === "error" ? surface.brand : surface.textWeak },
        ]}
      >
        {message}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: AUTH_LAYOUT.headerHeight,
    justifyContent: "center",
    paddingHorizontal: AUTH_LAYOUT.screenX,
  },
  // 아이콘 상자를 screenX 에 맞추고 터치 영역은 44 로 남긴다. LAYOUT.iconButton 머리말 참고.
  backButton: {
    padding: AUTH_LAYOUT.iconButton.pad,
    marginLeft: -AUTH_LAYOUT.iconButton.pad,
    alignSelf: "flex-start",
  },
  progressTrack: {
    height: AUTH_LAYOUT.progressHeight,
    overflow: "hidden",
  },
  progressFill: {
    height: AUTH_LAYOUT.progressHeight,
    transformOrigin: "left",
  },
  // 전환 중에는 나가는 스텝과 들어오는 스텝이 잠깐 함께 있다. 겹쳐 쌓아야
  // 둘이 세로로 밀며 화면이 출렁이지 않는다.
  stage: { flex: 1 },
  step: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: AUTH_LAYOUT.screenX,
    paddingTop: AUTH_LAYOUT.questionTop,
  },
  question: {
    ...AUTH_TYPE.question,
    fontWeight: "700",
  },
  subtitle: {
    ...AUTH_TYPE.subtitle,
    marginTop: 8,
  },
  field: { marginTop: AUTH_LAYOUT.questionToField },
  helper: {
    ...AUTH_TYPE.helper,
    marginTop: 10,
  },
  footerError: {
    ...AUTH_TYPE.helper,
    textAlign: "center",
    marginBottom: 10,
  },
  cta: {
    height: AUTH_LAYOUT.ctaHeight,
    borderRadius: AUTH_LAYOUT.radius.cta,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaLabel: {
    ...AUTH_TYPE.cta,
    fontWeight: "600",
  },
})
