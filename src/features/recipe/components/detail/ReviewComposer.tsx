/**
 * 리뷰 쓰기. `PUT /recipes/{id}/reviews/mine` 은 **절대 지정**이라 처음 쓰기와 고치기가
 * 같은 화면·같은 호출이다(계약 §3.4, 멱등).
 *
 * 화면 문법은 가입 스텝과 같다 — **질문 하나, 답 하나**.
 *   1. 헤더에는 닫기만 둔다. 제목을 헤더에 작게 넣으면 질문이 장식이 되고, 화면에
 *      "제목 + 질문" 두 개의 위계가 생긴다. 질문은 본문 첫 줄에 크게 한 번만 쓴다.
 *   2. 별점을 고르기 전에는 본문 입력을 보여 주지 않는다. 필수(별점)와 선택(본문)이
 *      나란히 서 있으면 무엇부터 해야 하는지 사용자가 판단해야 한다. 고르면 그때
 *      본문이 내려오고 키보드가 따라 올라온다.
 *   3. 본문 입력은 상자를 두르지 않는다. 화면에 입력이 하나뿐이라 테두리로 영역을
 *      나눌 이유가 없다. 글자 수는 한계에 가까워질 때만 나타난다.
 *
 * 계약 §6.1 "등록 버튼이 비활성인데 이유가 없음" 은 **버튼 자신이** 말한다 —
 * 별점 전에는 버튼 글자가 "별점을 골라 주세요" 다. 버튼 위에 회색 안내문을 한 줄
 * 더 놓으면 눈이 두 번 멈추고, 정작 눌러야 할 것과 이유가 따로 논다.
 *
 * 입력이 있는 화면이라 바텀시트가 아니라 전체 화면 Modal + KeyboardAvoidingView 다
 * (기존 `VoteSheet` 와 같은 패턴). 시트로 두면 키보드가 본문을 덮는다.
 */
import { useEffect, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Text, XStack, YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import type { SurfacePalette } from "@/src/theme/surface"
import { LAYOUT, MOTION, TYPE } from "@/src/theme/surface"
import { REVIEW_BODY_MAX_LENGTH, type MyReview } from "../../types/recipeV2"

export interface ReviewComposerProps {
  visible: boolean
  onClose: () => void
  myReview: MyReview | null
  isSubmitting: boolean
  /** 실패했으면 true — 문구는 이 컴포넌트가 고른다. */
  hasError: boolean
  onSubmit: (rating: number, body: string | null) => void
}

const STARS = [1, 2, 3, 4, 5] as const
/** 별점 → 말. 키를 문자열로 조립하면 i18n 타입이 못 따라오므로 그대로 적는다. */
const RATING_WORD_KEYS = {
  1: "detail.reviews.ratingWords.1",
  2: "detail.reviews.ratingWords.2",
  3: "detail.reviews.ratingWords.3",
  4: "detail.reviews.ratingWords.4",
  5: "detail.reviews.ratingWords.5",
} as const
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }
/** 글자 수는 끝이 보일 때만 알려 준다. 그전에는 세는 것 자체가 참견이다. */
const COUNTER_VISIBLE_FROM = REVIEW_BODY_MAX_LENGTH - 200

