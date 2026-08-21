/**
 * 후기 탭 (목업 -11 / -12).
 *
 * 순서: 작성 유도 카드 → 평점 분해 → 필터 2행(메뉴·특징) → 정렬 줄 → 후기 목록 → `후기 더보기`.
 *
 * ## 필터 상태를 이 탭이 들고 있는 이유
 *
 * `useRestaurantReviews` 는 `sort`/`keyword`/`menuName` 을 쿼리 키에 담는다. 상태를
 * 상세 화면까지 끌어올리면 홈 탭이 쓰는 기본 조회(`LATEST`·필터 없음)와 키가 뒤섞여,
 * 홈 탭을 다시 보러 갈 때마다 필터가 걸린 목록이 나온다. 탭이 자기 상태를 갖고
 * 기본값을 그대로 두면 홈 탭과 **같은 캐시**를 공유한다(추가 요청 0회).
 *
 * ## 목록을 가상화하지 않는다
 *
 * 한 페이지 10건이고, 다음 페이지는 **바닥에 닿으면 저절로** 온다. 상세 화면은 sticky 탭을
 * 위해 스크롤을 하나만 갖고 그 안에 FlatList 를 넣으면 중첩 스크롤이 되지만, 바닥 감지는
 * 부모의 `onScroll` 로 충분하다(`utils/autoPaginate`). 예전 주석이 그 제약에서
 * "그러므로 더보기 버튼" 을 도출했는데 그건 틀린 추론이었다 — 같은 저장소의 상담 화면이
 * 이미 평범한 `onScroll` 로 같은 일을 하고 있었다. 버튼은 실패 시 손잡이로 남는다.
 *
 * ## 정렬 시트는 공용 `ReviewSortSheet` 를 쓴다
 *
 * 목업 -33 의 시트(옵션 3개 + `다음`)는 작성자 프로필 화면도 쓴다. 여기서 다시 만들면
 * 두 화면의 정렬 옵션이 갈라진다. 스냅 포인트·드래그가 필요한 것은 지도의 장소 시트뿐이라
 * 그쪽 시트는 `V2BottomSheet` 기반으로 충분하다.
 */

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"

import { AUTO_PAGE_LIMIT } from "../../utils/autoPaginate"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  spacing,
  typography,
  useV2Theme,
  V2Divider,
  V2EmptyState,
  V2ErrorState,
  V2Icon,
} from "@/src/design-system-v2"

import { CHIP_GAP, GUTTER, RAIL_INSET, SECTION_GAP } from "../../layout"
import { DEFAULT_REVIEW_SORT, REVIEW_KEYWORDS } from "../../data/filterCatalog"
import { formatPhotoCount } from "../../hooks/useRestaurantPhotos"
import { useRestaurantReviews } from "../../hooks/useRestaurantReviews"
import type { PhotoDto, ReviewKeyword, ReviewSortOption } from "../../types"
import { ReviewSortSheet } from "../ReviewSortSheet"
import { ReviewTabSkeleton } from "./DetailSkeletons"
import { DetailFilterChip } from "./DetailFilterChip"
import { OutlinePill } from "./OutlinePill"
import { RatingBreakdown } from "./RatingBreakdown"
import { ReviewCard } from "./ReviewCard"
import { ReviewWritePrompt } from "./ReviewWritePrompt"
import { reviewPhotos } from "./reviewPhotos"

/** 필터 칩의 `전체`. 서버 값이 아니라 화면의 "필터 없음" 이다. */
const ALL = "ALL"

export interface ReviewTabProps {
  restaurantId: number
  restaurantName: string
  /** 후기 작성 화면으로. 라우트가 아직 없으면 주지 않는다 — 그때 유도 카드를 감춘다. */
  onWriteReview?: () => void
  onPressAuthor?: (reviewerId: number) => void
  /** 후기 사진 뷰어. 이 후기의 사진만으로 된 배열을 받는다(`reviewPhotos`). */
  onOpenPhotos?: (photos: PhotoDto[], index: number) => void
  onReportReview?: (reviewId: number) => void
  /**
   * 바닥에 닿을 때마다 **1씩 오르는 신호.** 값이 아니라 변했다는 사실만 쓴다.
   * 왜 `onEndReached` 가 아닌지는 `utils/autoPaginate` 머리말에 있다.
   */
  endReachedTick?: number
}

