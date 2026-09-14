/**
 * 후기 작성 — 홈 건강기록 6페이지와 **같은 시스템**으로 그린다(2026-09-12).
 *
 * 뼈대는 `RecordPageShell`(상위 이름은 내비게이션 바, 큰 제목·안내문·하단 고정 CTA·
 * 키보드 도킹), 별점은 `RecordRating`(별 다섯 개), 특징은 `RecordMultiChoices`, 본문은 같은 면의
 * `TextInput`, 오류·진행 문구는 `RecordFieldHint` 다. 치수·타이포는 `recordPageSpec`
 * 한 벌에서만 온다 — 예전 화면은 목업 -26/-27 의 별 글리프·오렌지 틴트 카드·자체 푸터를
 * 따로 들고 있어 홈과 다른 앱처럼 읽혔다.
 *
 * ## 비활성 버튼은 이유를 말해야 한다
 *
 * 비활성 CTA 는 `onPress` 가 아예 불리지 않으므로, 그대로 두면 사용자는 **무엇이
 * 모자란지 알 수 없다.** 그래서 본문 아래 힌트 칸에 "지금 막고 있는 요건"을 한 줄로
 * 띄운다(`reviewDraftDefects` 의 첫 항목). 규칙 자체는 `utils/reviewDraft.ts` 에 있다 —
 * 이 저장소의 jest 는 컴포넌트를 렌더할 수 없으므로 검증 로직이 JSX 안에 있으면
 * 영원히 테스트 밖이다.
 *
 * ## 사진은 "제출 시점에 전부 올리고, 하나라도 실패하면 등록하지 않는다"
 *
 * 커뮤니티 글쓰기(`FreePostEditor`)와 같은 규칙이다. 업로드 경로도 그쪽과 **같은
 * `imageUploadService`** 를 쓴다(`hooks/useReviewEditorLifecycle.ts`).
 *
 * 보내는 키는 **`imageObjectPaths`** 다. 서버 스키마(`sinsin-be-bun` 의
 * `src/domains/restaurant/schemas.ts::createReviewBody`)가 이 이름의 정본이고, 값은 서명
 * URL 이 아니라 `uploaded.objectPath` — 서명은 15분마다 회전하므로 URL 을 넣으면 만료된
 * 링크가 DB 에 굳는다. 이 이름이 틀리면 **아무도 안 터진다**(서버 TypeBox 는 non-strict).
 * 실제로 앱은 오랫동안 `imageUrls` 로 보내고 있었고 요청은 200, 후기는 저장, 사진만
 * 사라졌다. 그래서 본문 조립은 `utils/reviewDraft.ts::reviewSubmitBody` 한 곳에만 두고
 * `tests/restaurantReviewSubmitContract.test.ts` 가 서버 스키마 파일과 키를 대조한다.
 *
 * ## 되돌리지 말 것
 *
 * - 이 화면은 native-stack 모달이다. 안쪽 `<V2DialogHost />` 를 빼면 이탈 확인
 *   (`showConfirm`)이 모달 뒤에 떠서 보이지 않는다.
 * - 특징 칩의 순서를 선택 여부로 재배열하지 않는다. 누를 때마다 칩이 움직이면 다음 칩을
 *   조준할 수 없다. `REVIEW_KEYWORDS` 순서를 고정한다.
 * - 치수를 이 파일에 다시 적지 않는다. 사진 타일도 `FIELD`·`S` 에서 파생한다.
 */