export function ReviewComposer({
  visible,
  onClose,
  myReview,
  isSubmitting,
  hasError,
  onSubmit,
}: ReviewComposerProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const insets = useSafeAreaInsets()
  const [rating, setRating] = useState(myReview?.rating ?? 0)
  const [body, setBody] = useState(myReview?.body ?? "")
  const bodyRef = useRef<TextInput>(null)

  /**
   * **열리는 순간에만** 서버가 알고 있는 내 리뷰로 채운다.
   * `myReview` 가 바뀔 때마다 채우면(백그라운드 재조회로 캐시 객체가 새로 오면) 사용자가
   * 쓰던 글이 입력 중에 날아간다. 반대로 채우지 않으면 닫았다 다시 열 때 남은 초안이
   * "저장된 리뷰" 로 읽힌다. 그래서 여는 시점 한 번이다.
   */
  const openedRef = useRef(false)
  useEffect(() => {
    if (!visible) {
      openedRef.current = false
      return
    }
    if (openedRef.current) return
    openedRef.current = true
    setRating(myReview?.rating ?? 0)
    setBody(myReview?.body ?? "")
  }, [myReview, visible])

  const canSubmit = rating >= 1 && rating <= 5 && !isSubmitting
  /* 전체화면 Modal 은 **양쪽 OS 모두 상태바까지 덮는다.** iOS 만 10 을 주던 때는
     닫기 X 가 시계와 같은 높이에 깔려 눌리지 않았다(QA 2026-08-06). */
  const topPadding = Math.max(insets.top, 24) + 10

  /**
   * 별점을 **처음** 고른 순간에만 본문으로 커서를 넘긴다. 고칠 때마다 키보드가
   * 튀어 오르면 별점을 다시 만지는 것이 벌처럼 느껴진다.
   */
  const pickRating = (star: number) => {
    hapticSelection()
    const first = rating === 0
    setRating(star)
    if (first) {
      requestAnimationFrame(() => bodyRef.current?.focus())
    }
  }

  return (
    <AppModal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: surface.canvas }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <XStack
          alignItems="center"
          paddingHorizontal={LAYOUT.screenX}
          paddingTop={topPadding}
          paddingBottom={4}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="close" size={26} color={surface.textStrong} />
          </Pressable>
        </XStack>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          bounces={false}
          overScrollMode="never"
        >
          <Text
            {...TYPE.question}
            fontFamily="$body"
            fontWeight="700"
            color={surface.textStrong}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.reviews.composerTitle")}
          </Text>

          <YStack marginTop={LAYOUT.questionToField} gap={10}>
            <XStack gap={4} marginLeft={-6}>
              {STARS.map((star) => (
                <Star
                  key={star}
                  star={star}
                  filled={rating >= star}
                  surface={surface}
                  label={t("detail.reviews.starAccessibility", { star })}
                  onPress={() => pickRating(star)}
                />
              ))}
            </XStack>

            {/* 고른 값을 말로 되돌려 준다. 빈 줄을 자리로 남겨 별이 흔들리지 않는다. */}
            <View style={styles.ratingWordSlot}>
              {rating > 0 && (
                <Animated.View key={rating} entering={FadeIn.duration(160)}>
                  <Text
                    {...TYPE.value}
                    fontFamily="$body"
                    fontWeight="600"
                    color={surface.brand}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {t(RATING_WORD_KEYS[rating as 1 | 2 | 3 | 4 | 5])}
                  </Text>
                </Animated.View>
              )}
            </View>
          </YStack>

          {/* 별점을 고르기 전에는 본문이 없다 — 지금 할 일은 하나뿐이다. */}
          {rating > 0 && (
            <Animated.View
              entering={FadeInDown.duration(MOTION.duration.base)
                .springify()
                .reduceMotion(ReduceMotion.System)}
              style={styles.bodyBlock}
            >
              <TextInput
                ref={bodyRef}
                value={body}
                onChangeText={setBody}
                placeholder={t("detail.reviews.bodyPlaceholder")}
                placeholderTextColor={surface.placeholder}
                maxLength={REVIEW_BODY_MAX_LENGTH}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                style={[styles.bodyInput, { color: surface.textStrong }]}
              />
              {body.length >= COUNTER_VISIBLE_FROM && (
                <Text
                  {...TYPE.caption}
                  fontFamily="$body"
                  color={surface.textWeak}
                  alignSelf="flex-end"
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("detail.reviews.bodyCounter", {
                    current: body.length,
                    max: REVIEW_BODY_MAX_LENGTH,
                  })}
                </Text>
              )}
            </Animated.View>
          )}
        </ScrollView>

        <YStack
          paddingHorizontal={LAYOUT.screenX}
          paddingBottom={Math.max(insets.bottom, 16)}
          gap={10}
        >
          {hasError && (
            <Text
              {...TYPE.caption}
              fontFamily="$body"
              color={surface.danger}
              textAlign="center"
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {t("detail.reviews.submitError")}
            </Text>
          )}
          <Pressable
            onPress={() =>
              onSubmit(rating, body.trim().length > 0 ? body.trim() : null)
            }
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={
              canSubmit
                ? t("detail.reviews.submit")
                : t("detail.reviews.submitDisabledReason")
            }
            accessibilityState={{ disabled: !canSubmit }}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <YStack
              height={LAYOUT.cta.height}
              borderRadius={LAYOUT.cta.radius}
              alignItems="center"
              justifyContent="center"
              backgroundColor={canSubmit ? surface.brand : surface.ctaOffBg}
            >
              <Text
                {...TYPE.cta}
                fontFamily="$body"
                fontWeight="600"
                color={canSubmit ? surface.onBrand : surface.ctaOffText}
                lineBreakStrategyIOS="hangul-word"
              >
                {isSubmitting
                  ? t("detail.reviews.submitting")
                  : /* 비활성 이유를 버튼 자신이 말한다(§6.1). */
                    canSubmit
                    ? t("detail.reviews.submit")
                    : t("detail.reviews.submitDisabledReason")}
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </KeyboardAvoidingView>
    </AppModal>
  )
}

/**
 * 별 하나. 채워지는 순간 한 번 튄다 — 점수가 "찍혔다"는 것을 눈보다 몸이 먼저 안다.
 * 빈 별은 보더색이라 거의 보이지 않게 두고, 채운 별만 브랜드색을 갖는다.
 */
function Star({
  star,
  filled,
  surface,
  label,
  onPress,
}: {
  star: number
  filled: boolean
  surface: SurfacePalette
  label: string
  onPress: () => void
}) {
  const scale = useSharedValue(1)
  const wasFilled = useRef(filled)

  useEffect(() => {
    if (filled && !wasFilled.current) {
      scale.value = withSpring(1.22, { ...SPRING, stiffness: 320 }, () => {
        scale.value = withSpring(1, SPRING)
      })
    }
    wasFilled.current = filled
  }, [filled, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: filled }}
      hitSlop={8}
      style={styles.starHit}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={filled ? "star" : "star-outline"}
          size={40}
          color={filled ? surface.brand : surface.border}
        />
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 12,
    paddingBottom: 24,
  },
  starHit: { padding: 6 },
  ratingWordSlot: { height: 22, justifyContent: "center" },
  bodyBlock: { marginTop: 28 },
  bodyInput: {
    minHeight: 96,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: -0.34,
    fontFamily: "Pretendard-Regular",
    padding: 0,
  },
})
