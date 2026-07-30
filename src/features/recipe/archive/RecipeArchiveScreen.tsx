/**
 * 레시피 보관함 — 저장한 레시피 · 최근 본 기록
 * (계약 §2 `/recipes/saved`, `/recipes/views/recent`.
 *  시안 `Home_Recipes_Saved*.png` · `Home_Recipes_records*.png`)
 *
 * 두 라우트(`app/recipe/saved.tsx`, `app/recipe/recent.tsx`)가 이 컴포넌트 하나를 그린다.
 * 시안대로 두 탭을 **한 화면에서** 전환하되, 전환은 라우팅이 아니라 로컬 상태다 —
 * `router.replace` 로 갈면 걸어 둔 검색어와 필터가 매번 초기화돼 "탭을 눌렀는데 내 조건이
 * 사라지는" 예측 불가 동작이 된다(계약 §6.4). 딥링크로 들어오면 라우트가 시작 탭을 정한다.
 *
 * **재사용.** 목록 담당이 만든 것을 그대로 쓴다 — 카드(`RecipeListCard`), 검색+필터 버튼
 * (`RecipeSearchField`), 적용 칩(`AppliedFilterRow`), 필터 시트(`RecipeFilterSheet`),
 * 필터 모델, 결과 수 판단(`resolveResultCount`). 보관함이 자기 카드·자기 필터를 따로
 * 가지면 같은 레시피가 두 화면에서 다르게 보이고, 같은 칩이 서로 다른 값을 서버로 보낸다
 * (계약 §6.1 "필터는 한 곳"). 색·타이포도 목록 화면과 같은 surface 시스템을 쓴다.
 *
 * 시안에서 고친 것:
 *  - 필터를 여는 곳은 검색창 오른쪽 하나다. 카테고리 캐러셀을 두지 않았다.
 *  - 적용된 필터는 항상 칩으로 보이고 거기서 뺀다.
 *  - 검색이 실제로 결과를 바꾸고, 목록보다 **먼저** 결과 수를 말한다. 서버가 총계를
 *    안 주면 "N개 이상" 으로 내려간다(받은 개수를 전체인 척 말하지 않는다).
 *  - 시안의 상단 우측 북마크 아이콘을 없앴다 — 저장 화면에서 "저장" 아이콘이 또 있으면
 *    무엇에 대한 저장인지 알 수 없다.
 *  - 카드의 북마크를 **글자 있는 줄**로 바꿨다. 저장 해제는 내 보관함에서 항목을 빼는
 *    동작인데, 라벨 없는 아이콘이면 누른 결과를 예측할 수 없다(§6.4). 해제한 뒤에는
 *    라벨이 "다시 저장" 이 되어 되돌리는 방법이 그 자리에 보인다.
 *
 * 저장 해제(계약 §2.1): 낙관 갱신 + `PUT` 절대 상태. **반전 뒤 재조회하지 않는다.**
 * 해제한 행을 즉시 지우지도 않는다 — 지우면 손가락 아래에서 목록이 튀고 되돌릴 방법이
 * 사라진다. 새로고침에서 빠진다.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { ActivityIndicator, FlatList, Keyboard, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useRouter, type Href } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text, View, XStack, YStack } from "tamagui"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"

import {
  AppliedFilterRow,
  EMPTY_RECIPE_FILTERS,
  RecipeFilterSheet,
  RecipeListCard,
  RecipeSearchField,
  countRecipeFilters,
  listAppliedRecipeFilters,
  removeRecipeFilter,
  type RecipeFilterGroupKey,
  type RecipeFilterSelection,
} from "../components/list"
import { useRecentRecipes } from "../hooks/useRecentRecipes"
import { useSavedRecipes } from "../hooks/useSavedRecipes"
import type { RecipeCard } from "../types/recipeListV2"

import type { UseRecipeArchiveListResult } from "./useRecipeArchiveList"

export type RecipeArchiveTab = "saved" | "recent"

const TABS: readonly RecipeArchiveTab[] = ["saved", "recent"]

/** 입력이 멎은 뒤 한 번만 조회한다. 한 글자마다 나가면 목록이 계속 흔들린다. */
const SEARCH_DEBOUNCE_MS = 300

export interface RecipeArchiveScreenProps {
  /** 라우트가 정하는 시작 탭. */
  initialTab: RecipeArchiveTab
}

