import { ReactNode } from "react"
import { Platform, Pressable } from "react-native"
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated"
import { YStack, XStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardAwareView } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import { useAuthColors, AUTH_RADIUS } from "../hooks/useAuthColors"

interface SignupStepLayoutProps {
  /** 스텝 식별자. 바뀌면 전환 애니메이션이 재생된다. */
  stepKey: string
  /** 2줄로 끊어 쓰는 질문. 토스식으로 한 화면에 하나만 묻는다. */
  title: string
  subtitle?: string
  /** 0~1. 진행바. 생략하면 안 그린다. */
  progress?: number
  onBack?: () => void
  ctaLabel?: string
  ctaDisabled?: boolean
  ctaLoading?: boolean
  onCtaPress: () => void
  children: ReactNode
}

/**
 * 회원가입 스텝 공통 셸.
 *
 * 한 화면에 질문 하나만 둔다. 예전에는 이름·생년월일·성별·전화번호·유입경로를
 * 한 폼에 몰아넣어 스크롤해야 CTA 가 보였고, 어느 필드가 문제인지도 흐렸다.
 *
 * 전환은 오른쪽에서 밀려 들어오고 왼쪽으로 빠진다 — 진행 방향이 눈에 보여야
 * 지금 어디쯤인지 감이 온다. reanimated 라 UI 스레드에서 돈다.
 */
export function SignupStepLayout({
  stepKey,
  title,
  subtitle,
  progress,
  onBack,
  ctaLabel = "다음",
  ctaDisabled,
  ctaLoading,
  onCtaPress,
  children,
}: SignupStepLayoutProps) {
  const insets = useSafeAreaInsets()
  const colors = useAuthColors()

  return (
    <YStack flex={1} backgroundColor={colors.bg} paddingTop={insets.top}>
      <XStack height={56} alignItems="center" paddingHorizontal={12}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        )}
      </XStack>

      {progress !== undefined && (
        <YStack
          height={3}
          backgroundColor={colors.border}
          marginHorizontal={20}
          borderRadius={999}
          overflow="hidden"
        >
          <Animated.View
            key={`progress-${stepKey}`}
            entering={FadeIn.duration(220)}
            style={{
              height: 3,
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: tokens.color.primary.val,
              borderRadius: 999,
            }}
          />
        </YStack>
      )}

      <KeyboardAwareView style={{ flex: 1 }}>
        <Animated.View
          key={stepKey}
          entering={SlideInRight.duration(260)}
          exiting={SlideOutLeft.duration(200)}
          style={{ flex: 1 }}
        >
          <YStack flex={1} paddingHorizontal={20} paddingTop={20} gap={28}>
            <YStack gap={6}>
              <Text
                color={colors.text}
                fontSize={22}
                fontWeight="700"
                lineHeight={31}
                letterSpacing={-0.4}
              >
                {title}
              </Text>
              {subtitle && (
                <Text color={colors.textSub} fontSize={14} lineHeight={20}>
                  {subtitle}
                </Text>
              )}
            </YStack>

            {children}
          </YStack>
        </Animated.View>

        <YStack
          paddingHorizontal={20}
          paddingBottom={Platform.OS === "ios" ? insets.bottom + 12 : 16}
          paddingTop={8}
        >
          <Pressable onPress={onCtaPress} disabled={ctaDisabled || ctaLoading}>
            {({ pressed }) => (
              <YStack
                height={54}
                borderRadius={AUTH_RADIUS}
                alignItems="center"
                justifyContent="center"
                backgroundColor={
                  ctaDisabled ? colors.disabledBtn : tokens.color.primary.val
                }
                opacity={pressed && !ctaDisabled ? 0.85 : 1}
              >
                <Text
                  color={ctaDisabled ? colors.textSub : "#FFFFFF"}
                  fontSize={16}
                  fontWeight="600"
                  letterSpacing={-0.3}
                >
                  {ctaLoading ? "처리 중..." : ctaLabel}
                </Text>
              </YStack>
            )}
          </Pressable>
        </YStack>
      </KeyboardAwareView>
    </YStack>
  )
}

/** 스텝 안에서 쓰는 라벨 + 입력 슬롯. 오류일 때 라벨이 프라이머리로 바뀐다. */
export function StepField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  const colors = useAuthColors()
  return (
    <YStack gap={8}>
      <Text
        fontSize={13}
        fontWeight="600"
        letterSpacing={-0.26}
        color={error ? tokens.color.primary.val : colors.textSub}
      >
        {label}
      </Text>
      {children}
      {error ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut}>
          <Text fontSize={12} color={tokens.color.primary.val} lineHeight={16}>
            {error}
          </Text>
        </Animated.View>
      ) : null}
    </YStack>
  )
}
