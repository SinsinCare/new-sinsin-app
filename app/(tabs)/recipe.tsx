/**
 * 레시피 목록 화면 v2 (계약 docs/contract/recipe-v2.md §6.1 / §6.3).
 *
 * 시안(`아카이브 5.zip`)에서 고친 것 — 전부 "사용자가 결과를 예측할 수 없다" 는 한 문제였다.
 *
 *  1. **검색이 아무것도 하지 않았다.** `Typing.png` 와 `Typed.png` 가 완전히 동일하다.
 *     "밥" 을 입력해도 아래는 그대로 "오늘의 아침 추천메뉴" 였다.
 *     → 입력 즉시 자동완성(400ms 디바운스) → 확정하면 결과 목록. **결과 수를 먼저** 말한다.
 *  2. **필터가 3곳에 흩어져 있었다**(상단 칩 · 카테고리 아이콘 캐러셀 · 우측 필터 아이콘 →
 *     시트에 또 같은 3그룹). 어떤 게 적용 중인지 알 수 없었다.
 *     → 시트는 고르는 곳 하나, 적용된 것은 상단 칩에서 보고 거기서 뺀다. 캐러셀은 없앴다.
 *  3. 카드의 `#CKD3` `#저염식` 을 지우고(§1.2) 그 자리에 **영양 수치 1개 + 내 참고량 대비**
 *     를 넣었다. 데이터 없이 그려져 있던 `★4.0 (27)` 은 실제 별점이고 0건이면 안 그린다.
 *  4. "레시피 작성" 플로팅이 카드를 가리고 AI 상담 필과 같은 자리에 쌓여 있었다.
 *     → 스크롤을 내리면 접히고, 좌표 산술을 `RecipeWriteFab` 에 못 박아 겹치지 않는다.
 *  5. 정렬을 붙였다 — `추천 | 최신 | 별점 | 저장많은 | 빨리되는`. `빨리되는` 은 시안에 없지만
 *     "지금 뭐 먹지" 의 실제 질의다.
 *
 * 색: 강조는 `tokens.color.primary` 하나. `safe*`(틸)는 "안전" 의미색이라 쓰지 않는다(§6.4).
 */
