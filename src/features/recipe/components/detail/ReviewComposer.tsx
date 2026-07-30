/**
 * 리뷰 쓰기. `PUT /recipes/{id}/reviews/mine` 은 **절대 지정**이라 처음 쓰기와 고치기가
 * 같은 화면·같은 호출이다(계약 §3.4, 멱등).
 *
 * 계약 §6.1 "등록 버튼이 비활성인데 이유가 없음" 을 고친다 — 버튼 **바로 위**에
 * 무엇이 남았는지 적는다("별점을 골라 주세요"). 별점 없이 본문만 쓰는 것은 계약이
 * 허용하지 않으므로(별점 1~5 필수) 그 이유를 숨기지 않고 그대로 말한다.
 *
 * 입력이 있는 화면이라 바텀시트가 아니라 전체 화면 Modal + KeyboardAvoidingView 다
 * (기존 `VoteSheet` 와 같은 패턴). 시트로 두면 키보드가 본문을 덮는다.
 */
import { useEffect, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Text, XStack, YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
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
  const topPadding =
    Platform.OS === "android" ? Math.max(insets.top, 24) + 10 : 10

  return (
    <Modal
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
          justifyContent="space-between"
          paddingHorizontal={LAYOUT.screenX}
          paddingTop={topPadding}
          paddingBottom={12}
          gap={12}
        >
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons name="close" size={24} color={surface.textStrong} />
          </Pressable>
          <Text
            {...TYPE.sheetTitle}
            fontFamily="$body"
            fontWeight="700"
            color={surface.textStrong}
          >
            {t("detail.reviews.composerTitle")}
          </Text>
          <View style={styles.headerSpacer} />
        </XStack>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          overScrollMode="never"
        >
          <XStack gap={8} justifyContent="center" paddingVertical={8}>
            {STARS.map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                accessibilityRole="button"
                accessibilityLabel={t("detail.reviews.starAccessibility", {
                  star,
                })}
                accessibilityState={{ selected: rating >= star }}
                hitSlop={6}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Ionicons
                  name={rating >= star ? "star" : "star-outline"}
                  size={36}
                  color={rating >= star ? surface.brand : surface.border}
                />
              </Pressable>
            ))}
          </XStack>

          <YStack
            borderRadius={LAYOUT.field.radius}
            borderWidth={1}
            borderColor={surface.border}
            backgroundColor={surface.card}
            padding={14}
            gap={8}
          >
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t("detail.reviews.bodyPlaceholder")}
              placeholderTextColor={surface.placeholder}
              maxLength={REVIEW_BODY_MAX_LENGTH}
              multiline
              textAlignVertical="top"
              style={[styles.bodyInput, { color: surface.textStrong }]}
            />
            <Text
              {...TYPE.caption}
              fontFamily="$body"
              color={surface.textWeak}
              alignSelf="flex-end"
            >
              {t("detail.reviews.bodyCounter", {
                current: body.length,
                max: REVIEW_BODY_MAX_LENGTH,
              })}
            </Text>
          </YStack>

          {hasError && (
            <Text {...TYPE.caption} fontFamily="$body" color={surface.danger}>
              {t("detail.reviews.submitError")}
            </Text>
          )}
        </ScrollView>

        <YStack
          paddingHorizontal={LAYOUT.screenX}
          paddingBottom={Math.max(insets.bottom, 16)}
          gap={8}
        >
          {/* 비활성 이유를 버튼 바로 위에 적는다(§6.1). */}
          {!canSubmit && !isSubmitting && (
            <Text
              {...TYPE.caption}
              fontFamily="$body"
              color={surface.textMuted}
              textAlign="center"
            >
              {t("detail.reviews.submitDisabledReason")}
            </Text>
          )}
          <Pressable
            onPress={() =>
              onSubmit(rating, body.trim().length > 0 ? body.trim() : null)
            }
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={t("detail.reviews.submit")}
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
              >
                {isSubmitting
                  ? t("detail.reviews.submitting")
                  : t("detail.reviews.submit")}
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerSpacer: { width: 24 },
  content: {
    paddingHorizontal: LAYOUT.screenX,
    paddingBottom: 24,
    gap: 16,
  },
  bodyInput: {
    minHeight: 120,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Pretendard-Regular",
    padding: 0,
  },
})
