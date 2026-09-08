import { useAvailableRestaurantSort } from "../hooks/useAvailableRestaurantSort"
import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 리스트 전용 모드 (목업 -8 / -21). 지도가 없는 결과 화면.
 * 헤더(검색 필드 모양의 회색 바 + ‹ + 쿼리) → 카테고리 칩 행 → 필터/정렬 칩 행 →
 * 구분선 → 카드 목록.
 *
 * ## 왜 지도 화면과 별도 화면인가
 *
 * 카테고리 칩이나 검색어로 들어온 결과는 "이 뷰포트" 가 아니라 "이 조건" 이 범위다.
 * 지도 화면 안에서 시트를 끝까지 올리는 것으로 대신하면 뷰포트 필터가 계속 걸려 있어
 * 사용자가 고른 `한식` 이 지도를 옮길 때마다 결과가 달라진다. 그래서 `bounds` 를 넘기지
 * 않고(`useRestaurantList` 의 `bounds: null`) 조건만으로 찾는다.
 *
 * ## 0건을 오류로 뭉개지 않는다
 *
 * 시드 데이터가 강남 한 블록(376곳)뿐이고 `저당`·`샐러드` 칩은 오늘 무조건 0건이다.
 * `emptyReason` 세 값을 각각 다르게 그리고, 그중 "고른 조건에 데이터가 아직 없는" 경우에는
 * `hasUnbackedSelection()` 로 한 줄을 덧붙인다. 전부 "오류" 로 보이면 사용자는 앱이
 * 고장 난 줄 알고, 전부 "데이터 없음" 으로 보이면 필터를 되돌릴 생각을 못 한다.
 *
 * ## 가상화한다
 *
 * 프로토타입의 `PlaceSheet` 는 모든 식당을 `.map()` 으로 펼치고 각 행이 사진 5장짜리
 * 가로 ScrollView 를 물고 있었다. 카드 20개면 이미지 100장이 동시에 마운트된다.
 * 여기서는 `FlatList` 가 창 밖 카드를 떼어 낸다.
 */