import { useRouter } from "expo-router"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import { Text, View, XStack, YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"

import {
  AppliedFilterRow,
  EMPTY_RECIPE_FILTERS,
  hasEstimatedNutrition,
  listAppliedRecipeFilters,
  nextFabCollapsed,
  RECIPE_LIST_BOTTOM_SPACER,
  RecipeFilterSheet,
  RecipeListCard,
  RecipeSearchField,
  RecipeSortRow,
  RecipeSuggestPanel,
  RecipeWriteFab,
  removeRecipeFilter,
  countRecipeFilters,
  type RecipeFilterGroupKey,
  type RecipeFilterSelection,
} from "@/src/features/recipe/components/list"
import { useRecipeListV2 } from "@/src/features/recipe/hooks/useRecipeListV2"
import { useRecipeSearch } from "@/src/features/recipe/hooks/useRecipeSearch"
import type {
  RecipeCard,
  RecipeSortKey,
} from "@/src/features/recipe/types/recipeListV2"

export default function RecipeScreen() {
  const router = useRouter()
  const { t } = useTranslation("common")
  const { t: tr } = useTranslation("recipe")
  const insets = useSafeAreaInsets()
  const surface = useSurface()

  const [filters, setFilters] =
    useState<RecipeFilterSelection>(EMPTY_RECIPE_FILTERS)
  const [sort, setSort] = useState<RecipeSortKey>("recommended")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [fabCollapsed, setFabCollapsed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const lastOffsetRef = useRef(0)

  const search = useRecipeSearch()
  const list = useRecipeListV2({
    query: search.committedQuery,
    filters,
    sort,
  })

  const applied = useMemo(() => listAppliedRecipeFilters(filters), [filters])
  const appliedCount = useMemo(() => countRecipeFilters(filters), [filters])
  const showEstimateNotice = useMemo(
    () => hasEstimatedNutrition(list.items),
    [list.items],
  )

  /** 결과 수를 말할 상황인가 — 검색했거나 필터를 걸었을 때만(그냥 둘러볼 때 개수는 소음이다). */
  const showResultCount =
    (search.isSearching || appliedCount > 0) && !list.isLoading && !list.isError
  const resultCountText =
    list.resultCount.kind === "atLeast"
      ? tr("list.resultCountAtLeast", { count: list.resultCount.count })
      : tr("feed.results", { count: list.resultCount.count })

  /**
   * 검색 확정. 키보드를 같이 내린다 — 결과 목록이 뜨는데 키보드가 절반을 덮고 있으면
   * "결과 수를 먼저 보여준다"(§6.1)가 무의미하다.
   */
  const handleCommitSearch = useCallback(
    (text?: string) => {
      search.commit(text)
      Keyboard.dismiss()
    },
    [search],
  )

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y
      const next = nextFabCollapsed({
        collapsed: fabCollapsed,
        offsetY,
        lastOffsetY: lastOffsetRef.current,
      })
      // 방향이 바뀐 프레임에서만 상태를 바꾼다 — 매 프레임 setState 하면 목록이 끊긴다.
      if (Math.abs(offsetY - lastOffsetRef.current) > 4) {
        lastOffsetRef.current = offsetY
      }
      if (next !== fabCollapsed) setFabCollapsed(next)
    },
    [fabCollapsed],
  )

  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await list.refetch()
    } finally {
      setRefreshing(false)
    }
  }, [list, refreshing])

  const handleRemoveFilter = useCallback(
    (group: RecipeFilterGroupKey, optionKey: string) => {
      setFilters((prev) => removeRecipeFilter(prev, group, optionKey))
    },
    [],
  )

  /**
   * v2 상세는 **전체 화면**이다(`app/recipe/[id]`). 옛 v1 은 바텀시트였는데,
   * 상세에 재료 체크·인분 조절·조리 단계·리뷰가 들어가면서 시트로는 담기지 않는다.
   * 시트는 스크롤이 두 겹(시트 안 + 화면)이 되어 조리 중에 한 손으로 쓰기 어렵다.
   */
  const handleOpenRecipe = useCallback(
    (card: RecipeCard) => {
      router.push(`/recipe/${card.id}`)
    },
    [router],
  )

  const renderItem = useCallback(
    ({ item }: { item: RecipeCard }) => (
      <View paddingHorizontal={LAYOUT.screenX} paddingBottom={12}>
        <RecipeListCard card={item} onPress={handleOpenRecipe} />
      </View>
    ),
    [handleOpenRecipe],
  )

  const keyExtractor = useCallback((item: RecipeCard) => String(item.id), [])

  return (
    <YStack flex={1} backgroundColor={surface.canvas} paddingTop={insets.top}>
      <YStack paddingHorizontal={LAYOUT.screenX} paddingTop={12} gap={14}>
        <XStack alignItems="center" justifyContent="space-between" gap={12}>
          <Text
            fontFamily="$body"
            fontSize={22}
            lineHeight={30}
            fontWeight="700"
            color={surface.textStrong}
          >
            {t("recipe.title")}
          </Text>

          {/*
            보관함 진입점. 이것이 없어서 `app/recipe/saved.tsx` · `recent.tsx` 와
            `RecipeArchiveScreen` 전체가 **어떤 화면에서도 도달할 수 없었다** — 딥링크로만
            열리는 화면이었다.

            아이콘이 아니라 글자다(§6.4 "누른 결과를 예측할 수 있어야 한다"). 북마크
            아이콘을 쓰면 이 자리에서 "저장한다" 인지 "저장한 것을 본다" 인지 알 수 없고,
            카드의 북마크와 같은 모양이라 더 헷갈린다.

            강조색을 쓰지 않는다 — 이 화면의 프라이머리는 "레시피 쓰기" 하나다.
          */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("archive.title")}
            onPress={() => router.push("/recipe/saved")}
            hitSlop={10}
          >
            <Text
              fontFamily="$body"
              fontSize={14}
              lineHeight={20}
              letterSpacing={-0.28}
              fontWeight="600"
              color={surface.text}
            >
              {tr("archive.entry")}
            </Text>
          </Pressable>
        </XStack>

        <RecipeSearchField
          value={search.draft}
          onChangeText={search.setDraft}
          onSubmit={() => handleCommitSearch()}
          onClear={search.clear}
          onFocus={search.focus}
          onBlur={search.blur}
          onOpenFilters={() => setFilterSheetOpen(true)}
          appliedFilterCount={appliedCount}
        />
      </YStack>

      {search.showSuggestions ? (
        <RecipeSuggestPanel
          draft={search.draft}
          suggestions={search.suggestions}
          isSuggesting={search.isSuggesting}
          onSelect={(text) => handleCommitSearch(text)}
        />
      ) : (
        <>
          <YStack paddingTop={12} gap={10}>
            {applied.length > 0 && (
              <YStack paddingHorizontal={LAYOUT.screenX}>
                <AppliedFilterRow
                  applied={applied}
                  onRemove={handleRemoveFilter}
                  onClearAll={() => setFilters(EMPTY_RECIPE_FILTERS)}
                />
              </YStack>
            )}

            <YStack paddingHorizontal={LAYOUT.screenX}>
              <RecipeSortRow sort={sort} onChange={setSort} />
            </YStack>

            {(showResultCount || showEstimateNotice) && (
              <XStack
                paddingHorizontal={LAYOUT.screenX}
                alignItems="center"
                justifyContent="space-between"
                gap={12}
              >
                <Text
                  fontFamily="$body"
                  fontSize={TYPE.caption.fontSize}
                  lineHeight={TYPE.caption.lineHeight}
                  letterSpacing={TYPE.caption.letterSpacing}
                  fontWeight="600"
                  color={surface.text}
                  numberOfLines={1}
                >
                  {showResultCount ? resultCountText : ""}
                </Text>
                {/* provenance 를 카드마다 배지로 쌓지 않고 목록에 한 번만 알린다(§6.4). */}
                {showEstimateNotice && (
                  <Text
                    fontFamily="$body"
                    fontSize={11.5}
                    lineHeight={16}
                    color={surface.textWeak}
                    numberOfLines={1}
                  >
                    {tr("curated.estimatedBadge")}
                  </Text>
                )}
              </XStack>
            )}
          </YStack>

          <FlatList
            data={list.items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: 12 }}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={7}
            removeClippedSubviews
            onEndReached={list.loadMore}
            onEndReachedThreshold={0.6}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={tokens.color.primary.val}
                colors={[tokens.color.primary.val]}
                progressBackgroundColor={surface.card}
              />
            }
            ListEmptyComponent={
              list.isLoading ? (
                <YStack paddingVertical={48} alignItems="center">
                  <ActivityIndicator color={tokens.color.primary.val} />
                </YStack>
              ) : list.isError ? (
                <YStack
                  paddingVertical={40}
                  paddingHorizontal={LAYOUT.screenX}
                  alignItems="center"
                  gap={6}
                >
                  <Text
                    fontFamily="$body"
                    fontSize={15}
                    lineHeight={21}
                    fontWeight="600"
                    color={surface.textStrong}
                  >
                    {tr("list.errorTitle")}
                  </Text>
                  <Text
                    fontFamily="$body"
                    fontSize={13}
                    lineHeight={19}
                    color={surface.textMuted}
                    textAlign="center"
                  >
                    {tr("list.errorBody")}
                  </Text>
                  <Pressable
                    onPress={() => void list.refetch()}
                    accessibilityRole="button"
                    accessibilityLabel={tr("list.retry")}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      marginTop: 8,
                    })}
                  >
                    <Text
                      fontFamily="$body"
                      fontSize={14}
                      lineHeight={20}
                      fontWeight="700"
                      color={tokens.color.primary.val}
                    >
                      {tr("list.retry")}
                    </Text>
                  </Pressable>
                </YStack>
              ) : (
                <YStack
                  paddingVertical={40}
                  paddingHorizontal={LAYOUT.screenX}
                  alignItems="center"
                  gap={6}
                >
                  <Text
                    fontFamily="$body"
                    fontSize={15}
                    lineHeight={21}
                    fontWeight="600"
                    color={surface.textStrong}
                  >
                    {search.isSearching
                      ? tr("feed.noResultsTitle")
                      : tr("list.emptyTitle")}
                  </Text>
                  <Text
                    fontFamily="$body"
                    fontSize={13}
                    lineHeight={19}
                    color={surface.textMuted}
                    textAlign="center"
                  >
                    {search.isSearching
                      ? tr("feed.noResultsBody")
                      : tr("list.emptyBody")}
                  </Text>
                </YStack>
              )
            }
            ListFooterComponent={
              list.isFetchingNextPage ? (
                <YStack paddingVertical={18} alignItems="center">
                  <ActivityIndicator color={tokens.color.primary.val} />
                </YStack>
              ) : (
                // 두 플로팅(작성 + AI 상담)이 마지막 카드를 영구히 가리지 않게 비운다.
                <View height={RECIPE_LIST_BOTTOM_SPACER} />
              )
            }
          />
        </>
      )}

      <RecipeFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        selection={filters}
        onApply={setFilters}
      />


      {/* 자동완성 패널이 떠 있을 때는 감춘다 — 키보드 위에 뜬 버튼이 제안 목록을 가린다. */}
      {!search.showSuggestions && (
        <RecipeWriteFab
          label={t("recipe.write")}
          collapsed={fabCollapsed}
          /*
            v2 작성 폼(`app/(write)/recipe/new.tsx` → `RecipeWriteForm`)으로 보낸다.
            이 버튼은 v1 `RecipeEditor` 모달을 열고 있었다 — 재료를 입력하면 나트륨·칼륨이
            실시간으로 계산되는 v2 폼은 **어느 화면에서도 열리지 않았다.** 라우트는
            있었지만 아무도 가리키지 않았다.

            모달이 아니라 화면 전환이다. 작성은 사진·재료·조리 단계로 여러 단계를 오가고,
            모달 안에서 또 시트를 띄우면 뒤로 가기가 무엇을 닫는지 예측할 수 없다.
          */
          onPress={() => router.push("/(write)/recipe/new")}
        />
      )}
    </YStack>
  )
}
