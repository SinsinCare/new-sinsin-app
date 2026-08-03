/**
 * `저장한 곳` (DESIGN_SPEC §11.20).
 *
 * 목업에 이 화면은 없다 — 지도 기능으로서 반드시 있어야 하는데 디자인에서 빠진 항목이다.
 * 그래서 **리스트 전용 모드(-8/-21)의 언어를 그대로 재사용**한다: 상단에 뒤로 + 제목,
 * 그 아래 같은 `RestaurantCard` 목록. 새 시각 언어를 발명하면 같은 카드가 화면마다
 * 달라 보인다.
 *
 * ## 빈 상태를 오류로 그리지 않는다
 *
 * 저장한 곳이 0건인 것은 신규 사용자의 **정상 상태**다(D12 와 같은 판단). `V2ErrorState`
 * 는 실제 네트워크 실패에만 쓴다 — 붉은 경고로 "아직 아무것도 저장하지 않았다" 를 알리면
 * 사용자는 저장 기능이 고장 났다고 읽는다.
 *
 * ## 커서 목록을 무한 스크롤로 잇는다
 *
 * `useBookmarkList` 는 keyset 커서다(D10, OFFSET 금지). 화면은 `onEndReached` 로만
 * 다음 페이지를 부르고, 중복 제거는 훅이 이미 `restaurantId` 기준으로 한다.
 */

import { useCallback } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
// 리사이클링 리스트 — 무한 피드는 FlatList 대신 FlashList(v2, 추정치 불필요)
import { FlashList } from "@shopify/flash-list"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import {
  V2Divider,
  V2EmptyState,
  V2ErrorState,
  V2ScreenHeader,
  spacing,
  useV2Theme,
} from "@/src/design-system-v2"

import type { BookmarkCardDto } from "../types"
import { useBookmarkList } from "../hooks/useBookmarkList"
import { RestaurantCard } from "../components/RestaurantCard"
import {
  RESTAURANT_SKELETON_COUNT,
  RestaurantCardSkeleton,
} from "../components/RestaurantCardSkeleton"

export interface RestaurantBookmarksScreenProps {
  onBack: () => void
  onSelectRestaurant: (restaurantId: number) => void
  style?: ViewStyle
}

export function RestaurantBookmarksScreen({
  onBack,
  onSelectRestaurant,
  style,
}: RestaurantBookmarksScreenProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const list = useBookmarkList()

  // 저장한 곳 응답은 `RestaurantCardDto` 가 아니라 더 얇은 `BookmarkCardDto` 다
  // (`safety` 없음 / `bookmarkedAt` 있음). 카드가 유니온을 받으므로 그대로 넘긴다 —
  // 예전에는 두 응답을 같은 타입으로 선언해 두어 없는 필드를 읽고 있었다.
  const keyExtractor = useCallback(
    (item: BookmarkCardDto) => String(item.restaurantId),
    [],
  )

  const renderItem = useCallback(
    ({ item }: { item: BookmarkCardDto }) => (
      <RestaurantCard
        card={item}
        onPress={() => onSelectRestaurant(item.restaurantId)}
      />
    ),
    [onSelectRestaurant],
  )

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background.default },
        style,
      ]}
    >
      <V2ScreenHeader
        title={t("restaurant.bookmark.listTitle")}
        onBack={onBack}
        safeAreaTop
      />
      <V2Divider tone="alternative" />
      <FlashList
        data={list.items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          list.isLoading ? (
            <SkeletonList />
          ) : list.isError ? (
            <View style={styles.state}>
              <V2ErrorState
                title={t("restaurant.error.listTitle")}
                description={t("restaurant.error.listBody")}
                retryLabel={t("restaurant.error.listRetry")}
                onRetry={list.refetch}
              />
            </View>
          ) : (
            <View style={styles.state}>
              <V2EmptyState
                icon="bookmark"
                title={t("restaurant.empty.bookmarkTitle")}
                description={t("restaurant.empty.bookmarkBody")}
              />
            </View>
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? <RestaurantCardSkeleton /> : undefined
        }
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          paddingTop: spacing[8],
          paddingBottom: insets.bottom + spacing[24],
        }}
      />
    </View>
  )
}

function Separator() {
  return <V2Divider tone="alternative" />
}

function SkeletonList() {
  return (
    <View>
      {Array.from({ length: RESTAURANT_SKELETON_COUNT }, (_, index) => (
        <RestaurantCardSkeleton key={index} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  state: { paddingTop: spacing[32] },
})