import type { RestaurantCardTarget } from "../utils/restaurantCardNavigation"
import { useCallback, useMemo, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
// 리사이클링 리스트 — 무한 피드는 FlatList 대신 FlashList(v2, 추정치 불필요)
import { FlashList } from "@shopify/flash-list"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import {
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
  V2Divider,
  V2ErrorState,
  V2EmptyState,
  V2Icon,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import { CategoryChipRail } from "../components/CategoryChipRail"
import { FilterChipRow } from "../components/FilterChipRow"
import { FilterSheet, type FilterSection } from "../components/FilterSheet"
import { RestaurantCard } from "../components/RestaurantCard"
import {
  RestaurantCardSkeleton,
  RestaurantCardSkeletonList,
} from "../components/RestaurantCardSkeleton"
// 실패 문구 표는 `utils/fetchError` 하나뿐이다 — 여기 복사하면 이 화면에서만 400 이
// 다시 "인터넷 확인" 으로 보인다(그 오분류가 이번에 고친 결함이다).
import { failureSpec } from "../utils/fetchError"
import { AiSearchSheet } from "../components/AiSearchSheet"
import {
  cuisineTypeLabelKey,
  hasUnbackedSelection,
} from "../data/filterCatalog"
import { useMyLocation } from "../hooks/useMyLocation"
import { useRestaurantFilters } from "../hooks/useRestaurantFilters"
import { useRestaurantList } from "../hooks/useRestaurantList"
import type { FilterState, RestaurantCardDto } from "../types"

import { GUTTER } from "../layout"

export interface RestaurantListScreenProps {
  /** 진입 조건. 검색어로 들어왔으면 `query`, 칩으로 들어왔으면 `cuisineTypes` 가 채워진다. */

  initialFilters?: Partial<FilterState>
  onBack: () => void
  /** 헤더의 검색 필드 탭 — 검색 화면으로 되돌아간다. */
  onPressSearchField: () => void
  onSelectRestaurant: (
    restaurantId: number,
    target: RestaurantCardTarget,
  ) => void
}

/** 목업 -8 의 헤더 필드 높이. `controlHeight.lg`(48)와 같은 값이라 토큰을 쓴다. */
const HEADER_FIELD_HEIGHT = 48

export function RestaurantListScreen({
  initialFilters,
  onBack,
  onPressSearchField,
  onSelectRestaurant,
}: RestaurantListScreenProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

  const filters = useRestaurantFilters(initialFilters)
  const location = useMyLocation()

  const [aiOpen, setAiOpen] = useState(false)
  const [filterSection, setFilterSection] = useState<FilterSection | null>(null)

  /* 좌표가 없으면(커버리지 밖도 위치 없음으로 접힌다 — `useMyLocation` 머리말) `거리순` 은
     서버가 계산할 근거가 없다. 정렬을 조용히 기본값으로 되돌린다 —
     막아 두기만 하면 이미 고른 상태로 들어온 사용자가 영영 아무 정렬도 못 받는다. */
  const sanitize = filters.sanitizeSortForLocation
  const hasCoords = location.coords !== null
  useAvailableRestaurantSort(filters.filters.sort, hasCoords, sanitize)

  const list = useRestaurantList({
    filters: filters.filters,
    userLocation: location.coords,
    // 리스트 전용 모드는 뷰포트로 좁히지 않는다(위 헤더 참고).
    bounds: null,
  })

  /** 헤더에 보이는 글자. 검색어가 있으면 그것, 없으면 고른 카테고리, 둘 다 없으면 안내문. */
  const headerLabel = useMemo(() => {
    const query = filters.filters.query.trim()
    if (query) return query
    const [first] = filters.filters.cuisineTypes
    if (first && filters.filters.cuisineTypes.length === 1) {
      return t(dynamicKey(cuisineTypeLabelKey(first)))
    }
    return t("restaurant.map.searchPlaceholder")
  }, [filters.filters.query, filters.filters.cuisineTypes, t])

  const renderItem = useCallback(
    ({ item }: { item: RestaurantCardDto }) => (
      <RestaurantCard
        card={item}
        onPress={(target) => onSelectRestaurant(item.restaurantId, target)}
      />
    ),
    [onSelectRestaurant],
  )

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background.default, paddingTop: insets.top },
      ]}
    >
      {/* 목업 -8: 검색바가 아니라 **검색바 모양의 회색 필드**다. 안에 ‹ 와 쿼리가 같이 있다.
          면은 `fill.control` — 이 줄이 앉는 바닥이 `background.default`(라이트는 흰색)라
          `fill.normal`(흰 면 위 ΔL* 3.79)로는 "회색 필드" 라는 말 자체가 성립하지 않는다.
          커뮤니티 피드의 같은 입구와 같은 판정이다(`tokens/colors.ts` §fill.control). */}
      <View
        style={[styles.headerField, { backgroundColor: colors.fill.control }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressedRow,
          ]}
        >
          <V2Icon name="chevronLeft" size="md" color={colors.label.normal} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("restaurant.list.headerAccessibility")}
          onPress={onPressSearchField}
          style={({ pressed }) => [
            styles.searchButton,
            pressed && styles.pressedRow,
          ]}
        >
          <Text
            style={[
              typography.label.mediumWeak,
              styles.headerLabel,
              { color: colors.label.normal },
            ]}
            numberOfLines={1}
          >
            {headerLabel}
          </Text>
        </Pressable>
      </View>

      <CategoryChipRail
        selectedTypes={filters.filters.cuisineTypes}
        onToggle={filters.toggleRailCuisine}
        onPressAiSearch={() => setAiOpen(true)}
        insetHorizontal={spacing[16]}
        style={styles.rail}
      />

      <FilterChipRow
        sort={filters.filters.sort}
        axes={filters.axes}
        onPressSort={() => setFilterSection("sort")}
        onPressAxis={setFilterSection}
        style={styles.chipRow}
      />

      <V2Divider />

      <FlashList
        data={list.items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        // FlashList v2는 chat용 visible-position 유지가 기본이다. 빈 목록에서 첫 페이지가
        // 붙을 때 그 위치를 보존하면 상단에 수백 pt spacer가 남는다. 검색 결과는 항상
        // 첫 카드가 헤더 바로 아래에서 시작해야 하므로 끈다.
        maintainVisibleContentPosition={{ disabled: true }}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing[24] },
        ]}
        ListEmptyComponent={
          <ListEmpty
            isLoading={list.isLoading}
            emptyReason={list.emptyReason}
            filters={filters.filters}
            onResetFilters={filters.resetAll}
            onRetry={list.refetch}
          />
        }
        ListFooterComponent={
          list.isFetchingNextPage ? <RestaurantCardSkeleton /> : null
        }
      />

      <FilterSheet
        distanceDisabledReason={location.distanceSortDisabledReason}
        visible={filterSection !== null}
        onClose={() => setFilterSection(null)}
        filters={filters}
        initialSection={filterSection ?? undefined}
      />

      <AiSearchSheet
        visible={aiOpen}
        onClose={() => setAiOpen(false)}
        userLocation={location.coords}
        onApply={filters.applyAiFilters}
      />
    </View>
  )
}