export function ReviewTab({
  restaurantId,
  restaurantName,
  onWriteReview,
  onPressAuthor,
  onOpenPhotos,
  onReportReview,
  endReachedTick = 0,
}: ReviewTabProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  const [sort, setSort] = useState<ReviewSortOption>(DEFAULT_REVIEW_SORT)
  const [keyword, setKeyword] = useState<ReviewKeyword | typeof ALL>(ALL)
  const [menuName, setMenuName] = useState<string | typeof ALL>(ALL)
  const [sortSheetOpen, setSortSheetOpen] = useState(false)

  /*
    ── 자동 다음 쪽 ──────────────────────────────────────────────
    가드는 사진 탭과 같은 이유로 둘이다: 마운트 시드(홈 탭에서 넘어올 때 요청하지 않은
    쪽이 나가는 것을 막는다)와 상한. 사진 탭의 세 번째 가드(격자 측정)는 여기 없다 —
    후기 카드는 높이를 재는 단계가 없어 새 쪽이 오면 곧바로 콘텐츠가 자란다.
  */
  const autoPages = useRef(0)
  const seenTick = useRef(endReachedTick)

  const {
    reviews,
    breakdown,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    nextPageFailed,
    isError,
    loadMore,
    refetch,
  } = useRestaurantReviews({
    restaurantId,
    sort,
    keyword: keyword === ALL ? null : keyword,
    menuName: menuName === ALL ? null : menuName,
  })

  useEffect(() => {
    if (endReachedTick === seenTick.current) return
    seenTick.current = endReachedTick
    if (autoPages.current >= AUTO_PAGE_LIMIT) return
    autoPages.current += 1
    loadMore()
    // `loadMore` 는 매 렌더 새 함수다. deps 에 넣으면 매번 다시 돈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endReachedTick])

  // 필터·정렬을 바꾸면 다른 질의다. 상한도 다시 센다.
  useEffect(() => {
    autoPages.current = 0
  }, [sort, keyword, menuName])

  const totalLabel = formatPhotoCount(breakdown?.totalCount ?? 0)

  /** 개수가 0인 키워드 칩은 걸러 낸다 — 눌러도 0건인 칩을 보여 주지 않는다. */
  const keywordChips = useMemo(
    () =>
      REVIEW_KEYWORDS.filter(
        (item) => (breakdown?.keywordCounts[item.value] ?? 0) > 0,
      ),
    [breakdown],
  )

  const activeFilterLabel =
    keyword === ALL
      ? t("restaurant.review.filterAll")
      : t(`restaurant.review.keywords.${keyword}`)

  if (isLoading) {
    return <ReviewTabSkeleton />
  }

  if (isError) {
    return (
      <V2ErrorState
        surface="restaurant_detail_review"
        title={t("restaurant.error.detailTitle")}
        description={t("restaurant.error.detailBody")}
        onRetry={refetch}
        retryLabel={t("restaurant.error.detailRetry")}
      />
    )
  }

  return (
    <View>
      {onWriteReview && (
        <ReviewWritePrompt
          restaurantName={restaurantName}
          onPress={onWriteReview}
          style={styles.prompt}
        />
      )}

      {breakdown && (
        <>
          <V2Divider variant="thick" />
          <RatingBreakdown breakdown={breakdown} />
        </>
      )}

      <V2Divider variant="thick" />

      <View style={styles.filters}>
        {(breakdown?.menuCounts.length ?? 0) > 0 && (
          <ChipRow axisLabel={t("restaurant.review.filterMenu")}>
            <DetailFilterChip
              label={t("restaurant.review.filterAll")}
              count={totalLabel}
              selected={menuName === ALL}
              onPress={() => setMenuName(ALL)}
            />
            {breakdown?.menuCounts.map((item) => (
              <DetailFilterChip
                key={item.menuName}
                label={item.menuName}
                count={formatPhotoCount(item.count)}
                selected={menuName === item.menuName}
                onPress={() => setMenuName(item.menuName)}
              />
            ))}
          </ChipRow>
        )}

        {keywordChips.length > 0 && (
          <ChipRow axisLabel={t("restaurant.review.filterKeyword")}>
            <DetailFilterChip
              label={t("restaurant.review.filterAll")}
              count={totalLabel}
              selected={keyword === ALL}
              onPress={() => setKeyword(ALL)}
            />
            {keywordChips.map((item) => (
              <DetailFilterChip
                key={item.value}
                label={t(`restaurant.review.keywords.${item.value}`)}
                count={formatPhotoCount(
                  breakdown?.keywordCounts[item.value] ?? 0,
                )}
                selected={keyword === item.value}
                onPress={() => setKeyword(item.value)}
              />
            ))}
          </ChipRow>
        )}
      </View>

      {/*
        목업의 `• 특징  • 최신순` 줄. 왼쪽은 지금 걸린 필터를 되읽어 주는 **요약**이고
        (누를 곳은 위의 칩이다), 오른쪽만 정렬 시트를 연다. 왼쪽을 버튼처럼 꾸며 두고
        아무 동작도 주지 않으면 프로토타입의 죽은 버튼을 되풀이하게 된다.
      */}
      <View style={styles.sortRow}>
        <Text
          style={[typography.subtext.medium, { color: colors.label.neutral }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("restaurant.review.filterSummary", {
            axis: t("restaurant.review.filterKeyword"),
            value: activeFilterLabel,
          })}
        </Text>
        <Pressable
          onPress={() => setSortSheetOpen(true)}
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          accessibilityLabel={t("restaurant.sort.title")}
          hitSlop={spacing[8]}
          style={({ pressed }) => [
            styles.sortButton,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[typography.label.xSmall, { color: colors.label.normal }]}
          >
            {t(`restaurant.reviewSort.${sort}`)}
          </Text>
          <V2Icon
            name="chevronDown"
            size={iconSize.xs}
            color={colors.label.neutral}
          />
        </Pressable>
      </View>

      {reviews.length === 0 ? (
        <V2EmptyState
          surface="restaurant_detail_review"
          title={t("restaurant.empty.reviewTitle")}
          description={t("restaurant.empty.reviewBody")}
        />
      ) : (
        <View style={styles.list}>
          {reviews.map((review, index) => (
            <View key={review.reviewId}>
              {index > 0 && <V2Divider tone="alternative" />}
              <ReviewCard
                review={review}
                onPressAuthor={onPressAuthor}
                onPressPhoto={
                  onOpenPhotos
                    ? (target, photoIndex) =>
                        onOpenPhotos(reviewPhotos(target), photoIndex)
                    : undefined
                }
                onReport={onReportReview}
              />
            </View>
          ))}
        </View>
      )}

      {/* 자동이 실패했을 때만 눈에 띄는 손잡이. 근거는 사진 탭의 같은 자리 주석에 있다. */}
      {(hasNextPage || nextPageFailed) && (
        <View style={styles.moreRow}>
          <OutlinePill
            label={
              nextPageFailed
                ? t("restaurant.review.seeMoreRetry")
                : t("restaurant.review.seeMore")
            }
            showChevron={!nextPageFailed}
            loading={isFetchingNextPage}
            onPress={loadMore}
          />
        </View>
      )}

      <ReviewSortSheet
        visible={sortSheetOpen}
        value={sort}
        onConfirm={(next) => {
          setSort(next)
          setSortSheetOpen(false)
        }}
        onClose={() => setSortSheetOpen(false)}
      />
    </View>
  )
}

/**
 * 축 라벨(`메뉴`/`특징`) + 가로 스크롤 칩 한 줄.
 *
 * 라벨을 스크롤 **밖**에 두는 것이 핵심이다. 함께 스크롤되면 칩을 오른쪽으로 밀었을 때
 * 이 줄이 어느 축인지 사라져 `가성비 240` 이 메뉴 이름처럼 보인다.
 */
function ChipRow({
  axisLabel,
  children,
}: {
  axisLabel: string
  children: ReactNode
}) {
  const { colors } = useV2Theme()
  return (
    <View style={styles.chipRow}>
      <Text
        style={[
          typography.label.xSmall,
          styles.axisLabel,
          { color: colors.label.neutral },
        ]}
      >
        {axisLabel}
      </Text>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRowContent}
      >
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  filters: { gap: spacing[8], paddingVertical: spacing[16] },
  chipRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  // 축 라벨은 스크롤 밖에 고정한다 — 함께 스크롤되면 어느 축인지 사라진다.
  axisLabel: { paddingLeft: GUTTER },
  // 오른쪽 인셋은 `contentContainerStyle` 쪽이다(컨테이너에 주면 스크롤 끝에서 잘린다).
  chipRowContent: { gap: CHIP_GAP, paddingRight: RAIL_INSET },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
    paddingHorizontal: GUTTER,
    paddingBottom: spacing[8],
  },
  sortButton: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  list: { paddingHorizontal: GUTTER },
  moreRow: {
    alignItems: "center",
    paddingVertical: SECTION_GAP,
    paddingHorizontal: GUTTER,
  },
  prompt: { paddingHorizontal: GUTTER, paddingVertical: SECTION_GAP },
  pressed: { opacity: 0.85 },
})
