import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 사진 뷰어 / 라이트박스 (목업 -16 / -17).
 *
 * ## 레터박스는 검은 띠가 아니라 "같은 사진의 흐린 복사본" 이다
 *
 * -17 을 확대해 보면 세로 사진 위/아래의 띠가 **그 사진 자체를 확대·블러한 것**이다.
 * 색이 이어져서 사진이 화면을 채운 것처럼 보이고, 실제 사진은 잘리지 않는다.
 * 그래서 구현이 한 겹이 아니라 두 겹이다.
 *
 *   1) 뒤: 같은 `uri`, `contentFit="cover"`, `blurRadius` — 프레임을 꽉 채운다.
 *   2) 앞: 같은 `uri`, `contentFit="contain"` — 잘리지 않게 들어간다.
 *
 * 가로/정사각 사진은 앞 레이어가 프레임을 다 덮으므로 뒤 레이어가 **보이지 않는다** —
 * -16 처럼 꽉 찬 화면이 그냥 나온다. 분기 없이 두 목업이 같은 코드로 나오는 것이 요점이다.
 *
 * `expo-blur` 는 이 저장소에 없다(`elevation.ts` 의 `blur` 토큰이 쓸 수 없는 이유). 대신
 * `expo-image` 의 `blurRadius` 를 쓴다 — 이미 의존성이고, 레이어를 하나 더 얹지 않는다.
 *
 * ## 작성자·태그 칩·날짜는 사진이 아니라 **후기**가 갖고 있다
 *
 * 목업 하단의 `4번째 방문` `😋 맛` `+2` 는 그 사진을 올린 **후기**의 값이다.
 * `PhotoDto` 에는 `visitCount`·`keywords` 가 없고 `sourceReviewId` 만 있다. 그래서 이 화면은
 * `reviews` 를 받아 `sourceReviewId` 로 찾아 쓴다. 못 찾으면 칩을 그리지 않고 날짜만 남긴다 —
 * 없는 값을 `1번째 방문` 같은 기본값으로 채우지 않는다.
 *
 * **작성자도 같은 경로다.** 예전에는 `photo.author` 를 읽었는데 `/:id/photos` 응답의
 * 사진 항목에는 그런 필드가 **없다** — 즉 이 헤더의 작성자 블록은 한 번도 그려진 적이
 * 없었다. 지금은 찾아낸 후기에서 꺼내므로(`reviewAuthorOf`) 후기 사진에서는 실제로 뜬다.
 * 사장님 사진(`OWNER`)이나 메뉴 사진에는 작성자가 없는 것이 맞으므로 그때는 계속 비운다.
 *
 * ## 팔로우 버튼은 오늘 그릴 수 없다
 *
 * 서버가 팔로우 상태를 아예 내리지 않는다(표가 스키마에 없다). 예전 조건은
 * `author.following !== null` 이었고, 그 필드가 없으니 `undefined !== null` → `true` 로
 * 통과해 **눌러도 아무 일 없는 버튼을 켜는 조건**이었다. 그래서 지웠다.
 * 서버가 상태를 싣는 날 `ReviewAuthorView` 에 그 필드를 더하고 여기에 버튼을 되살린다.
 */