import { useCallback, useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native"
import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import { V2DialogHost, V2Modal, V2Text } from "@/src/design-system-v2"
import { fontFamily } from "@/src/design-system-v2/tokens/typography"
import { useSurface } from "@/src/hooks/useSurface"

import { RecordPageShell } from "@/src/features/home/components/record/pages/RecordPageShell"
import { RecordMultiChoices } from "@/src/features/home/components/record/pages/RecordChoices"
import { RecordRating } from "@/src/features/home/components/record/pages/RecordRating"
import { RecordFieldHint } from "@/src/features/home/components/record/pages/RecordFieldHint"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import {
  FIELD,
  FORM,
  PAGE_X,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

import type { ReviewDto, ReviewKeyword } from "../types"
import { REVIEW_KEYWORDS } from "../data/filterCatalog"
import { useRestaurantReviews } from "../hooks/useRestaurantReviews"
import { useReviewEditorLifecycle } from "../hooks/useReviewEditorLifecycle"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import {
  REVIEW_CONTENT_MAX,
  REVIEW_MAX_PHOTOS,
  isReviewDraftReady,
  reviewDefectMessageKey,
  reviewDraftDefects,
} from "../utils/reviewDraft"
import { MediaPicker } from "../components/MediaPicker"

export interface ReviewWriteScreenProps {
  restaurantId: number
  /** 내비게이션 바 제목(상위 화면 이름 자리)에 그대로 들어간다. */
  restaurantName: string
  onClose: () => void
  /** 등록 성공. 라우트가 뒤로 가거나 후기 탭으로 돌려보낸다. */
  onSubmitted?: (review: ReviewDto) => void
  /**
   * `리뷰 작성 주의사항` 을 **전용 화면**으로 열 때만 준다. 저장소에 후기 가이드라인
   * 문서가 아직 없어서(`app/(settings)/legal-document.tsx` 는 약관·개인정보뿐이다)
   * 기본 동작은 이 화면 안의 모달이다 — 아래 `openGuidelines` 참고.
   */
  onOpenGuidelines?: () => void
  style?: ViewStyle
}

export function ReviewWriteScreen({
  restaurantId,
  restaurantName,
  onClose,
  onSubmitted,
  onOpenGuidelines,
  style,
}: ReviewWriteScreenProps) {
  const { t } = useTranslation("common")
  const s = useSurface()

  /**
   * 후기 목록 훅을 그대로 쓴다. 작성 화면에서 목록 GET 이 한 번 나가지만,
   * 후기 탭에서 들어오는 실제 동선에서는 같은 queryKey 라 캐시 히트다. 그보다
   * "등록 후 목록·평점분해·상세를 함께 무효화" 하는 규칙을 여기서 다시 쓰는 쪽이 위험하다 —
   * 한쪽만 털면 별점은 4.2 인데 리뷰 수는 그대로인 화면이 남는다.
   */
  const { submitReview } = useRestaurantReviews({ restaurantId })

  const [rating, setRating] = useState(0)
  const [keywords, setKeywords] = useState<readonly ReviewKeyword[]>([])
  const [content, setContent] = useState("")
  const [contentFocused, setContentFocused] = useState(false)
  const [photoUris, setPhotoUris] = useState<readonly string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const [guidelinesOpen, setGuidelinesOpen] = useState(false)

  /**
   * `리뷰 작성 주의사항` 링크의 행선지. 저장소에 후기 가이드라인 **문서 화면이 없다**
   * (`legal-document` route 는 약관·개인정보 두 장뿐이다). 없는 화면을 기다리며 링크를
   * 감추는 대신 같은 내용을 모달로 띄운다 — 나중에 진짜 문서가 생기면
   * `onOpenGuidelines` 를 넘기면 되고 이 폴백은 그대로 두면 된다.
   */
  const openGuidelines = useCallback(() => {
    if (onOpenGuidelines) {
      onOpenGuidelines()
      return
    }
    setGuidelinesOpen(true)
  }, [onOpenGuidelines])

  const draft = useMemo(
    () => ({ rating, content, keywords, photoUris }),
    [rating, content, keywords, photoUris],
  )
  const defects = useMemo(() => reviewDraftDefects(draft), [draft])
  const ready = isReviewDraftReady(draft)

  const { submit, requestClose, isSubmitting, uploadProgress } =
    useReviewEditorLifecycle({ draft, submitReview, onClose, onSubmitted })
  const blockingMessage = defects[0]
    ? t(dynamicKey(reviewDefectMessageKey(defects[0])), {
        max: REVIEW_CONTENT_MAX,
      })
    : null

  const toggleKeyword = useCallback((value: ReviewKeyword) => {
    setTouched(true)
    setKeywords((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )
  }, [])

  const removePhoto = useCallback((uri: string) => {
    setPhotoUris((current) => current.filter((item) => item !== uri))
  }, [])

  const keywordOptions = useMemo(
    () =>
      REVIEW_KEYWORDS.map((item) => ({
        value: item.value,
        label: t(dynamicKey(item.labelKey)),
      })),
    [t],
  )
  /*
    힌트 칸은 항상 그린다 — `RecordFieldHint` 가 두 줄을 예약해 두므로 문구가 생기고
    사라져도 아래 링크와 CTA 가 움직이지 않는다. 업로드 진행은 안내, 막는 요건은 오류다.
  */
  const statusMessage = uploadProgress ?? (touched ? blockingMessage : null)
  const statusIsError = !uploadProgress && Boolean(statusMessage)

  return (
    <View style={[styles.root, style]}>
      <RecordPageShell
        navigationTitle={restaurantName}
        title={t("restaurant.review.form.title")}
        intro={t("restaurant.review.form.intro")}
        onBack={() => void requestClose()}
        ctaLabel={t("restaurant.review.form.submit")}
        ctaDisabled={!ready}
        ctaLoading={isSubmitting}
        onCtaPress={() => void submit()}
      >
        <View style={styles.content}>
          {/* 별점 — 하나 */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("restaurant.review.form.ratingQuestion")}
            </V2Text>
            {/* 별 다섯 개 — 수치를 선택지 칸으로 펼치지 않는다(`RecordRating` 머리말). */}
            <RecordRating
              value={rating}
              disabled={isSubmitting}
              starLabel={(star) =>
                t("restaurant.review.form.ratingOption", { count: star })
              }
              onChange={(value) => {
                setTouched(true)
                setRating(value)
              }}
            />
          </View>

          {/* 특징 — 여러 개. `REVIEW_KEYWORDS` 순서 고정 */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("restaurant.review.form.keywordQuestion")}
            </V2Text>
            <V2Text style={styles.hint} color={s.text}>
              {t("restaurant.review.form.keywordHint")}
            </V2Text>
            <RecordMultiChoices
              options={keywordOptions}
              values={keywords}
              disabled={isSubmitting}
              onToggle={toggleKeyword}
            />
          </View>

          {/* 사진 — MediaPicker 그대로. 타일은 입력칸과 같은 높이·모서리 */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("restaurant.review.form.photoLabel")}
            </V2Text>
            <V2Text style={styles.hint} color={s.text}>
              {t("restaurant.review.form.photoLimit", {
                count: REVIEW_MAX_PHOTOS,
              })}
            </V2Text>
            <ScrollView
              horizontal
              bounces={false}
              overScrollMode="never"
              showsHorizontalScrollIndicator={false}
              style={styles.mediaScroll}
              contentContainerStyle={styles.mediaStrip}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("restaurant.review.form.mediaPick")}
                accessibilityHint={t("restaurant.review.form.photoCount", {
                  current: photoUris.length,
                  max: REVIEW_MAX_PHOTOS,
                })}
                disabled={isSubmitting}
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [
                  styles.mediaTile,
                  styles.mediaPickTile,
                  {
                    backgroundColor: pressed
                      ? s.surfacePressed
                      : s.surfaceSunken,
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={22} color={s.text} />
                <V2Text
                  style={styles.mediaPickLabel}
                  color={recordFieldLabel(s)}
                  textBreakStrategy="balanced"
                >
                  {t("restaurant.review.form.mediaPick")}
                </V2Text>
              </Pressable>

              {photoUris.map((uri, index) => (
                <View key={uri} style={styles.mediaTile}>
                  <Image
                    source={{ uri }}
                    style={styles.mediaImage}
                    contentFit="cover"
                    transition={120}
                  />
                  {/* 배지가 곧 '빼기' 버튼이다. 순번 원을 다시 누르는 것이 피커의
                      해제 동작과 같은 몸짓이라 규칙이 하나로 남는다. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      "restaurant.review.form.photoRemove",
                      { index: index + 1 },
                    )}
                    disabled={isSubmitting}
                    onPress={() => removePhoto(uri)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.orderBadge,
                      {
                        backgroundColor: pressed ? s.text : s.textStrong,
                      },
                    ]}
                  >
                    <V2Text style={styles.orderBadgeText} color={s.canvas}>
                      {index + 1}
                    </V2Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* 본문 — 신장 정보 페이지의 `otherField` 와 같은 면 */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("restaurant.review.form.contentQuestion")}
            </V2Text>
            <V2Text style={styles.hint} color={s.text}>
              {t("restaurant.review.form.contentHint")}
            </V2Text>
            <View
              style={[
                styles.field,
                {
                  backgroundColor: contentFocused ? s.canvas : s.surfaceSunken,
                  borderColor: statusIsError
                    ? s.danger
                    : contentFocused
                      ? s.brand
                      : s.surfaceSunken,
                },
              ]}
            >
              <TextInput
                multiline
                editable={!isSubmitting}
                value={content}
                onChangeText={(next) => {
                  setTouched(true)
                  setContent(next)
                }}
                onFocus={() => setContentFocused(true)}
                onBlur={() => setContentFocused(false)}
                placeholder={t("restaurant.review.form.placeholder")}
                placeholderTextColor={recordFieldLabel(s)}
                selectionColor={s.brand}
                maxLength={REVIEW_CONTENT_MAX}
                textAlignVertical="top"
                accessibilityLabel={t("restaurant.review.form.contentQuestion")}
                style={[styles.input, { color: s.textStrong }]}
              />
              <V2Text style={styles.counter} color={s.textMuted}>
                <V2Text
                  style={styles.counter}
                  color={content.length > 0 ? s.textStrong : s.textMuted}
                >
                  {content.length}
                </V2Text>
                {` / ${REVIEW_CONTENT_MAX}`}
              </V2Text>
            </View>
            <RecordFieldHint error={statusIsError}>
              {statusMessage ?? ""}
            </RecordFieldHint>

            {/* 조건부로 그리지 않는다 — 갈 곳은 위 `openGuidelines` 가 항상 마련한다. */}
            <Pressable
              accessibilityRole="link"
              disabled={isSubmitting}
              onPress={openGuidelines}
              hitSlop={8}
              style={({ pressed }) => [
                styles.guidelineWrap,
                pressed && styles.pressed,
              ]}
            >
              <V2Text style={styles.guideline} color={s.text}>
                {t("restaurant.review.form.guideline")}
              </V2Text>
            </Pressable>
          </View>
        </View>
      </RecordPageShell>

      {/* Native-stack modal needs its own dialog presenter. */}
      <V2DialogHost />

      <MediaPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialSelection={photoUris}
        maxSelection={REVIEW_MAX_PHOTOS}
        onConfirm={(uris) => {
          setPhotoUris(uris)
          setPickerOpen(false)
        }}
      />

      {/* 주의사항 모달. 단일 액션이라 `V2Modal` 의 Alert 모양(버튼 1개)이 그대로 맞는다. */}
      <V2Modal
        visible={guidelinesOpen}
        onRequestClose={() => setGuidelinesOpen(false)}
        title={t("restaurant.review.form.guideline")}
        description={t("restaurant.review.form.guidelineBody")}
        primaryLabel={t("action.confirm")}
        onPrimary={() => setGuidelinesOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: PAGE_X, gap: FORM.sectionGap },
  group: { gap: FORM.labelGap },
  label: FORM.label,
  hint: FORM.hint,
  /** 스크롤이 페이지 좌우 여백 밖까지 닿게 한다 — 마지막 타일이 가장자리에서 잘리지 않는다. */
  mediaScroll: { marginHorizontal: -PAGE_X },
  mediaStrip: { gap: S[2], paddingHorizontal: PAGE_X, paddingTop: S[1] },
  mediaTile: {
    width: FIELD.height,
    height: FIELD.height,
    borderRadius: FIELD.radius,
    overflow: "hidden",
  },
  mediaPickTile: {
    alignItems: "center",
    justifyContent: "center",
    gap: S[1],
    paddingHorizontal: S[2],
  },
  mediaPickLabel: { ...FORM.hint, textAlign: "center" },
  mediaImage: { width: "100%", height: "100%" },
  orderBadge: {
    position: "absolute",
    top: S[2],
    right: S[2],
    width: S[6],
    height: S[6],
    borderRadius: S[6] / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBadgeText: { ...FORM.hint, textAlign: "center" },
  field: {
    minHeight: FIELD.heroHeight + FIELD.height,
    borderRadius: FIELD.radius,
    borderWidth: 1,
    paddingHorizontal: FIELD.paddingX,
    paddingVertical: S[4],
    gap: S[2],
  },
  input: {
    ...FORM.body,
    fontFamily: fontFamily.regular,
    flex: 1,
    padding: 0,
    includeFontPadding: false,
  },
  counter: { ...FORM.hint, textAlign: "right" },
  guidelineWrap: { alignSelf: "flex-start", marginTop: S[1] },
  guideline: { ...FORM.hint, textDecorationLine: "underline" },
  pressed: { opacity: 0.6 },
})
