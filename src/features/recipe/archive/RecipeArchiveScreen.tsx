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
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 재설계 (2026-07-31) — 이 화면만 옛 목록에 남아 있었다
 *
 * 목록 화면(`app/(tabs)/recipe.tsx`)과 상세(`app/recipe/[id]/index.tsx`)가 재설계될 때
 * 보관함은 따라오지 않았다. 그래서 같은 레시피가 **한 앱 안에서 두 가지로** 보였다:
 *
 *  ┌ ① 카드가 달랐다 ───────────────────────────────────────────────────────────
 *  │ 목록은 72pt 타일 + 헤어라인으로 끊는 96pt 줄(`RecipePhotoCard`)인데 보관함은
 *  │ 옛 `RecipeListCard`(패딩 14 카드 면 + 16:9 이미지 자리)였다. 그런데 dev DB 175건의
 *  │ `thumbnailUrl` 이 전부 null 이라(§`RecipePhotoCard` 머리말) 그 카드는 이미지 자리를
 *  │ 통째로 접고 **글자만 쌓인 목록**이 됐다. 카드 면(`surface.card` = #FFFFFF)도 화면
 *  │ 바닥과 같은 흰색이라 보이지 않았다 — 보이지 않는 면 때문에 매 줄 28pt 를 냈다.
 *  │ → 목록과 **같은 줄 카드**를 쓴다. 카테고리 일러스트 타일이 들어와 훑을 것이 생기고,
 *  │   좌우 여백도 20 → `GUTTER`(16)로 맞아 두 화면을 오갈 때 시작선이 튀지 않는다.
 *  └──────────────────────────────────────────────────────────────────────────
 *
 *  ┌ ② 저장 해제가 카드 밖 별도 줄이었다 ───────────────────────────────────────
 *  │ 카드마다 오른쪽 끝에 `저장 해제` 글자 줄이 하나씩 더 붙어 있었다. 줄 높이가 카드마다
 *  │ 달라졌고(강조색 글자가 목록 전체에 세로로 늘어섰다), 무엇보다 **같은 동작의 문법이
 *  │ 목록 화면과 달랐다** — 목록에서는 사진 위 북마크, 보관함에서는 글자 줄.
 *  │ → 사진 위 북마크 하나로 통일했다(`onToggleSave`). 그 컨트롤은 채워짐/외곽선이라는
 *  │   **모양**으로 상태를 말하고(색맹에서도 갈린다), 스크린리더에는 상태가 아니라
 *  │   동작(`저장하기`/`저장 해제`)을 읽어 준다. 라벨 없는 아이콘이 걱정이던 지점은
 *  │   여기서 해결된다.
 *  │
 *  │   **저장을 풀어도 행은 남는다**(계약 §2.1). 지우면 손가락 아래에서 목록이 튀고
 *  │   되돌릴 방법이 사라진다. 남은 행이 왜 남아 있는지는 목록 머리의 한 줄
 *  │   (`archive.unsavedNote`)이 말한다 — 토스트로 잠깐 띄우면 놓친 사용자는 알 수 없다.
 *  └──────────────────────────────────────────────────────────────────────────
 *
 *  ┌ ③ 상단이 고정 다섯 겹이었다 ──────────────────────────────────────────────
 *  │ 제목 · 탭 · 검색 · 칩 · 결과 수 · 안내문구 3종이 전부 스크롤 위에 고정돼 있어,
 *  │ 안내가 하나만 켜져도 목록이 화면 절반 아래에서 시작했다.
 *  │ → **걸린 상태**(탭 · 검색 · 적용 칩)만 고정하고, **목록에 대한 말**(결과 수 ·
 *  │   추정값 안내 · 상태 안내)은 목록 머리로 내려 같이 스크롤한다.
 *  └──────────────────────────────────────────────────────────────────────────
 *
 *  ┌ ④ 빈 화면과 실패가 회색 잔글씨였다 ───────────────────────────────────────
 *  │ 13pt 회색 두 줄 + 맨 글자 링크. 보관함은 처음 오면 **거의 항상 비어 있는** 화면인데
 *  │ 그 첫인상이 "고장 난 것 같은 빈 페이지" 였다.
 *  │ → 상세와 같은 DS 상태 컴포넌트(`V2EmptyState`/`V2ErrorState`)를 쓴다. 어떤 말을
 *  │   할지의 판단은 `archiveEmptyState.ts` 에 있다(node jest 가 검증한다).
 *  └──────────────────────────────────────────────────────────────────────────
 *
 * ■ 색이 두 팔레트인 것은 의도다
 *   화면 겉(헤더 · 탭 · 빈/실패 상태)은 design-system-v2, 본문(카드 · 검색 · 칩 · 필터
 *   시트)은 `useSurface()` 다. 본문이 쓰는 컴포넌트가 전부 목록 화면과 **같은 것**이고
 *   그것들이 surface 팔레트를 보기 때문이다 — 보관함만 v2 색으로 칠하면 같은 카드가 두
 *   화면에서 다른 회색이 된다. 두 팔레트가 만나는 지점(화면 바닥)은 값이 같다
 *   (`background.default` #FFFFFF / #1F1F21 = `canvas`). 팔레트 이전은 목록 화면과
 *   함께 한 번에 한다.
 *
 * ■ 재사용 — 목록 담당이 만든 것을 그대로 쓴다
 *   카드(`RecipePhotoCard`), 검색+필터 버튼(`RecipeSearchField`), 적용 칩
 *   (`AppliedFilterRow`), 필터 시트(`RecipeFilterSheet`), 필터 모델, 결과 수 판단
 *   (`resolveResultCount`), 줄 격자(`recipeRowLayout`). 보관함이 자기 카드·자기 필터를
 *   따로 가지면 같은 레시피가 두 화면에서 다르게 보이고, 같은 칩이 서로 다른 값을 서버로
 *   보낸다(계약 §6.1 "필터는 한 곳").
 *
 * ■ 시안에서 고친 것(그대로 유지)
 *   - 필터를 여는 곳은 검색창 오른쪽 하나다. 카테고리 캐러셀을 두지 않았다.
 *   - 적용된 필터는 항상 칩으로 보이고 거기서 뺀다.
 *   - 검색이 실제로 결과를 바꾸고, 목록보다 **먼저** 결과 수를 말한다. 서버가 총계를
 *     안 주면 "N개 이상" 으로 내려간다(받은 개수를 전체인 척 말하지 않는다).
 *   - 상단 우측 북마크 아이콘을 없앴다 — 저장 화면에서 "저장" 아이콘이 또 있으면
 *     무엇에 대한 저장인지 알 수 없다.
 *
 * ■ 검색 자동완성을 **일부러 안 붙였다**
 *   목록 화면에는 `RecipeSuggestPanel` 이 있다. 그 제안은 서버의 전체 카탈로그에서
 *   오므로(`GET /recipes/search/suggest`) 보관함에 붙이면 **내 보관함에 없는 레시피**를
 *   제안하게 된다 — 골랐는데 "조건에 맞는 레시피가 없어요" 가 뜬다. 보관함 검색은 내가
 *   가진 것 안에서 좁히는 일이라 제안이 필요한 규모가 아니다.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
// 리사이클링 리스트 — 무한 피드는 FlatList 대신 FlashList(v2, 추정치 불필요)
import { FlashList } from "@shopify/flash-list"
import { type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  GUTTER,
  ITEM_GAP,
  SECTION_GAP,
  V2EmptyState,
  V2ErrorState,
  V2ScreenHeader,
  V2Tab,
  spacing,
  typography,
} from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { tokens } from "@/src/theme/tokens"

import {
  AppliedFilterRow,
  EMPTY_RECIPE_FILTERS,
  RECIPE_ROW_TEXT_INDENT,
  RecipeFilterSheet,
  RecipeListSkeleton,
  RecipePhotoCard,
  RecipeSearchField,
  countRecipeFilters,
  hasEstimatedNutrition,
  listAppliedRecipeFilters,
  removeRecipeFilter,
  type RecipeFilterGroupKey,
  type RecipeFilterSelection,
} from "../components/list"
import { useRecentRecipes } from "../hooks/useRecentRecipes"
import { useSavedRecipes } from "../hooks/useSavedRecipes"
import type { RecipeCard } from "../types/recipeListV2"

import { resolveArchiveEmpty } from "./archiveEmptyState"
import {
  RECIPE_ARCHIVE_COUNT_KEYS,
  RECIPE_ARCHIVE_TABS,
  RECIPE_ARCHIVE_TAB_LABEL_KEYS,
  normalizeArchiveTab,
  type RecipeArchiveTab,
} from "./archiveTab"
import type { UseRecipeArchiveListResult } from "./useRecipeArchiveList"

export type { RecipeArchiveTab } from "./archiveTab"

/** 입력이 멎은 뒤 한 번만 조회한다. 한 글자마다 나가면 목록이 계속 흔들린다. */
const SEARCH_DEBOUNCE_MS = 300

export interface RecipeArchiveScreenProps {
  /** 라우트가 정하는 시작 탭. */
  initialTab: RecipeArchiveTab
}

export function RecipeArchiveScreen({ initialTab }: RecipeArchiveScreenProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const insets = useSafeAreaInsets()
  const router = useAppRouter()

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
  const showEstimateNotice = useMemo(
    () => hasEstimatedNutrition(active.recipes),
    [active.recipes],
  )

  const tabItems = useMemo(
    () =>
      RECIPE_ARCHIVE_TABS.map((value) => ({
        value,
        label: t(RECIPE_ARCHIVE_TAB_LABEL_KEYS[value]),
      })),
    [t],
  )

  const handleChangeTab = useCallback((value: string) => {
    // 결과를 보려고 누른 탭인데 키보드가 절반을 덮고 있으면 안 된다.
    Keyboard.dismiss()
    setTab(normalizeArchiveTab(value))
  }, [])

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

  const handleOpenRecipe = useCallback(
    (card: RecipeCard) => {
      router.push(`/recipe/${card.id}` as Href)
    },
    [router],
  )

  // 훅이 돌려주는 `active` 는 매 렌더 새 객체다. 그걸 의존성에 두면 `renderItem` 이
  // 매 렌더 새 함수가 되어 검색어 한 글자마다 보이는 카드 전부가 다시 그려진다.
  // 실제로 쓰는 함수 하나만 집는다(`setSaved` 는 위 훅에서 안정화해 뒀다).
  const setSavedOnActive = active.setSaved

  /** 절대 상태를 보낸다(계약 §2.1 — 토글이 아니라 목표 상태라 연타·재시도에 안전). */
  const handleToggleSave = useCallback(
    (card: RecipeCard) => {
      setSavedOnActive(card.id, !card.saved)
    },
    [setSavedOnActive],
  )

  const renderItem = useCallback(
    ({ item }: { item: RecipeCard }) => (
      <View style={styles.rowWrap}>
        <RecipePhotoCard
          card={item}
          variant="row"
          onPress={handleOpenRecipe}
          onToggleSave={handleToggleSave}
        />
      </View>
    ),
    [handleOpenRecipe, handleToggleSave],
  )

  const keyExtractor = useCallback((item: RecipeCard) => String(item.id), [])

  /**
   * 줄 사이의 헤어라인. 목록 화면과 같은 규칙이다 — 왼쪽을 글자 시작선까지 들여 써서
   * 썸네일을 가로지르지 않는다(가로지르면 목록이 표처럼 보인다).
   */
  const renderSeparator = useCallback(
    () => (
      <View
        style={[styles.rowSeparator, { backgroundColor: surface.hairline }]}
      />
    ),
    [surface.hairline],
  )

  /** 결과 수. 좁혔을 때는 "결과 N개", 그냥 볼 때는 보관함 전체 개수를 말한다. */
  const countText = useMemo(() => {
    const { kind, count } = active.resultCount
    if (isNarrowed) {
      return kind === "atLeast"
        ? t("list.resultCountAtLeast", { count })
        : t("feed.results", { count })
    }
    return t(RECIPE_ARCHIVE_COUNT_KEYS[tab], { count })
  }, [active.resultCount, isNarrowed, t, tab])

  /**
   * 저장을 푼 행이 아직 목록에 남아 있는가. 남아 있을 때만 그 이유를 말한다 —
   * 타이머로 잠깐 띄우면 사용자가 놓친 뒤에는 왜 남아 있는지 알 수 없다.
   */
  const hasUnsavedRow =
    tab === "saved" && active.recipes.some((recipe) => !recipe.saved)

  /**
   * 목록에 **대한** 말. 고정부가 아니라 목록 머리에 둔다 — 걸어 둔 조건(탭·검색·칩)은
   * 스크롤해도 보여야 하지만, 개수와 안내는 목록의 일부라 같이 지나가야 한다.
   * 목록이 비면 빈 상태가 같은 말을 더 크게 하므로 이 자리는 통째로 없다.
   */
  const listHeader =
    active.recipes.length === 0 ? null : (
      <View style={styles.listHeader}>
        <Text
          style={[styles.resultCount, { color: surface.text }]}
          numberOfLines={1}
        >
          {countText}
        </Text>

        {/* 목록 전체에 한 번만 말한다 — 카드마다 배지를 붙이면 무늬가 된다(§6.4). */}
        {showEstimateNotice && (
          <Text
            style={[styles.note, { color: surface.textMuted }]}
            numberOfLines={1}
          >
            {t("list.estimateNotice")}
          </Text>
        )}

        {hasUnsavedRow && (
          <Text style={[styles.note, { color: surface.textWeak }]}>
            {t("archive.unsavedNote")}
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
            hitSlop={6}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={[styles.note, { color: surface.danger }]}>
              {`${t("archive.refreshFailedNote")} · ${t("archive.retry")}`}
            </Text>
          </Pressable>
        )}

        {/*
          저장에 실패하면 **되돌렸다는 사실**을 먼저 말하고, 그 다음에 원인을 붙인다.
          원인 문장은 화면이 고르지 않는다 — 예전에는 어떤 실패든 "인터넷 연결을
          확인한 뒤 다시 해 주세요" 였다. 누르면 닫힌다.
        */}
        {active.saveError && (
          <Pressable
            onPress={active.clearSaveError}
            accessibilityRole="alert"
            accessibilityLabel={t("archive.saveReverted")}
          >
            <Text
              style={[styles.note, { color: surface.danger }]}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {`${t("archive.saveReverted")} · ${active.saveError}`}
            </Text>
          </Pressable>
        )}
      </View>
    )

  /**
   * 비었을 때. 무슨 말을 할지는 순수 모듈이 정하고(순서가 전부다 — 그 머리말 참고)
   * 여기서는 행동만 연결한다.
   */
  const emptyBody = () => {
    // 첫 조회 중에는 "비었다" 가 아니라 "오는 중" 이다. 줄 모양을 미리 깔아
    // 도착 순간 목록이 통째로 밀려 올라오지 않게 한다.
    if (active.isLoading) return <RecipeListSkeleton />

    const copy = resolveArchiveEmpty({
      isError: active.isError,
      isNarrowed,
      tab,
    })
    const onAction =
      copy.action === "retry"
        ? active.retry
        : copy.action === "clearNarrowing"
          ? clearNarrowing
          : goToRecipeList

    if (copy.kind === "loadError") {
      return (
        <View style={styles.emptyWrap}>
          <V2ErrorState
            icon={copy.icon}
            title={t(copy.titleKey)}
            description={t(copy.bodyKey)}
            onRetry={onAction}
            retryLabel={t(copy.actionKey)}
          />
        </View>
      )
    }

    return (
      <View style={styles.emptyWrap}>
        <V2EmptyState
          icon={copy.icon}
          title={t(copy.titleKey)}
          description={t(copy.bodyKey)}
          actionLabel={t(copy.actionKey)}
          onAction={onAction}
        />
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: surface.canvas }]}>
      <V2ScreenHeader title={t("archive.title")} onBack={() => router.back()} />

      {/* 두 탭. 밑줄 하나로 어디에 있는지 말한다 — 상세·설정과 같은 DS 컴포넌트다. */}
      <V2Tab
        items={tabItems}
        value={tab}
        onChange={handleChangeTab}
        alignment="fixed"
        size="s"
      />

      {/* 걸어 둔 조건만 고정된다: 검색 + 필터 진입(§6.1 문은 하나), 적용 칩. */}
      <View style={styles.controls}>
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
          // 이 검색은 보관함 안에서만 찾는다. 목록의 "레시피를 검색해 보세요" 를 그대로
          // 쓰면 전체 카탈로그를 찾는 것으로 읽혀, 없는 결과를 앱 탓으로 돌리게 된다.
          placeholder={t("archive.searchPlaceholder")}
        />

        {applied.length > 0 && (
          <AppliedFilterRow
            applied={applied}
            onRemove={handleRemoveFilter}
            onClearAll={() => setFilters(EMPTY_RECIPE_FILTERS)}
          />
        )}
      </View>

      <FlashList
        /*
          탭을 바꾸면 목록을 처음부터 본다. `key` 없이 두면 저장 탭에서 20줄쯤 내려간
          스크롤 위치가 최근 탭에 그대로 남아, 다른 목록의 중간에서 시작한다.
        */
        key={tab}
        data={active.recipes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={{
          paddingTop: spacing[4],
          // 이 화면은 탭 밖(루트 스택)이라 전역 `AI 상담` 필이 없다 — 목록 화면처럼
          // 필 높이를 비우면 바닥에 빈 구간만 생긴다. 홈 인디케이터만 피한다.
          paddingBottom: insets.bottom + SECTION_GAP,
        }}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={renderSeparator}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={active.loadMore}
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
        ListEmptyComponent={emptyBody()}
        ListFooterComponent={
          // 다음 페이지도 같은 줄 모양으로 이어 붙는다 — 링이 끼어들면 목록의 리듬이 끊긴다.
          active.isFetchingNextPage ? (
            <View style={styles.footer}>
              <RecipeListSkeleton count={2} />
            </View>
          ) : null
        }
      />

      <RecipeFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        selection={filters}
        onApply={setFilters}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { flex: 1 },

  /** 고정부. 탭 바로 아래라 위 여백은 좁게, 아래는 목록과 붙지 않게. */
  controls: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    gap: spacing[10],
  },

  /** 목록 머리 — 결과 수와 안내. 시작선은 줄 카드와 같은 `GUTTER` 다. */
  listHeader: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing[8],
    paddingBottom: spacing[10],
    gap: spacing[2],
  },
  resultCount: {
    ...typography.label.xSmall,
  },
  note: {
    ...typography.subtext.small,
  },

  /** 목록 줄의 좌우 여백. 세로 여백·높이는 카드가 격자에서 가져온다. */
  rowWrap: {
    paddingHorizontal: GUTTER,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: RECIPE_ROW_TEXT_INDENT,
  },

  emptyWrap: {
    paddingTop: SECTION_GAP * 2,
    paddingHorizontal: GUTTER,
  },
  footer: {
    paddingVertical: ITEM_GAP,
    alignItems: "center",
  },
})
