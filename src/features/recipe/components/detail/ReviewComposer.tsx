/**
 * 리뷰 작성 — 홈 건강기록 키트로 그린다(2026-09-12 통일).
 *
 * 전체 화면 `AppModal` 안에 `RecordPageShell` 을 세운다: 상단 바에는 레시피 이름
 * (`navigationTitle`), 큰 제목은 "이 레시피 어땠어요?", 안내문 한 줄, 하단 고정 CTA
 * 는 키보드 위로 도킹된다(예전 `KeyboardAvoidingView` + 자체 버튼은 걷어냈다).
 *
 * 별점은 `RecordRating` — 별 다섯 개를 탭하고 점수의 말이 아래 따라온다(2026-09-12,
 * 수치를 선택지 칸으로 나열하던 `RecordChoices` 는 걷어냈다). 본문은 키트 텍스트 면(`FIELD.radius` · `s.surfaceSunken` · 포커스 `s.brand`).
 *
 * 저장 규칙은 그대로다: 별점(1~5)이 있어야 보낼 수 있고, 본문은 선택(빈 문자열은
 * `null`), 제출은 상위가 `PUT /recipes/{id}/reviews/mine` 으로 보낸다(`useMyReview`).
 * 처음 별점을 고르면 본문 칸으로 포커스를 옮긴다 — 다음 행동이 그 칸이라서다.
 */

import { useEffect, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { V2Text } from "@/src/design-system-v2"
import { fontFamily } from "@/src/design-system-v2/tokens/typography"
import { AppModal } from "@/src/shared/components/AppModal"
import { useSurface } from "@/src/hooks/useSurface"
import { RecordPageShell } from "@/src/features/home/components/record/pages/RecordPageShell"
import { RecordRating } from "@/src/features/home/components/record/pages/RecordRating"
import { RecordFieldHint } from "@/src/features/home/components/record/pages/RecordFieldHint"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import {
  FIELD,
  FORM,
  PAGE_X,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"
import { REVIEW_BODY_MAX_LENGTH, type MyReview } from "../../types/recipeV2"

export interface ReviewComposerProps {
  visible: boolean
  onClose: () => void
  /** 상단 바에 서는 레시피 이름 — 무엇에 대한 리뷰인지 화면이 말한다. */
  recipeName: string
  recipeImageUrl: string | null
  myReview: MyReview | null
  isSubmitting: boolean
  /** 직전 제출이 실패했다 — 버튼 위에 이유를 적는다. */
  hasError: boolean
  onSubmit: (rating: number, body: string | null) => void
}

const RATING_WORD_KEYS = {
  1: "detail.reviews.ratingWords.1",
  2: "detail.reviews.ratingWords.2",
  3: "detail.reviews.ratingWords.3",
  4: "detail.reviews.ratingWords.4",
  5: "detail.reviews.ratingWords.5",
} as const

/** 카운터는 상한 근처에서만 — 평소엔 아무 일도 안 하는 숫자를 띄우지 않는다. */
const COUNTER_VISIBLE_FROM = REVIEW_BODY_MAX_LENGTH - 200

export function ReviewComposer({
  visible,
  onClose,
  recipeName,
  myReview,
  isSubmitting,
  hasError,
  onSubmit,
}: ReviewComposerProps) {
  const { t } = useTranslation("recipe")
  const s = useSurface()
  const [rating, setRating] = useState(myReview?.rating ?? 0)
  const [body, setBody] = useState(myReview?.body ?? "")
  const [bodyFocused, setBodyFocused] = useState(false)
  const bodyRef = useRef<TextInput>(null)

  /*
    열릴 때 한 번만 내 리뷰로 초기화한다. `myReview` 가 바뀔 때마다 덮어쓰면
    제출 직후 서버 응답이 도착하는 순간 쓰던 글이 되돌아간다.
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

  const pickRating = (star: number) => {
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
      <RecordPageShell
        navigationTitle={recipeName}
        title={t("detail.reviews.composerTitle")}
        intro={t("detail.reviews.composerIntro")}
        onBack={onClose}
        ctaLabel={t("detail.reviews.submit")}
        ctaLoading={isSubmitting}
        ctaDisabled={!canSubmit}
        onCtaPress={() =>
          onSubmit(rating, body.trim().length > 0 ? body.trim() : null)
        }
      >
        <View style={styles.content}>
          {/* 별점 — 필수 */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("detail.reviews.title")}
              <V2Text color={s.brand}> *</V2Text>
            </V2Text>
            {/* 별 다섯 개 + 점수의 말 — 수치를 선택지 칸으로 펼치지 않는다(`RecordRating` 머리말). */}
            <RecordRating
              value={rating}
              onChange={pickRating}
              disabled={isSubmitting}
              words={Object.fromEntries(
                Object.entries(RATING_WORD_KEYS).map(([star, key]) => [
                  Number(star),
                  t(key),
                ]),
              )}
              starLabel={(star) =>
                t("detail.reviews.starAccessibility", { star })
              }
            />
            {rating === 0 ? (
              <RecordFieldHint>
                {t("detail.reviews.submitDisabledReason")}
              </RecordFieldHint>
            ) : null}
          </View>

          {/* 본문 — 선택 */}
          <View style={styles.group}>
            <View style={styles.labelRow}>
              <V2Text style={styles.label} color={s.textStrong}>
                {t("detail.reviews.bodyFieldLabel")}
              </V2Text>
              <V2Text style={styles.hint} color={s.text}>
                {t("detail.reviews.bodyLabel")}
              </V2Text>
            </View>
            <View
              style={[
                styles.field,
                {
                  backgroundColor: bodyFocused ? s.canvas : s.surfaceSunken,
                  borderColor: bodyFocused ? s.brand : s.surfaceSunken,
                },
              ]}
            >
              <TextInput
                ref={bodyRef}
                multiline
                value={body}
                onChangeText={setBody}
                onFocus={() => setBodyFocused(true)}
                onBlur={() => setBodyFocused(false)}
                placeholder={t("detail.reviews.bodyPlaceholder")}
                placeholderTextColor={recordFieldLabel(s)}
                selectionColor={s.brand}
                maxLength={REVIEW_BODY_MAX_LENGTH}
                textAlignVertical="top"
                accessibilityLabel={t("detail.reviews.bodyFieldLabel")}
                style={[styles.input, { color: s.textStrong }]}
              />
            </View>
            {body.length >= COUNTER_VISIBLE_FROM ? (
              <V2Text style={styles.counter} color={recordFieldLabel(s)}>
                {t("detail.reviews.bodyCounter", {
                  current: body.length,
                  max: REVIEW_BODY_MAX_LENGTH,
                })}
              </V2Text>
            ) : null}
          </View>

          {hasError ? (
            <RecordFieldHint error>
              {t("detail.reviews.submitError")}
            </RecordFieldHint>
          ) : null}
        </View>
      </RecordPageShell>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_X, gap: FORM.sectionGap },
  group: { gap: FORM.labelGap },
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: S[2] },
  label: FORM.label,
  hint: FORM.hint,
  counter: { ...FORM.hint, textAlign: "right" },
  field: {
    minHeight: FIELD.heroHeight,
    borderRadius: FIELD.radius,
    borderWidth: 1,
    paddingHorizontal: FIELD.paddingX,
    paddingVertical: S[4],
  },
  input: {
    ...FORM.body,
    fontFamily: fontFamily.regular,
    flex: 1,
    padding: 0,
    includeFontPadding: false,
  },
})