function keyExtractor(item: RestaurantCardDto): string {
  return String(item.restaurantId)
}

function Separator() {
  return <V2Divider inset={spacing[16]} />
}

/**
 * 0건 화면. `emptyReason` 세 값이 각각 다른 글과 다른 행동을 받는다.
 * `NO_DATA_HERE` 에는 행동을 주지 않는다 — 리스트 모드에는 넓힐 지도가 없고,
 * 있는 것처럼 버튼을 주면 눌러도 아무 일이 없다.
 */
function ListEmpty({
  isLoading,
  emptyReason,
  filters,
  onResetFilters,
  onRetry,
}: {
  isLoading: boolean
  emptyReason: RestaurantListEmptyReason
  filters: FilterState
  onResetFilters: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation("common")

  // 첫 조회는 카드 모양으로 기다린다 — 링은 몇 장이 올지 말해 주지 않아
  // 도착 순간 목록 전체가 밀려 올라온다.
  if (isLoading) {
    return <RestaurantCardSkeletonList />
  }
  if (emptyReason === null) return null

  /*
   * 실패 네 갈래(통신·5xx·400·모양 불일치)를 각각 다른 문구로 그린다. 문구 표는
   * `MapEmptyState` 에 하나만 있고 여기서 그걸 읽는다 — 복사하면 갈래를 더할 때 한쪽만
   * 고쳐지고, 이 화면에서만 400 이 "인터넷 확인" 으로 돌아간다.
   */
  const failure = failureSpec(emptyReason)
  if (failure) {
    return (
      <V2ErrorState
        surface="restaurant_list"
        title={t(dynamicKey(failure.titleKey))}
        description={t(dynamicKey(failure.bodyKey))}
        onRetry={onRetry}
        retryLabel={t(dynamicKey(failure.retryKey))}
      />
    )
  }

  if (emptyReason === "FILTERED_TO_ZERO") {
    // 오늘 데이터로는 결과가 나올 수 없는 칩(`저당`·`샐러드`)을 고른 상태라면 그 사실을
    // 덧붙인다. "조건을 줄여 보세요" 만으로는 어떤 조건이 문제인지 알 수 없다.
    const unbacked = hasUnbackedSelection({
      nutritionTags: filters.nutritionTags,
      cuisineTypes: filters.cuisineTypes,
    })
    return (
      <V2EmptyState
        surface="restaurant_list"
        title={t("restaurant.empty.filteredTitle")}
        description={
          unbacked
            ? `${t("restaurant.empty.filteredBody")}\n${t("restaurant.filter.unbackedNotice")}`
            : t("restaurant.empty.filteredBody")
        }
        actionLabel={t("restaurant.empty.filteredAction")}
        onAction={onResetFilters}
      />
    )
  }

  return (
    <V2EmptyState
      surface="restaurant_list"
      title={t("restaurant.empty.noDataHereTitle")}
      description={t("restaurant.empty.noDataHereBody")}
    />
  )
}

type RestaurantListEmptyReason = ReturnType<
  typeof useRestaurantList
>["emptyReason"]

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerField: {
    flexDirection: "row",
    alignItems: "center",
    height: HEADER_FIELD_HEIGHT,
    marginHorizontal: GUTTER,
    marginTop: spacing[8],
    paddingRight: spacing[12],
    borderRadius: radius.lg,
  },
  backButton: {
    width: touchTarget.min,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  searchButton: { flex: 1, alignSelf: "stretch", justifyContent: "center" },
  headerLabel: { flexShrink: 1 },
  rail: { marginTop: spacing[12] },
  chipRow: { marginTop: spacing[8], marginBottom: spacing[12] },
  listContent: { paddingTop: spacing[8] },
  pressedRow: { opacity: 0.6 },
})