import { useCallback, useMemo, useRef, useState } from "react"
import {
  FlatList,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"

import {
  V2Icon,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import type { PhotoDto, ReviewDto } from "../types"
import {
  reviewAuthorOf,
  type ReviewAuthorView,
} from "../components/detail/reviewAuthor"
import { REVIEW_KEYWORDS } from "../data/filterCatalog"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import {
  formatStatCount,
  reviewDateParts,
  reviewTagLayout,
} from "../utils/reviewFormat"

/**
 * 뒤 레이어 블러 반경(pt). 24 보다 작으면 확대된 사진의 형태가 남아 "같은 사진이
 * 두 번 보이는" 느낌이 나고, 40 을 넘기면 색만 남아 -17 의 이어지는 느낌이 사라진다.
 */
const BACKDROP_BLUR = 24
const ARROW_SIZE = 40
const AVATAR_SIZE = 44

/**
 * 키워드 → `{emoji, labelKey}`. 칩 라벨이 `😋 맛` 형태여야 목업과 같다.
 * 이모지를 이 파일에 다시 적지 않는다 — 카탈로그가 정본이고, 두 곳에 두면 하나만 바뀐다.
 */
const KEYWORD_SPEC = new Map(
  REVIEW_KEYWORDS.map((item) => [item.value, item] as const),
)

export interface RestaurantPhotoViewerScreenProps {
  restaurantName: string
  photos: readonly PhotoDto[]
  initialIndex?: number
  onClose: () => void
  /** 태그 칩(방문 회차·키워드)의 출처. `sourceReviewId` 로 찾는다. */
  reviews?: readonly ReviewDto[]
  /** 다음 페이지가 있을 때 마지막 장 근처에서 부른다. */
  onLoadMore?: () => void
  /**
   * 전체 장수. **모르면 주지 않는다** — 그러면 화면이 지금 들고 있는 수를 쓴다.
   *
   * 넘겨받은 배열(handoff)만 가진 경로에서는 그것이 전부라 `photos.length` 가 곧 총량이고,
   * 질의 경로에서는 서버가 총량을 알려 주므로 그쪽이 맞다. 둘을 구분하지 않으면
   * "1 / 30" 이라고 써 놓고 실제로는 50장인 상태가 된다.
   */
  totalCount?: number
  /** 작성자 프로필로 이동. 없으면 이름이 눌리지 않는다. */
  onPressAuthor?: (author: ReviewAuthorView) => void
  style?: ViewStyle
}

export function RestaurantPhotoViewerScreen({
  restaurantName,
  photos,
  initialIndex = 0,
  onClose,
  reviews,
  onLoadMore,
  totalCount,
  onPressAuthor,
  style,
}: RestaurantPhotoViewerScreenProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

  const listRef = useRef<FlatList<PhotoDto>>(null)
  const [index, setIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(photos.length - 1, 0)),
  )
  /** 알면 서버 총량, 모르면 지금 들고 있는 수. 지어내지 않는다. */
  const total = totalCount ?? photos.length
  /**
   * 프레임 크기를 **측정해서** 쓴다. `Dimensions.get("window")` 로 계산하면 헤더·푸터
   * 높이를 상수로 빼야 하고(기존 시트가 `bottom: 210` 같은 마법수로 깨진 이유), 회전·
   * 폴더블에서 어긋난다.
   */
  const [frame, setFrame] = useState({ width: 0, height: 0 })

  const onFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setFrame((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    )
  }, [])

  const reviewIndex = useMemo(() => {
    const map = new Map<number, ReviewDto>()
    for (const review of reviews ?? []) map.set(review.reviewId, review)
    return map
  }, [reviews])

  const current = photos[index]
  const sourceReview =
    current?.sourceReviewId != null
      ? (reviewIndex.get(current.sourceReviewId) ?? null)
      : null
  // 작성자는 사진이 아니라 **후기**가 갖고 있다(헤더 주석). 후기 사진이 아니면 `null` 이고
  // 그때는 헤더의 작성자 블록을 그리지 않는다 — 사장님·메뉴 사진에는 작성자가 없다.
  const author = sourceReview ? reviewAuthorOf(sourceReview) : null

  const tags = useMemo(
    () =>
      sourceReview
        ? reviewTagLayout({
            visitCount: sourceReview.visitCount,
            keywords: sourceReview.keywords,
          })
        : { visible: [], overflow: 0 },
    [sourceReview],
  )

  // 사진 항목에는 `createdAt` 이 없다. 날짜는 후기의 것이고, 후기를 못 찾으면 비운다.
  const datePartsValue = reviewDateParts(sourceReview?.createdAt ?? null)

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= photos.length) return
      listRef.current?.scrollToIndex({ index: next, animated: true })
      setIndex(next)
    },
    [photos.length],
  )

  const onMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (frame.width === 0) return
      const next = Math.round(event.nativeEvent.contentOffset.x / frame.width)
      setIndex(Math.min(Math.max(next, 0), Math.max(photos.length - 1, 0)))
    },
    [frame.width, photos.length],
  )

  const renderPage = useCallback(
    ({ item }: ListRenderItemInfo<PhotoDto>) => (
      <View style={[styles.page, { width: frame.width, height: frame.height }]}>
        {/* 뒤: 같은 사진을 프레임에 꽉 채우고 흐리게 — 세로 사진의 위/아래 띠가 된다. */}
        <Image
          source={remoteImageSource(item.originalUrl ?? item.url)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={BACKDROP_BLUR}
          transition={0}
          accessible={false}
        />
        {/* 앞: 잘리지 않는 본 사진. */}
        <Image
          source={remoteImageSource(item.originalUrl ?? item.url)}
          style={styles.pageImage}
          contentFit="contain"
          transition={160}
        />
        {item.isVideo ? (
          <View style={styles.playOverlay} pointerEvents="none">
            <V2Icon name="playCircle" size="2xl" color={colors.static.white} />
          </View>
        ) : null}
      </View>
    ),
    [colors.static.white, frame.height, frame.width],
  )

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background.default, paddingTop: insets.top },
        style,
      ]}
    >
      {/*
        목업 -16 의 제목은 가운데 정렬이다. `V2ScreenHeader` 는 토스식 좌측정렬을
        의도적으로 고정하고 있어(그 헤더 주석) 여기서는 쓰지 않고 같은 높이·같은
        글리프로 직접 그린다. 사진 뷰어는 제목이 곧 맥락이라 중앙이 맞다.
      */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
          onPress={onClose}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerBack,
            pressed && styles.pressedRow,
          ]}
        >
          <V2Icon name="chevronLeft" size="md" color={colors.label.normal} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[typography.label.small, { color: colors.label.strong }]}
          >
            {restaurantName}
          </Text>
          {/*
            **눈에 보이는 위치 표시.** 여기 없으면 지금 몇 번째인지, 얼마나 남았는지
            알 방법이 화면에 없다(값 자체는 접근성 라벨에만 있었다 — 보는 사람이
            스크린리더 사용자보다 적게 받는 상태였다).
          */}
          <Text
            style={[
              typography.caption.small,
              { color: colors.label.alternative },
            ]}
          >
            {`${index + 1} / ${total}`}
          </Text>
        </View>
      </View>

      <View
        style={styles.frame}
        onLayout={onFrameLayout}
        accessibilityLabel={t("restaurant.photo.viewerAccessibility", {
          name: restaurantName,
          current: index + 1,
          total,
        })}
      >
        {frame.width > 0 ? (
          <FlatList
            ref={listRef}
            data={photos as PhotoDto[]}
            keyExtractor={(item) => String(item.photoId)}
            renderItem={renderPage}
            horizontal
            pagingEnabled
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_data, itemIndex) => ({
              length: frame.width,
              offset: frame.width * itemIndex,
              index: itemIndex,
            })}
            onMomentumScrollEnd={onMomentumEnd}
            onEndReachedThreshold={0.4}
            onEndReached={onLoadMore}
          />
        ) : null}

        {index > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.photo.prev")}
            onPress={() => goTo(index - 1)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.arrow,
              styles.arrowLeft,
              { backgroundColor: colors.background.dim },
              pressed && styles.pressedChip,
            ]}
          >
            <V2Icon name="chevronLeft" size="sm" color={colors.static.white} />
          </Pressable>
        ) : null}
        {index < photos.length - 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.photo.next")}
            onPress={() => goTo(index + 1)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.arrow,
              styles.arrowRight,
              { backgroundColor: colors.background.dim },
              pressed && styles.pressedChip,
            ]}
          >
            <V2Icon name="chevronRight" size="sm" color={colors.static.white} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background.default,
            paddingBottom: insets.bottom + spacing[12],
          },
        ]}
      >
        {author ? (
          <View style={styles.authorRow}>
            <Pressable
              accessibilityRole={onPressAuthor ? "button" : "none"}
              accessibilityLabel={
                onPressAuthor
                  ? t("restaurant.photo.authorProfile", {
                      name: author.name,
                    })
                  : author.name
              }
              disabled={onPressAuthor == null}
              onPress={() => onPressAuthor?.(author)}
              style={({ pressed }) => [
                styles.authorIdentity,
                pressed && onPressAuthor != null && styles.pressedRow,
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.fill.background },
                ]}
              >
                {author.avatarUrl ? (
                  <Image
                    source={remoteImageSource(author.avatarUrl)}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <V2Icon
                    name="profile"
                    size="md"
                    color={colors.label.assistive}
                  />
                )}
              </View>
              <View style={styles.authorText}>
                <Text
                  numberOfLines={1}
                  style={[
                    typography.label.small,
                    { color: colors.label.normal },
                  ]}
                >
                  {author.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    typography.subtext.medium,
                    { color: colors.label.alternative },
                  ]}
                >
                  {/* 팔로워가 `null` 이면 그 조각을 빼고 `후기 20` 만 말한다 —
                      `팔로워 0` 은 없는 데이터로 사실을 주장하는 것이다. */}
                  {author.followerCount === null
                    ? t("restaurant.review.reviewerReviewsOnly", {
                        reviews: formatStatCount(author.reviewCount),
                      })
                    : t("restaurant.review.reviewerStats", {
                        reviews: formatStatCount(author.reviewCount),
                        followers: formatStatCount(author.followerCount),
                      })}
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {tags.visible.length > 0 || datePartsValue ? (
          <View style={styles.tagRow}>
            <View style={styles.tags}>
              {tags.visible.map((tag) => {
                const spec =
                  tag.keyword != null
                    ? KEYWORD_SPEC.get(tag.keyword)
                    : undefined
                const label =
                  tag.kind === "visit"
                    ? t("restaurant.review.visitCount", {
                        count: tag.visitCount ?? 0,
                      })
                    : spec
                      ? `${spec.emoji} ${t(dynamicKey(spec.labelKey))}`
                      : ""
                return (
                  <View
                    key={`${tag.kind}-${tag.keyword ?? "visit"}`}
                    style={[
                      styles.tagChip,
                      { backgroundColor: colors.fill.normal },
                    ]}
                  >
                    <Text
                      style={[
                        typography.label.xSmallWeak,
                        { color: colors.label.neutral },
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                )
              })}
              {tags.overflow > 0 ? (
                <View
                  style={[
                    styles.tagChip,
                    { backgroundColor: colors.fill.normal },
                  ]}
                >
                  <Text
                    style={[
                      typography.label.xSmallWeak,
                      { color: colors.label.neutral },
                    ]}
                  >
                    {t("restaurant.review.moreKeywords", {
                      count: tags.overflow,
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
            {datePartsValue ? (
              <Text
                style={[
                  typography.subtext.medium,
                  { color: colors.label.alternative },
                ]}
              >
                {t("restaurant.review.date", {
                  month: datePartsValue.month,
                  day: datePartsValue.day,
                  weekday: t(dynamicKey(datePartsValue.weekdayKey)),
                })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[16],
  },
  headerTitle: { flex: 1, alignItems: "center", gap: 2 },
  headerBack: { position: "absolute", left: spacing[16] },
  frame: { flex: 1, overflow: "hidden" },
  page: { alignItems: "center", justifyContent: "center" },
  pageImage: { width: "100%", height: "100%" },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    position: "absolute",
    top: "50%",
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    marginTop: -ARROW_SIZE / 2,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLeft: { left: spacing[12] },
  arrowRight: { right: spacing[12] },
  footer: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[12],
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: spacing[12] },
  authorIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  authorText: { flex: 1, gap: spacing[2] },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    flexShrink: 1,
  },
  tagChip: {
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
    borderRadius: radius.full,
  },
  pressedRow: { opacity: 0.6 },
  pressedChip: { opacity: 0.85 },
})