export function RecipeArchiveScreen({ initialTab }: RecipeArchiveScreenProps) {
  const { t } = useTranslation("recipe")
  const { t: tc } = useTranslation("common")
  const surface = useSurface()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [tab, setTab] = useState<RecipeArchiveTab>(initialTab)
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
  const [filters, setFilters] =
    useState<RecipeFilterSelection>(EMPTY_RECIPE_FILTERS)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setQuery(draft.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft])

  // 훅은 조건부로 부를 수 없다. 보이지 않는 탭은 `enabled: false` 로 재워 둔다 —
  // 그러면 탭을 처음 누를 때만 요청이 나가고 두 번째부터는 캐시가 즉시 답한다.
  const saved = useSavedRecipes({
    q: query,
    filter: filters,
    enabled: tab === "saved",
  })
  const recent = useRecentRecipes({
    q: query,
    filter: filters,
    enabled: tab === "recent",
  })
  const active: UseRecipeArchiveListResult = tab === "saved" ? saved : recent

  const applied = useMemo(() => listAppliedRecipeFilters(filters), [filters])
  const appliedCount = useMemo(() => countRecipeFilters(filters), [filters])
  const isNarrowed = appliedCount > 0 || query.length > 0

  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await active.refresh()
    } finally {
      setRefreshing(false)
    }
  }, [active, refreshing])

  const handleRemoveFilter = useCallback(
    (group: RecipeFilterGroupKey, optionKey: string) => {
      setFilters((prev) => removeRecipeFilter(prev, group, optionKey))
    },
    [],
  )

  /**
   * 검색창의 X 버튼. **검색어만** 지운다.
   *
   * 여기에 필터까지 지우는 함수를 걸었더니 버튼 라벨("검색어 지우기")과 하는 일이
   * 달라졌다 — 칩 3개를 걸어 둔 사용자가 X 를 누르면 칩이 말없이 사라진다. 계약
   * §6.1 은 "적용된 필터는 항상 칩으로 보이고 **거기서** 뺀다" 이고 §6.4 는 "누르기
   * 전에 무엇이 일어날지 보인다" 다. 목록 화면의 같은 컴포넌트도 검색어만 지운다
   * (`useRecipeSearch.clear` — draft/debounced/committed 셋만 건드린다).
   */
  const clearSearchOnly = useCallback(() => {
    setDraft("")
    setQuery("")
  }, [])

  /** 좁힘 전체 해제. "전체 해제"/"필터 지우기" 라고 적힌 자리에서만 쓴다. */
  const clearNarrowing = useCallback(() => {
    setDraft("")
    setQuery("")
    setFilters(EMPTY_RECIPE_FILTERS)
  }, [])

  const goToRecipeList = useCallback(() => {
    // `/recipe` 는 탭의 목록 화면(`app/(tabs)/recipe.tsx`)이다. `navigate` 는 이미
    // 스택에 있으면 그리로 돌아가고 없으면 밀어 넣는다.
    router.navigate("/recipe" as Href)
  }, [router])

  /** 저장 상태 줄의 라벨. 해제한 직후에는 되돌리는 말이 그 자리에 있어야 한다. */
  const saveActionLabel = useCallback(
    (card: RecipeCard) => {
      if (card.saved) return t("archive.unsaveAction")
      return tab === "saved"
        ? t("archive.resaveAction")
        : t("archive.saveAction")
    },
    [t, tab],
  )

  // 훅이 돌려주는 `active` 는 매 렌더 새 객체다. 그걸 의존성에 두면 `renderItem` 이
  // 매 렌더 새 함수가 되어 검색어 한 글자마다 보이는 카드 전부가 다시 그려진다.
  // 실제로 쓰는 함수 하나만 집는다(`setSaved` 는 위 훅에서 안정화해 뒀다).
  const setSavedOnActive = active.setSaved

  const renderItem = useCallback(
    ({ item }: { item: RecipeCard }) => (
      <YStack paddingHorizontal={LAYOUT.screenX} paddingBottom={12} gap={6}>
        <RecipeListCard
          card={item}
          onPress={(card) => router.push(`/recipe/${card.id}` as Href)}
        />
        <XStack justifyContent="flex-end">
          <Pressable
            onPress={() => setSavedOnActive(item.id, !item.saved)}
            accessibilityRole="button"
            accessibilityState={{ selected: item.saved }}
            accessibilityLabel={saveActionLabel(item)}
            hitSlop={10}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons
              name={item.saved ? "bookmark" : "bookmark-outline"}
              size={15}
              // 강조는 프라이머리 하나. safe*(틸)는 "안전" 의미색이라 쓰지 않는다(§6.4).
              color={item.saved ? tokens.color.primary.val : surface.textMuted}
            />
            <Text
              fontFamily="$body"
              fontSize={TYPE.label.fontSize}
              lineHeight={TYPE.label.lineHeight}
              letterSpacing={TYPE.label.letterSpacing}
              fontWeight="600"
              color={item.saved ? tokens.color.primary.val : surface.textMuted}
            >
              {saveActionLabel(item)}
            </Text>
          </Pressable>
        </XStack>
      </YStack>
    ),
    [setSavedOnActive, router, saveActionLabel, surface.textMuted],
  )

  const keyExtractor = useCallback((item: RecipeCard) => String(item.id), [])

  /** 결과 수. 좁혔을 때는 "결과 N개", 그냥 볼 때는 보관함 전체 개수를 말한다. */
  const countText = useMemo(() => {
    const { kind, count } = active.resultCount
    if (isNarrowed) {
      return kind === "atLeast"
        ? t("list.resultCountAtLeast", { count })
        : t("feed.results", { count })
    }
    return tab === "saved"
      ? t("archive.savedCount", { count })
      : t("archive.recentCount", { count })
  }, [active.resultCount, isNarrowed, t, tab])

  /**
   * 저장을 푼 행이 아직 목록에 남아 있는가. 남아 있을 때만 그 이유를 말한다 —
   * 타이머로 잠깐 띄우면 사용자가 놓친 뒤에는 왜 남아 있는지 알 수 없다.
   */
  const hasUnsavedRow =
    tab === "saved" && active.recipes.some((recipe) => !recipe.saved)

  const emptyBody = () => {
    if (active.isLoading) {
      return (
        <YStack paddingVertical={48} alignItems="center">
          <ActivityIndicator color={tokens.color.primary.val} />
        </YStack>
      )
    }

    const [title, body, actionLabel, onAction] = active.isError
      ? [
          t("archive.loadErrorTitle"),
          t("archive.loadErrorBody"),
          t("archive.retry"),
          active.retry,
        ]
      : isNarrowed
        ? [
            t("archive.filteredEmptyTitle"),
            t("archive.filteredEmptyBody"),
            t("list.filterClearAll"),
            clearNarrowing,
          ]
        : tab === "saved"
          ? [
              t("archive.savedEmptyTitle"),
              t("archive.savedEmptyBody"),
              t("archive.browse"),
              goToRecipeList,
            ]
          : [
              t("archive.recentEmptyTitle"),
              t("archive.recentEmptyBody"),
              t("archive.browse"),
              goToRecipeList,
            ]

    return (
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
          {title}
        </Text>
        <Text
          fontFamily="$body"
          fontSize={13}
          lineHeight={19}
          color={surface.textMuted}
          textAlign="center"
        >
          {body}
        </Text>
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
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
            {actionLabel}
          </Text>
        </Pressable>
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor={surface.canvas} paddingTop={insets.top}>
      <XStack
        height={LAYOUT.headerHeight}
        alignItems="center"
        paddingHorizontal={12}
        gap={4}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={tc("action.back")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </Pressable>
        <Text
          accessibilityRole="header"
          fontFamily="$body"
          fontSize={TYPE.sheetTitle.fontSize}
          lineHeight={TYPE.sheetTitle.lineHeight}
          letterSpacing={TYPE.sheetTitle.letterSpacing}
          fontWeight="700"
          color={surface.textStrong}
          numberOfLines={1}
        >
          {t("archive.title")}
        </Text>
      </XStack>

      {/* 두 탭. 밑줄 하나로 어디에 있는지 말한다 — 시안과 같은 형태. */}
      <XStack
        paddingHorizontal={LAYOUT.screenX}
        borderBottomWidth={1}
        borderBottomColor={surface.hairline}
      >
        {TABS.map((value) => {
          const selected = value === tab
          return (
            <Pressable
              key={value}
              onPress={() => {
                Keyboard.dismiss()
                setTab(value)
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}
            >
              <Text
                fontFamily="$body"
                fontSize={15}
                lineHeight={21}
                letterSpacing={-0.3}
                fontWeight={selected ? "700" : "500"}
                color={selected ? surface.textStrong : surface.textMuted}
                numberOfLines={1}
              >
                {value === "saved"
                  ? t("archive.tabSaved")
                  : t("archive.tabRecent")}
              </Text>
              <View
                height={2}
                borderRadius={2}
                marginTop={10}
                marginBottom={-13}
                alignSelf="stretch"
                backgroundColor={selected ? surface.textStrong : "transparent"}
              />
            </Pressable>
          )
        })}
      </XStack>

      <YStack paddingHorizontal={LAYOUT.screenX} paddingTop={14} gap={10}>
        {/* 검색과 필터 진입이 한 줄에 있다 — 필터를 여는 곳은 여기 하나다(§6.1). */}
        <RecipeSearchField
          value={draft}
          onChangeText={setDraft}
          onSubmit={() => {
            setQuery(draft.trim())
            Keyboard.dismiss()
          }}
          onClear={clearSearchOnly}
          onFocus={() => undefined}
          onBlur={() => undefined}
          onOpenFilters={() => setFilterSheetOpen(true)}
          appliedFilterCount={appliedCount}
        />

        {applied.length > 0 && (
          <AppliedFilterRow
            applied={applied}
            onRemove={handleRemoveFilter}
            onClearAll={() => setFilters(EMPTY_RECIPE_FILTERS)}
          />
        )}

        {/* 결과 수를 목록보다 먼저 말한다(§6.1). */}
        {!active.isLoading && active.recipes.length > 0 && (
          <Text
            fontFamily="$body"
            fontSize={TYPE.caption.fontSize}
            lineHeight={TYPE.caption.lineHeight}
            letterSpacing={TYPE.caption.letterSpacing}
            fontWeight="600"
            color={surface.text}
            numberOfLines={1}
          >
            {countText}
          </Text>
        )}

        {/*
          이미 받아 둔 목록이 있는 채로 새로고침이 실패한 경우.
          실측(react-query 5.90.20, `InfiniteQueryObserver`): 데이터가 있는 채로
          refetch 가 실패하면 `status: "error"` · `isError: true` · `data != null`
          이 **동시에** 참이다. 그러면 FlatList 의 `ListEmptyComponent` 는 목록이
          비지 않았으므로 그려지지 않는다 — 당겨서 새로고침이 실패했는데 화면이
          아무 말도 하지 않고 낡은 목록만 남는다. 그 자리에서 실패와 되돌릴 방법을
          말한다(§6.4 "무엇이 일어났는지 보인다").
        */}
        {active.isError && active.recipes.length > 0 && (
          <Pressable
            onPress={active.retry}
            accessibilityRole="button"
            accessibilityLabel={`${t("archive.refreshFailedNote")} ${t("archive.retry")}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text
              fontFamily="$body"
              fontSize={12.5}
              lineHeight={18}
              color={surface.danger}
            >
              {`${t("archive.refreshFailedNote")} · ${t("archive.retry")}`}
            </Text>
          </Pressable>
        )}

        {hasUnsavedRow && (
          <Text
            fontFamily="$body"
            fontSize={11.5}
            lineHeight={16}
            color={surface.textWeak}
          >
            {t("archive.unsavedNote")}
          </Text>
        )}

        {/* 저장에 실패하면 되돌렸다는 사실까지 말한다. 누르면 닫힌다. */}
        {active.saveFailed && (
          <Pressable
            onPress={active.clearSaveError}
            accessibilityRole="alert"
            accessibilityLabel={t("archive.saveErrorTitle")}
          >
            <Text
              fontFamily="$body"
              fontSize={12.5}
              lineHeight={18}
              color={surface.danger}
            >
              {`${t("archive.saveErrorTitle")} · ${t("archive.saveErrorBody")}`}
            </Text>
          </Pressable>
        )}
      </YStack>

      <FlatList
        data={active.recipes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        onEndReached={active.loadMore}
        onEndReachedThreshold={0.6}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={emptyBody()}
        ListFooterComponent={
          active.isFetchingNextPage ? (
            <YStack paddingVertical={18} alignItems="center">
              <ActivityIndicator color={tokens.color.primary.val} />
            </YStack>
          ) : null
        }
      />

      <RecipeFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        selection={filters}
        onApply={setFilters}
      />
    </YStack>
  )
}
