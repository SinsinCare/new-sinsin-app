/**
 * 후기 작성 (목업 -26 / -27).
 *
 * ## 비활성 버튼은 이유를 말해야 한다
 *
 * 목업의 `등록` 은 비활성 상태로만 그려져 있다. 그런데 비활성 `Pressable` 은 `onPress` 가
 * 아예 불리지 않으므로, 그대로 두면 사용자는 **무엇이 모자란지 알 수 없다.** 그래서
 * 카운터 아래에 "지금 막고 있는 요건"을 한 줄로 띄우고(`reviewDraftDefects` 의 첫 항목),
 * 같은 문구를 버튼의 `accessibilityHint` 로도 준다. 규칙 자체는 `utils/reviewDraft.ts` 에
 * 있다 — 이 저장소의 jest 는 컴포넌트를 렌더할 수 없으므로 검증 로직이 JSX 안에 있으면
 * 영원히 테스트 밖이다.
 *
 * ## 사진은 "제출 시점에 전부 올리고, 하나라도 실패하면 등록하지 않는다"
 *
 * 커뮤니티 글쓰기(`FreePostEditor`)와 같은 규칙이다. 사진이 조용히 빠진 후기가 올라가는
 * 것보다 실패를 알리고 다시 시도하게 하는 쪽이 낫다. 업로드 경로도 그쪽과 **같은
 * `imageUploadService`** 를 쓴다 — 두 번째 업로드 메커니즘을 만들지 않는다.
 *
 * 보내는 키는 **`imageObjectPaths`** 다. 서버 스키마(`sinsin-be-bun` 의
 * `src/domains/restaurant/schemas.ts::createReviewBody`)가 이 이름의 정본이고, 값은 서명
 * URL 이 아니라 `uploaded.objectPath` — 서명은 15분마다 회전하므로 URL 을 넣으면 만료된
 * 링크가 DB 에 굳는다.
 *
 * 이 이름이 틀리면 **아무도 안 터진다.** 서버의 TypeBox 는 non-strict 라 모르는 키를 그냥
 * 통과시키고, 스키마에 없는 키는 읽히지도 않는다. 실제로 앱은 오랫동안 `imageUrls` 로
 * 보내고 있었고 요청은 200, 후기는 저장, 사진만 사라졌다 — 서버·앱 어디에도 오류가 남지
 * 않았다. 그래서 본문 조립은 `utils/reviewDraft.ts::reviewSubmitBody` 한 곳에만 두고
 * `tests/restaurantReviewSubmitContract.test.ts` 가 서버 스키마 파일과 키를 대조한다.
 *
 * ## 되돌리지 말 것
 *
 * - 별점의 미선택 색을 `fill.normal` 로 하지 않는다. 그건 **면**에 쓰는 알파색이라
 *   별 글리프에 얹으면 거의 안 보인다. 글리프는 `label.assistive` 를 쓴다.
 * - `fontWeight` 를 쓰지 않는다. 굵기는 `fontFamily`(Pretendard-*)에만 있다.
 * - 키워드 카드의 순서를 선택 여부로 재배열하지 않는다. 목업 -27 에서 선택된 두 카드가
 *   앞으로 온 것처럼 보이지만, 누를 때마다 카드가 움직이면 다음 카드를 조준할 수 없다.
 *   `REVIEW_KEYWORDS` 순서를 고정한다.
 */

import { useCallback, useMemo, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native"
import { Text, TextInput } from "@/src/shared/components/AppText"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import {
  V2Button,
  V2Icon,
  V2Modal,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { presentError } from "@/src/lib/errorMessage"
import { showConfirm } from "@/src/lib/dialog"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"

import type { ReviewDto, ReviewKeyword } from "../types"
import { REVIEW_KEYWORDS } from "../data/filterCatalog"
import { useRestaurantReviews } from "../hooks/useRestaurantReviews"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import {
  REVIEW_CONTENT_MAX,
  REVIEW_MAX_PHOTOS,
  isReviewDraftReady,
  reviewDefectMessageKey,
  reviewDraftDefects,
  showReviewPhotoNotice,
} from "../utils/reviewDraft"
import { MediaPicker } from "../components/MediaPicker"

/** 목업의 별. 44 는 최소 터치 크기이기도 하다 — 별 하나가 곧 하나의 버튼이다. */
const STAR_SIZE = 44
const STAR_VALUES = [1, 2, 3, 4, 5] as const

/**
 * 미디어 스트립 타일. 목업(505px 폭 = 375pt, 배율 1.347)에서 실측 133px ≈ 100pt 정사각이다.
 * DESIGN_SPEC 이 적어 둔 값이 없어 이미지에서 재서 넣었다.
 */
const MEDIA_TILE = 100
const ORDER_BADGE = 24

export interface ReviewWriteScreenProps {
  restaurantId: number
  /** 타이틀 첫 줄(브랜드색)에 그대로 들어간다. */
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
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

  /**
   * 후기 목록 훅을 그대로 쓴다. 작성 화면에서 목록 GET 이 한 번 나가지만,
   * 후기 탭에서 들어오는 실제 동선에서는 같은 queryKey 라 캐시 히트다. 그보다
   * "등록 후 목록·평점분해·상세를 함께 무효화" 하는 규칙을 여기서 다시 쓰는 쪽이 위험하다 —
   * 한쪽만 털면 별점은 4.2 인데 리뷰 수는 그대로인 화면이 남는다.
   */
  const { submitReview, isSubmitting } = useRestaurantReviews({ restaurantId })

  const [rating, setRating] = useState(0)
  const [keywords, setKeywords] = useState<readonly ReviewKeyword[]>([])
  const [content, setContent] = useState("")
  const [photoUris, setPhotoUris] = useState<readonly string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [guidelinesOpen, setGuidelinesOpen] = useState(false)

  /**
   * `리뷰 작성 주의사항` 링크의 행선지.
   *
   * 목업 -26/-27 은 이 링크를 `등록` 바로 위에 그리는데, 저장소에 후기 가이드라인 **문서
   * 화면이 없다** (`legal-document` route 는 약관·개인정보 두 장뿐이다). 그래서 링크를
   * `onOpenGuidelines` 유무로 감췄고, 아무 호출부도 그 prop 을 주지 않아 **목업 두 장의
   * 링크가 한 번도 렌더되지 않았다.**
   *
   * 없는 화면을 기다리며 링크를 감추는 대신 같은 내용을 모달로 띄운다 — 이 링크가 말해야
   * 하는 것(욕설·비방·명예훼손 유의)은 문단 두 개면 끝나고, 전용 route 를 새로 여는 것보다
   * 작성 흐름을 끊지 않는다. 나중에 진짜 문서가 생기면 `onOpenGuidelines` 를 넘기면 되고
   * 이 폴백은 그대로 두면 된다.
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

  /**
   * 쓰던 후기를 두고 나가기 전에 한 번 묻는다.
   *
   * 이 화면은 별점·키워드·사진·본문을 다 모아야 끝나는데, 닫기(✕)가 그걸 통째로
   * 버렸다 — 자유글·레시피 편집기에는 원래 있던 확인이 입력량이 맞먹는 여기에만
   * 없었다. 한 칸도 안 채웠으면 묻지 않는다(문의 화면과 같은 규칙).
   *
   * `ready` 가 아니라 **입력 여부**로 판단한다. 별점만 찍고 나가는 사람도 그 별점을
   * 잃는 건 마찬가지다.
   */
  const handleClose = useCallback(async () => {
    const dirty =
      rating > 0 ||
      keywords.length > 0 ||
      content.trim().length > 0 ||
      photoUris.length > 0
    if (!dirty) {
      onClose()
      return
    }
    const confirmed = await showConfirm({
      title: t("restaurant.review.form.discardTitle"),
      description: t("restaurant.review.form.discardBody"),
      confirmLabel: t("restaurant.review.form.discard"),
      cancelLabel: t("restaurant.review.form.keepWriting"),
      destructive: true,
    })
    if (confirmed) onClose()
  }, [content, keywords, onClose, photoUris, rating, t])
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

  const submit = useCallback(async () => {
    if (!ready || isSubmitting) return
    try {
      /* 사진 전량 업로드 → 하나라도 실패하면 등록하지 않는다. */
      const objectPaths: string[] = []
      for (const [index, uri] of photoUris.entries()) {
        if (photoUris.length > 1) {
          setUploadProgress(
            t("restaurant.review.form.photoProgress", {
              current: index + 1,
              total: photoUris.length,
            }),
          )
        }
        const uploaded = await imageUploadService.uploadImage(uri, "general")
        objectPaths.push(uploaded.objectPath)
      }
      setUploadProgress(null)

      const { review, photosIndexed } = await submitReview({
        rating,
        content: content.trim(),
        keywords: [...keywords],
        imageObjectPaths: objectPaths,
      })
      /*
        사진이 빠진 것은 **실패로 접지 않는다** — 후기 본문은 이미 저장됐고, 여기서 실패로
        돌리면 사용자가 같은 글을 또 써서 후기가 두 벌이 된다. 성공으로 두되 사진에 대해서만
        사실대로 말한다.

        판정·문구·톤·토스트 표면까지 전부 `reviewDraft.ts::showReviewPhotoNotice` 가 정한다.
        이 화면에는 **분기가 하나도 없다** — 예전에는 표면 셋을 여기서 골랐고, 그 분기
        **앞에** 이른 return 한 줄만 넣으면(`if (photosIndexed >= 0) { …성공 토스트…; return }`)
        출시됐던 결함이 소스 검사를 전부 통과한 채 되살아났다. 화면이 못 고르면 화면에서
        틀릴 수도 없다.

        아래 두 줄 사이에 `return` 을 끼우는 것도 같은 결함이므로 계약 테스트가 막는다.
      */
      showReviewPhotoNotice(
        { sent: objectPaths.length, indexed: photosIndexed },
        (key, params) => t(dynamicKey(key), params),
      )
      onSubmitted?.(review)
    } catch (error) {
      /*
        이 catch 는 후기 등록과 **사진 업로드**를 함께 받는다. 사진 쪽 실패는
        `FOOD_CAMERA_001`(JPG·PNG 아님) · `002`(5MB 초과)로 오는데, 폴백
        `후기를 등록하지 못했어요. 잠시 후 다시 시도해 주세요.` 가 그 코드를 이겨서
        사용자는 같은 사진으로 계속 다시 눌렀다. 폴백을 빼면 코드가 이긴다.

        재시도 핸들러는 주지 않는다 — `등록` 버튼이 화면에 그대로 남아 있어서
        토스트 안의 버튼이 같은 일을 한 번 더 제안하는 꼴이 된다.
      */
      presentError(error, { scope: "restaurant-review-write" })
    } finally {
      setUploadProgress(null)
    }
  }, [
    content,
    isSubmitting,
    keywords,
    onSubmitted,
    photoUris,
    rating,
    ready,
    submitReview,
    t,
  ])

  const counterCurrent = content.length
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background.default, paddingTop: insets.top },
        style,
      ]}
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("restaurant.review.form.close")}
          onPress={() => void handleClose()}
          hitSlop={14}
          style={({ pressed }) => [pressed && styles.pressedRow]}
        >
          <V2Icon name="close" size="md" color={colors.label.normal} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 타이틀 — 상호명(브랜드) 개행 안내문 */}
          <View style={styles.titleBlock}>
            <Text
              style={[
                typography.title.small,
                { color: colors.primary.primary },
              ]}
              lineBreakStrategyIOS="hangul-word"
            >
              {restaurantName}
            </Text>
            <Text
              style={[typography.title.small, { color: colors.label.normal }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("restaurant.review.form.title")}
            </Text>
          </View>

          {/* 별점 */}
          <View style={styles.section}>
            <Text
              style={[typography.title.xSmall, { color: colors.label.normal }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("restaurant.review.form.ratingQuestion")}
            </Text>
            <View
              style={styles.starRow}
              accessibilityRole="radiogroup"
              accessibilityLabel={t("restaurant.review.form.ratingQuestion")}
            >
              {STAR_VALUES.map((value) => {
                const filled = value <= rating
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: filled }}
                    accessibilityLabel={t(
                      "restaurant.review.form.ratingAccessibility",
                      { count: value },
                    )}
                    onPress={() => {
                      setTouched(true)
                      setRating(value)
                    }}
                    style={({ pressed }) => [
                      styles.star,
                      pressed && styles.pressedRow,
                    ]}
                  >
                    <V2Icon
                      name="starFilled"
                      size={STAR_SIZE - spacing[4]}
                      /* 입력용 별도 표시용 별과 같은 앰버다. 목업 -27 의 채워진 별을
                         뽑으면 #FFA938 로 카드·평점분해의 별과 같은 값이다. 브랜드
                         주황을 쓰면 같은 화면의 `등록` 버튼과 같은 색이 되어 별이
                         CTA 로 읽힌다. */
                      color={
                        filled
                          ? colors.status.cautionary
                          : colors.label.assistive
                      }
                    />
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View
            style={[
              styles.bandGap,
              { backgroundColor: colors.background.lower },
            ]}
          />

          {/* 키워드 5카드 */}
          <View style={styles.section}>
            <Text
              style={[typography.title.xSmall, { color: colors.label.normal }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("restaurant.review.form.keywordQuestion")}
            </Text>
            <Text
              style={[
                typography.subtext.large,
                { color: colors.label.assistive },
              ]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("restaurant.review.form.keywordHint")}
            </Text>
            <View style={styles.keywordRow}>
              {REVIEW_KEYWORDS.map((item) => {
                const selected = keywords.includes(item.value)
                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={t(dynamicKey(item.labelKey))}
                    onPress={() => toggleKeyword(item.value)}
                    style={({ pressed }) => [
                      styles.keywordCard,
                      {
                        borderColor: selected
                          ? colors.primary.primary
                          : colors.line.normal,
                        backgroundColor: selected
                          ? colors.primary.primaryWeak
                          : colors.background.default,
                      },
                      pressed && styles.pressedChip,
                    ]}
                  >
                    {/* 이모지는 서체 굵기가 무의미하다. 크기만 토큰에서 가져온다. */}
                    <Text style={typography.title.small}>{item.emoji}</Text>
                    <Text
                      style={[
                        typography.label.xSmall,
                        styles.keywordLabel,
                        {
                          color: selected
                            ? colors.primary.primary
                            : colors.label.neutral,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {t(dynamicKey(item.labelKey))}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View
            style={[
              styles.bandGap,
              { backgroundColor: colors.background.lower },
            ]}
          />

          {/* 본문 + 미디어 */}
          <View style={styles.section}>
            <Text
              style={[typography.title.xSmall, { color: colors.label.normal }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("restaurant.review.form.contentQuestion")}
            </Text>
            <Text
              style={[
                typography.subtext.large,
                { color: colors.label.assistive },
              ]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("restaurant.review.form.contentHint")}
            </Text>

            <ScrollView
              horizontal
              bounces={false}
              overScrollMode="never"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaStrip}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("restaurant.review.form.mediaPick")}
                accessibilityHint={t("restaurant.review.form.photoCount", {
                  current: photoUris.length,
                  max: REVIEW_MAX_PHOTOS,
                })}
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [
                  styles.mediaTile,
                  styles.mediaPickTile,
                  { backgroundColor: colors.fill.background },
                  pressed && styles.pressedCard,
                ]}
              >
                <V2Icon
                  name="camera"
                  size="lg"
                  color={colors.label.alternative}
                />
                <Text
                  style={[
                    typography.caption.small,
                    styles.keywordLabel,
                    { color: colors.label.neutral },
                  ]}
                  lineBreakStrategyIOS="hangul-word"
                  textBreakStrategy="balanced"
                >
                  {t("restaurant.review.form.mediaPick")}
                </Text>
              </Pressable>

              {photoUris.map((uri, index) => (
                <View key={uri} style={styles.mediaTile}>
                  <Image
                    source={{ uri }}
                    style={styles.mediaImage}
                    contentFit="cover"
                    transition={120}
                  />
                  {/*
                    배지가 곧 '빼기' 버튼이다. 목업에는 별도 ✕ 가 없고, 순번 원을
                    다시 누르는 것이 피커의 해제 동작과 같은 몸짓이라 규칙이 하나로 남는다.
                  */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      "restaurant.review.form.photoRemove",
                      { index: index + 1 },
                    )}
                    onPress={() => removePhoto(uri)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.orderBadge,
                      { backgroundColor: colors.primary.primary },
                      pressed && styles.pressedChip,
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption.small,
                        styles.keywordLabel,
                        { color: colors.static.white },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <View
              style={[
                styles.textArea,
                { backgroundColor: colors.fill.background },
              ]}
            >
              <TextInput
                value={content}
                onChangeText={(next) => {
                  setTouched(true)
                  setContent(next)
                }}
                placeholder={t("restaurant.review.form.placeholder")}
                placeholderTextColor={colors.label.assistive}
                multiline
                maxLength={REVIEW_CONTENT_MAX}
                textAlignVertical="top"
                style={[
                  typography.subtext.large,
                  styles.textInput,
                  { color: colors.label.normal },
                ]}
                accessibilityLabel={t("restaurant.review.form.contentQuestion")}
              />
              <Text style={styles.counterRow}>
                <Text
                  style={[
                    typography.subtext.medium,
                    { color: colors.primary.primary },
                  ]}
                >
                  {counterCurrent}
                </Text>
                <Text
                  style={[
                    typography.subtext.medium,
                    { color: colors.label.assistive },
                  ]}
                >
                  {`/ ${REVIEW_CONTENT_MAX}`}
                </Text>
              </Text>
            </View>

            {/* 목업 -26/-27 이 `등록` 바로 위에 두는 밑줄 링크. 조건부로 그리지 않는다 —
                갈 곳은 아래 `openGuidelines` 가 항상 마련한다. */}
            <Pressable
              accessibilityRole="link"
              onPress={openGuidelines}
              hitSlop={8}
              style={({ pressed }) => [
                styles.guidelineWrap,
                pressed && styles.pressedRow,
              ]}
            >
              <Text
                style={[
                  typography.subtext.medium,
                  styles.guideline,
                  { color: colors.label.neutral },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("restaurant.review.form.guideline")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background.default,
              paddingBottom: insets.bottom + spacing[12],
            },
          ]}
        >
          {uploadProgress ? (
            <Text
              style={[
                typography.subtext.medium,
                styles.footerHint,
                { color: colors.label.neutral },
              ]}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {uploadProgress}
            </Text>
          ) : touched && blockingMessage ? (
            <Text
              style={[
                typography.subtext.medium,
                styles.footerHint,
                { color: colors.status.negative },
              ]}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {blockingMessage}
            </Text>
          ) : null}
          <V2Button
            size="xl"
            color="brand"
            variant="fill"
            fullWidth
            disabled={!ready}
            loading={isSubmitting || uploadProgress !== null}
            accessibilityHint={blockingMessage ?? undefined}
            onPress={() => void submit()}
          >
            {t("restaurant.review.form.submit")}
          </V2Button>
        </View>
      </KeyboardAvoidingView>

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
  flex: { flex: 1 },
  topBar: {
    minHeight: 44,
    paddingHorizontal: spacing[16],
    alignItems: "flex-end",
    justifyContent: "center",
  },
  content: { paddingBottom: spacing[24] },
  titleBlock: { paddingHorizontal: spacing[16], paddingBottom: spacing[20] },
  section: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[20],
    gap: spacing[8],
  },
  /** 목업의 섹션 사이 회색 밴드. 선이 아니라 면으로 끊는다. */
  bandGap: { height: spacing[8] },
  starRow: { flexDirection: "row", marginTop: spacing[4] },
  star: {
    width: STAR_SIZE,
    height: STAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  keywordRow: { flexDirection: "row", gap: spacing[8], marginTop: spacing[4] },
  /*
    DESIGN_SPEC 은 72×72 라고 적었지만 375pt 화면에 좌우 16 여백 + gap 8 로 5개를 놓으면
    한 칸이 62 다 — 72 로 박으면 마지막 카드가 화면 밖으로 나간다(목업 실측도 ~62 다).
    그래서 폭을 고정하지 않고 5등분한다. 큰 화면에서는 같이 커진다.
  */
  keywordCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
  },
  keywordLabel: { textAlign: "center" },
  mediaStrip: {
    gap: spacing[8],
    paddingTop: spacing[4],
    paddingRight: spacing[16],
  },
  mediaTile: {
    width: MEDIA_TILE,
    height: MEDIA_TILE,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  mediaPickTile: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
  },
  mediaImage: { width: "100%", height: "100%" },
  orderBadge: {
    position: "absolute",
    top: spacing[8],
    right: spacing[8],
    width: ORDER_BADGE,
    height: ORDER_BADGE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  textArea: {
    minHeight: 190,
    borderRadius: radius.lg,
    padding: spacing[16],
    marginTop: spacing[8],
  },
  textInput: { flex: 1, minHeight: 120, padding: 0 },
  counterRow: { textAlign: "right", marginTop: spacing[8] },
  guidelineWrap: { alignSelf: "flex-start", marginTop: spacing[8] },
  guideline: { textDecorationLine: "underline" },
  footer: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    gap: spacing[8],
  },
  footerHint: { textAlign: "center" },
  pressedRow: { opacity: 0.6 },
  pressedChip: { opacity: 0.85 },
  pressedCard: { opacity: 0.9 },
})
