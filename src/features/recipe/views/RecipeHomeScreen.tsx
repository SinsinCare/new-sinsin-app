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
 *     → 시트는 고르는 곳 하나, 적용된 것은 상단 칩에서 보고 거기서 뺀다.
 *       캐러셀은 사용자 요청으로 **다시 넣었지만 자리를 하나로 못 박았다** — 아래 §카테고리.
 *  3. 카드의 `#CKD3` `#저염식` 을 지우고(§1.2) 그 자리에 **영양 수치 1개 + 내 참고량 대비**
 *     를 넣었다. 데이터 없이 그려져 있던 `★4.0 (27)` 은 실제 별점이고 0건이면 안 그린다.
 *  4. 정렬을 붙였다 — `추천 | 최신 | 별점 | 저장순 | 빠른 조리`. `빠른 조리` 는 시안에 없지만
 *     "지금 뭐 먹지" 의 실제 질의다.
 *
 * ─── 이번 재설계: 세 층 ────────────────────────────────────────────────────
 * 지금까지 이 화면은 제목·검색·정렬·안내문구·목록이 **같은 무게로** 쌓여 있었다.
 * 층을 셋으로 나누고 층마다 다른 무게를 준다.
 *
 *   ① 고정부   제목 · 검색 · 카테고리 레일 · 적용된 필터 칩 — 스크롤해도 남는다.
 *   ② 둘러보기 아침/점심/저녁 섹션                  — 서버가 오늘 고른 것.
 *   ③ 카탈로그 목록 제목 · 정렬 · 사진 줄 목록      — 전부를 훑는 곳.
 *
 * **카테고리 레일은 2026-08-21 에 ②에서 ①로 올라왔다** (사용자 지시: "카테고리 탭바도
 * 스크롤에 영향 안 받게 통일하고 … 서치바 밑에"). 커뮤니티 탭과 같은 문법이다 —
 * 검색이 위, 카테고리가 그 밑, 둘 다 고정. 사용자가 같이 지적한 "여백 차이" 는 다른
 * 문제가 아니라 **같은 원인**이었다: 검색과 레일이 서로 다른 스크롤 평면에 있어서 그
 * 사이에 고정층 아래 패딩과 레일 자기 여백이 겹쳐 들어갔고, 그래서 한 덩어리로 읽혀야
 * 할 둘이 제목-검색보다 더 멀었다. 붙이니 간격이 한 값(`SEARCH_TO_RAIL_GAP`, 커뮤니티와
 * **공유하는 상수**)이 됐다. 고정층의 세로 격자와 높이 예산은
 * `components/list/recipeHomeStickyLayout.ts` 에 있다.
 *
 * ②와 ③ 사이에만 톤 밴드(`surface.surface` 8pt)를 넣는다. 섹션 사이는 여백만으로 나눈다 —
 * 구분선을 층마다 그으면 다섯 겹이 되어 무엇이 무엇의 부분인지 다시 알 수 없다.
 * 정렬 줄을 ③ 안으로 내린 이유: 정렬은 목록에만 걸린다. 섹션 위에 두면 "추천 섹션도
 * 별점순으로 바뀌나" 를 사용자가 시험해 봐야 한다.
 *
 * ─── 섹션을 언제 감추는가 ──────────────────────────────────────────────────
 * **검색어가 확정됐거나 필터가 하나라도 걸리면 감춘다**(카테고리 캐러셀 선택 포함).
 * 근거는 서버다 — `GET /recipes/home` 은 쿼리로 `locale` 하나만 받는다
 * (`sinsin-be-bun/src/domains/recipe/homeRoutes.ts` 실측: `categories` 파라미터가 없다).
 * 즉 **섹션을 그 카테고리로 좁힐 방법이 없다.** 좁히지 못한 섹션을 좁혀진 목록 위에
 * 남겨 두면, 한 화면에서 "한식" 을 눌렀는데 위쪽 카드는 중식·양식이 그대로 있는 상태가
 * 된다 — 사용자는 필터가 무엇에 걸렸는지 알 수 없다. 그래서 필터를 걸면 ②층이 통째로
 * 사라지고 ③층만 남는다. (홈 API 에 카테고리가 생기면 이 판단을 다시 하면 된다.)
 *
 * ─── 카테고리가 사는 자리 (필터를 다시 흩지 않는다) ────────────────────────
 * 캐러셀이 보이는 동안 카테고리는 **캐러셀에서만** 보인다 — 적용 칩 줄에서 카테고리 칩을
 * 뺀다. 캐러셀이 감춰지는 상황(검색 중)에는 카테고리도 칩으로 나온다. 안 그러면 걸어 둔
 * 카테고리를 보거나 뺄 방법이 없어진다. 걸러 내는 것은 **화면에서** 하고
 * `listAppliedRecipeFilters` 는 그대로 쓴다 — 모델을 갈라 두 진실을 만들지 않는다.
 *
 * 색: 강조는 `tokens.color.primary` 하나. `safe*`(틸)는 "안전" 의미색이라 쓰지 않는다(§6.4).
 *
 * ─── 이번 재설계 (실측 → 조치) ────────────────────────────────────────────────
 *
 * §격자 — **화면 좌우 여백을 20 → 16 으로 내렸다.**
 *   `@/src/design-system-v2` 의 `GUTTER`/`RAIL_INSET`/`ITEM_GAP` 을 쓴다. 이 격자의
 *   원본은 `src/features/restaurant/layout.ts` 이고, 규칙만 DS 로 올린 사본이
 *   `design-system-v2/tokens/layout.ts` 다(그 파일 머리말에 정본 이관 계획이 있다).
 *   **레시피가 `features/restaurant/` 를 직접 import 하지 않는다** — 기능 모듈끼리
 *   의존하면 식당 팀의 리팩터가 레시피를 깨고, 두 기능은 서로의 배포 단위가 아니다.
 *   화면 안의 시작선은 이제 둘뿐이다: `GUTTER`(16, 제목·섹션·정렬·레일)와
 *   `RECIPE_ROW_TEXT_INDENT`(100, 목록 줄의 글자). 예전에는 20·34·142 로 셋이었다.
 *
 * §플로팅 — **오른쪽 아래에 떠 있는 것을 하나로 줄였다.**
 *   주황 연필(`RecipeWriteFab`)과 전역 검정 `AI 상담` 필이 세로로 쌓여 오른쪽 아래
 *   130pt 를 점유했고, 연필은 스크롤 중 카드 **글자를 덮었다**(실측). 산술로 겹침을
 *   막아 뒀지만 겹치지 않는 것과 가리지 않는 것은 다른 문제다 — 떠 있는 면은 정의상
 *   그 아래 내용을 가린다.
 *
 *   `AI 상담` 은 **전역**이라(`app/(tabs)/_layout.tsx`, 식당 탭만 예외) 이 화면이 옮길
 *   수 없다. 옮기면 나머지 세 탭에서 자리가 달라진다. 그래서 **이 화면의 것을** 뺐다:
 *   작성 진입점을 헤더의 액션 칩으로 올렸다(벤치마크 §A-2 "액션이 상단에 있다").
 *   잃는 것은 명확히 적어 둔다 — 작성 버튼이 더 이상 스크롤을 따라오지 않는다. 대신
 *   목록을 훑는 동안 아무것도 가리지 않고, 화면의 프라이머리가 하나로 남는다.
 *   그리고 맨 아래 줄이 `AI 상담` 에 가리지 않도록 `recipeListBottomInset()` 만큼
 *   목록 바닥을 비운다. 이 여백은 **`contentContainerStyle` 에** 있다 — 예전에는
 *   `ListFooterComponent` 에 있었는데, 다음 페이지를 불러오는 동안 그 자리가 스피너로
 *   바뀌어 **여백이 통째로 사라졌다.** `onEndReachedThreshold` 가 0.6 이라 목록 끝에서는
 *   거의 항상 불러오는 중이고, 그래서 마지막 줄이 탭바에 잘렸다(지적 9번의 정체).
 *
 * §추정값 문구 — **떠 있던 것을 붙였다.**
 *   `영양 수치는 추정값` 이 결과 수와 같은 줄의 오른쪽 끝에 혼자 떠 있어서 무엇에
 *   대한 말인지 읽히지 않았다. 이제 목록 제목(또는 결과 수) **바로 아래 한 줄**,
 *   `GUTTER` 에 맞춘 자리에 둔다 — 바로 밑에 오는 카드들의 수치를 가리키는 위치다.
 */
import { FeatureIntroSheet, useFeatureIntro } from "@/src/features/coach"
import { FloatingWriteButton } from "@/src/shared/components/FloatingWriteButton"
import {
  isAtScrollTop,
  useAppRouter,
  useRegisterTabReset,
} from "@/src/shared/navigation"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View as RNView,
  Text as RNText,
} from "react-native"
// 리사이클링 리스트 — 무한 피드는 FlatList 대신 FlashList(v2, 추정치 불필요)
import { FlashList, type FlashListRef } from "@shopify/flash-list"
import {
  V2Box,
  V2HStack,
  V2Text,
  V2VStack,
  CHIP_GAP,
  GUTTER,
  SECTION_GAP,
  radius,
  spacing,
  typography,
} from "@/src/design-system-v2"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { Icon } from "@/src/shared/components/Icon"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"
import { useRefreshable, useRevalidateOnReturn } from "@/src/shared/refresh"
import { RECIPE_LIST_REFRESH } from "@/src/features/recipe/refresh/scopes"
import { tokens } from "@/src/theme/tokens"

import {
  AppliedFilterRow,
  EMPTY_RECIPE_FILTERS,
  hasEstimatedNutrition,
  listAppliedRecipeFilters,
  recipeListBottomInset,
  RECIPE_ROW_TEXT_INDENT,
  RecipeFilterSheet,
  RecipeListSkeleton,
  RecipeSearchField,
  RecipeSortRow,
  RecipeSuggestPanel,
  removeRecipeFilter,
  countRecipeFilters,
  RecipeCarouselSkeleton,
  RecipeCategoryCarousel,
  recipeCategoryOptionKeyForQueryValue,
  RECIPE_STICKY,
  RECIPE_HOME_LIST_TITLE_KEY,
  RecipeMealSection,
  resolveSlotReasonCopy,
  resolveMealSectionDay,
  mealSlotWordKey,
  RecipePhotoCard,
  resolveRecipeBrowseLayout,
  visibleAppliedRecipeFilters,
  clearRecipeFilterGroup,
  selectSingleRecipeFilter,
  toRecipeListQueryFilters,
  type RecipeFilterGroupKey,
  type RecipeFilterSelection,
} from "@/src/features/recipe/components/list"
import { useRecipeHome } from "@/src/features/recipe/hooks/useRecipeHome"
import { useRecipeListV2 } from "@/src/features/recipe/hooks/useRecipeListV2"
import { useRecipeSearch } from "@/src/features/recipe/hooks/useRecipeSearch"
import { resolveError } from "@/src/lib/errorMessage"
import type {
  RecipeCard,
  RecipeSortKey,
} from "@/src/features/recipe/types/recipeListV2"

/** ②층과 ③층 사이의 톤 밴드 높이. 면 색 차이로만 경계를 만든다(그림자를 쓰지 않는다). */
const LAYER_BAND_HEIGHT = 8

export function RecipeHomeScreen() {
  // 첫 진입 안내 — 끼니 슬롯·한 명 기준 수치는 화면만 봐서는 알 수 없다.
  const recipeIntro = useFeatureIntro("recipe")
  const router = useAppRouter()
  const { t } = useTranslation("common")
  const { t: tr } = useTranslation("recipe")
  const insets = useSafeAreaInsets()
  const surface = useSurface()

  const [filters, setFilters] =
    useState<RecipeFilterSelection>(EMPTY_RECIPE_FILTERS)
  const [sort, setSort] = useState<RecipeSortKey>("recommended")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const search = useRecipeSearch()
  const list = useRecipeListV2({
    query: search.committedQuery,
    filters,
    sort,
  })
  /**
   * 목록 조회가 실패했을 때 그릴 문장. **화면이 고르지 않는다** — 예전에는 갈래가
   * 하나뿐이라 400 도 500 도 `연결을 확인한 뒤 다시 해 주세요` 였다.
   *
   * `isError` 가 아닐 때도 계산되지만 그 값은 쓰이지 않는다(빈 목록은 오류가 아니다).
   */
  const listFailure = useMemo(() => resolveError(list.error), [list.error])
  /**
   * 훅이 돌려주는 객체는 매 렌더 새로 만들어진다. 머리말 `useMemo` 의 의존성으로 객체를
   * 그대로 넣으면 렌더마다 머리말이 새로 만들어져(캐러셀 넷이 딸려 있다) 메모가 무의미해진다.
   * 그래서 안이 안정적인 값(`sections` 는 훅에서 `useMemo`, `refetch` 는 react-query)만 꺼낸다.
   */
  const {
    sections: homeSections,
    slotDecision: homeSlotDecision,
    isError: homeIsError,
    isLoading: homeIsLoading,
    refetch: refetchHome,
  } = useRecipeHome()

  /**
   * "왜 이 끼니부터인가" 한 줄. 서버가 시계만 보지 않기 때문에 필요하다 — 오늘 아침을
   * 기록했으면 09시에도 점심 섹션이 먼저 온다. 그 순서를 바꾼 이유를 말하지 않으면
   * 사용자는 화면이 고장 났다고 읽는다.
   *
   * **시계 그대로일 때는 `null` 이고 아무것도 그리지 않는다**(`resolveSlotReasonCopy`).
   * 평소에 없던 문장이 뜨는 것 자체가 "오늘은 뭔가 다르다" 의 신호가 된다.
   */
  const slotReason = useMemo(
    () => resolveSlotReasonCopy(homeSlotDecision),
    [homeSlotDecision],
  )

  const applied = useMemo(() => listAppliedRecipeFilters(filters), [filters])
  const appliedCount = useMemo(() => countRecipeFilters(filters), [filters])
  const showEstimateNotice = useMemo(
    () => hasEstimatedNutrition(list.items),
    [list.items],
  )

  /**
   * 어느 층을 그리는가. 판단은 `recipeHomePresentation.ts` 에 있다 — 이 화면은 tamagui·
   * expo-router 를 끌고 와 렌더 테스트가 불가능하고, 그러면 "필터가 3곳에 흩어진다" 는
   * 시안의 원래 결함이 조용히 되살아나도 아무도 모른다. 판단만 밖에 두고 여기서 그린다.
   *
   * 요약: 캐러셀은 검색 중이 아니면 **필터가 걸려 있어도** 보인다(자기가 무엇을 눌렀는지
   * 보고 뺄 수 있어야 한다). 섹션은 검색·필터 중에 사라진다(홈 API 가 카테고리를 못 받아
   * 좁힐 수 없다).
   */
  const browseLayout = useMemo(
    () =>
      resolveRecipeBrowseLayout({
        isSearching: search.isSearching,
        appliedFilterCount: appliedCount,
      }),
    [search.isSearching, appliedCount],
  )
  const { showCategoryCarousel, showMealSections } = browseLayout

  /**
   * 고정층에 레일을 그릴 것인가. 판정은 **`showCategoryCarousel` 그대로**이고
   * 여기서 다시 적지 않는다 — 다만 자동완성이 떠 있는 동안에는 뺀다.
   *
   * 자동완성은 검색 필드에 **붙어야** 하는 목록이다. 그 사이에 레일이 끼면 방금 친
   * 글자와 그 제안 사이에 상관없는 줄이 하나 놓이고, 제안이 화면 아래로 밀린다.
   * 이 상태에서는 목록 자체가 `RecipeSuggestPanel` 로 통째로 바뀌므로(아래 갈래)
   * 레일이 조작할 대상도 화면에 없다 — 즉 "감춘 자리에서 카테고리를 볼 수도 뺄 수도
   * 없다" 는 사고가 아니다(둘러보기 화면 자체가 잠시 없다).
   */
  const showStickyCategoryRail = showCategoryCarousel && !search.showSuggestions

  /**
   * 칩 줄에 실제로 그릴 것 — 캐러셀이 보이는 동안 카테고리 칩을 뺀다.
   * 모델(`listAppliedRecipeFilters`)은 그대로 두고 화면 층에서만 거른다.
   */
  const visibleApplied = useMemo(
    () => visibleAppliedRecipeFilters(applied, browseLayout),
    [applied, browseLayout],
  )

  /** 결과 수를 말할 상황인가 — 검색했거나 필터를 걸었을 때만(그냥 둘러볼 때 개수는 소음이다). */
  const showResultCount =
    (search.isSearching || appliedCount > 0) && !list.isLoading && !list.isError
  const resultCountText =
    list.resultCount.kind === "atLeast"
      ? tr("list.resultCountAtLeast", { count: list.resultCount.count })
      : tr("feed.results", { count: list.resultCount.count })

  /*
    두 층을 같이 새로 받는다. 섹션만 옛 값으로 남으면 "당겨서 새로 고침" 이 거짓말이 된다.
    예전에는 `Promise.all([list.refetch(), refetchHome()])` 를 손으로 썼다 — 이 화면에
    `recipes-v2` 쿼리가 하나 더 붙으면 저 배열에 더하는 것을 잊는 순간 같은 거짓말이
    돌아온다. 이제 뿌리(`RECIPE_LIST_REFRESH`) 아래 붙어 있는 것이 전부 따라온다.
  */
  const refreshable = useRefreshable({
    queryKeys: RECIPE_LIST_REFRESH,
    scope: "recipe-list",
  })
  useRevalidateOnReturn({ queryKeys: RECIPE_LIST_REFRESH })

  /*
    ── 레시피 탭을 다시 눌렀을 때 ─────────────────────────────────────────────
    목록형 탭이라 루트 상태는 **맨 위**다. 그리고 **거기서 끝난다.**

    처음에는 맨 위면 다시 받았다(`refresh: refreshable.refresh`). 실기기 신고로
    걷어냈다 — "다시 누르면 스크롤 맨 위가 아니라 새로고침 스피너까지 간다". 탭 탭은
    이동 제스처지 조회 제스처가 아니고, 새로고침에는 이미 발견 가능한 제스처가 있다
    (당겨서 새로고침 = 같은 `refreshable`). 자세한 사정은 `tabReset.ts` 머리말 §4번.

    남은 4번은 **복구**뿐이다: 첫 조회가 실패해 목록 자리에 전면 오류가 서 있을 때
    (`ListEmptyComponent` 의 `list.isError` 갈래와 **같은 조건**으로 잰다 — 두 곳에서
    따로 재면 언젠가 한쪽만 고쳐진다). 그때는 당길 목록이 없어 재탭이 유일한 길이다.
    섹션 층만 죽은 경우(`homeIsError`)는 여기 넣지 않는다 — 그 층은 자기 자리에
    `다시 시도` 를 이미 세우고, 목록은 멀쩡히 읽히기 때문이다.

    **필터·검색어는 건드리지 않는다.** 탭을 한 번 눌렀다고 고른 것이 사라지면
    사용자는 자기가 무엇을 잃었는지 모른 채 처음으로 돌아간다 — 토스·당근·네이버·
    카카오 어디도 그러지 않는다.

    스크롤은 **애니메이션**이다. 순간이동시키면 스크린리더의 읽기 위치가 화면과
    어긋난다. 포커스는 옮기지 않는다(VoiceOver 커서를 빼앗지 않는다).
  */
  const listRef = useRef<FlashListRef<(typeof list.items)[number]>>(null)
  const scrollOffsetRef = useRef(0)
  useRegisterTabReset("recipe", {
    content: {
      isAtRoot: () => isAtScrollTop(scrollOffsetRef.current),
      reset: () =>
        listRef.current?.scrollToOffset({ offset: 0, animated: true }),
    },
    recover:
      list.isError && list.items.length === 0 ? refreshable.refresh : undefined,
  })

  /**
   * 목록을 맨 위로 되돌린다. **고정층의 높이가 바뀌는 순간에만 쓴다.**
   *
   * 레일은 검색을 확정하면 고정층에서 사라지고 해제하면 돌아온다(위
   * `showStickyCategoryRail`). 고정층이 줄면 그 아래 목록의 뷰포트가 그만큼 커지는데
   * 스크롤 오프셋은 그대로라, 읽고 있던 줄이 **위로 튄다**(반대로 돌아올 때는 아래로).
   * 목록 내용도 그 순간 통째로 바뀌므로(둘러보기 ↔ 검색 결과) 튄 자리에 남아 있을
   * 이유가 없다 — 맨 위가 옳은 자리이고, 그래야 "결과 수를 먼저 말한다"(§6.1)가
   * 화면에서 실제로 보인다.
   *
   * 애니메이션을 **끈다.** 탭 재탭(위)의 스크롤은 "같은 목록을 위로 되감는" 동작이라
   * 움직임이 뜻을 갖지만, 여기서는 목록이 교체되는 것이라 움직일 대상이 이미 없다.
   *
   * 오프셋 캐시를 손으로 0 으로 되돌린다 — `onScroll` 이 늦게 오면 탭 재탭이
   * "맨 위가 아니다" 로 잘못 판정한다(`isAtScrollTop` 이 읽는 값이 이 ref 다).
   */
  const resetListToTop = useCallback(() => {
    scrollOffsetRef.current = 0
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [])

  /**
   * 검색 확정. 키보드를 같이 내린다 — 결과 목록이 뜨는데 키보드가 절반을 덮고 있으면
   * "결과 수를 먼저 보여준다"(§6.1)가 무의미하다.
   */
  const handleCommitSearch = useCallback(
    (text?: string) => {
      search.commit(text)
      Keyboard.dismiss()
      resetListToTop()
    },
    [search, resetListToTop],
  )

  /** 검색 해제. 확정과 같은 이유로 목록을 맨 위로 되돌린다(고정층이 레일만큼 커진다). */
  const handleClearSearch = useCallback(() => {
    search.clear()
    resetListToTop()
  }, [search, resetListToTop])

  const handleRemoveFilter = useCallback(
    (group: RecipeFilterGroupKey, optionKey: string) => {
      setFilters((prev) => removeRecipeFilter(prev, group, optionKey))
    },
    [],
  )

  /**
   * 캐러셀은 **새 상태를 만들지 않는다** — 기존 필터 모델의 `category` 그룹을 토글한다.
   * 그래서 시트에서 고른 것과 캐러셀에서 고른 것이 같은 객체이고 어긋날 수 없다.
   *
   * 캐러셀은 **서버 표기**(`한식`)로 말하고 필터 모델은 **옵션 키**(`korean`)로 말한다.
   * 두 표기의 변환은 `recipeCategoryOptionKeyForQueryValue` 한 곳에만 있다 — 여기에
   * `한식 → korean` 표를 다시 적으면 그게 세 번째 진실이 된다. 모르는 값이면 아무 일도
   * 하지 않는다(다른 카테고리로 조용히 떨어뜨리지 않는다).
   */
  const handleToggleCategory = useCallback((categoryQueryValue: string) => {
    const optionKey = recipeCategoryOptionKeyForQueryValue(categoryQueryValue)
    if (optionKey == null) return
    // 카테고리는 **한 번에 하나**다(2026-08-04). 여러 개를 고르면 목록이 길어지고
    // 사용자가 원한 것은 "이 종류만 보기" 였다.
    setFilters((prev) => selectSingleRecipeFilter(prev, "category", optionKey))
  }, [])

  const handleClearCategories = useCallback(() => {
    setFilters((prev) => clearRecipeFilterGroup(prev, "category"))
  }, [])

  /** 캐러셀이 읽는 선택 상태 — 서버 표기 목록. 변환의 정본은 필터 모델이다. */
  const selectedCategoryQueryValues = useMemo(
    () => toRecipeListQueryFilters(filters).categories,
    [filters],
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
      <RNView style={styles.rowWrap}>
        {/* 사진 있는 줄. 사진이 아직 없는 큐레이션 175건은 같은 컴포넌트가 카테고리
            일러스트를 그린다 — `thumbnailUrl` 이 들어오는 날 UI 를 다시 만들지 않는다.
            줄의 높이·여백은 카드가 `recipeRowLayout` 에서 가져오므로 여기서는 좌우
            여백만 준다(줄마다 높이를 재정의하면 격자가 두 곳으로 갈라진다). */}
        <RecipePhotoCard card={item} variant="row" onPress={handleOpenRecipe} />
      </RNView>
    ),
    [handleOpenRecipe],
  )

  const keyExtractor = useCallback((item: RecipeCard) => String(item.id), [])

  /**
   * 줄 사이의 헤어라인. 카드 면을 없앤 대신 이것이 "여기서 한 줄이 끝난다" 를 말한다
   * (벤치마크 §D-21 "결과 사이는 얇은 divider, 결과 안은 촘촘하다").
   *
   * 왼쪽을 글자 시작선(`RECIPE_ROW_TEXT_INDENT`)에 맞춰 들여 쓴다 — 선이 썸네일까지
   * 가로지르면 목록이 표처럼 보이고, 화면 끝까지 그으면 섹션 경계와 구별되지 않는다.
   */
  const renderSeparator = useCallback(
    () => (
      <RNView
        style={[styles.rowSeparator, { backgroundColor: surface.hairline }]}
      />
    ),
    [surface.hairline],
  )

  /**
   * ②층 + ③층 머리말. 목록과 **같은 스크롤**에 둔다 — 섹션을 별 스크롤로 두면 세로
   * 스크롤이 두 겹이 되어 목록을 보려면 먼저 섹션을 지나야 하는 것을 손가락이 알 수 없다.
   *
   * **카테고리 레일은 여기 없다.** 2026-08-21 에 고정층(①)으로 올라갔다 — 사용자 지시
   * "카테고리 탭바도 스크롤에 영향 안 받게 통일하고 … 서치바 밑에". 그때 레일이 들고
   * 있던 `paddingBottom: showMealSections ? 18 : 8` 도 같이 없앴고 되살리면 안 된다:
   * 그 여백은 "레일과 그 아래 **내용** 사이" 였는데, 이제 레일 아래는 내용이 아니라
   * **다른 평면**이다. 고정층의 밑변은 무엇이 그 밑으로 흘러가든 같은 자리에서 잘라야
   * 하므로(안 그러면 여백이 목록 상태에 따라 달라진다) 그 자리는 고정층이 자기
   * `padBottom` 하나로 든다. 목록 쪽 첫 여백은 `contentContainerStyle.paddingTop` 이다.
   */
  const listHeader = useMemo(
    () => (
      <V2VStack style={{ paddingBottom: 4 }}>
        {showMealSections && (
          <>
            {homeIsError ? (
              /* 섹션을 못 받았다. 목록은 살아 있으니 층 하나만 접고 다시 시도를 준다. */
              <V2VStack
                paddingHorizontal={GUTTER}
                gap={6}
                style={{ paddingBottom: 18 }}
              >
                <V2Text
                  color={surface.textMuted}
                  style={{
                    fontSize: TYPE.caption.fontSize,
                    lineHeight: TYPE.caption.lineHeight,
                    letterSpacing: TYPE.caption.letterSpacing,
                  }}
                >
                  {tr("list.errorTitle")}
                </V2Text>
                <Pressable
                  onPress={() => void refetchHome()}
                  accessibilityRole="button"
                  accessibilityLabel={tr("list.retry")}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <V2Text
                    color={tokens.color.primary.val}
                    style={{ fontSize: 14, lineHeight: 20, fontWeight: "700" }}
                  >
                    {tr("list.retry")}
                  </V2Text>
                </Pressable>
              </V2VStack>
            ) : (
              <V2VStack gap={26} style={{ paddingBottom: 22 }}>
                {/*
                  왜 이 끼니부터인가 — **한 줄, 그리고 제목이 말하지 못하는 것만.**
                  시계 그대로면(그리고 하루가 넘어갔으면) `slotReason` 이 null 이라 이
                  자리는 통째로 없다. 넘어간 날은 제목이 직접 말하므로 여기서 또 말하면
                  같은 문장이 두 번 있는 셈이고, 그게 "있으나 없으나" 로 읽힌다.
                  낱말은 섹션 제목의 강조어와 **같은 키**다 — "아침" 을 위한 두 번째
                  번역 키를 만들면 두 곳이 조용히 갈라진다.
                */}
                {slotReason !== null && (
                  <V2Box paddingHorizontal={GUTTER}>
                    <V2Text
                      color={surface.textMuted}
                      style={{
                        fontSize: TYPE.caption.fontSize,
                        lineHeight: TYPE.caption.lineHeight,
                        letterSpacing: TYPE.caption.letterSpacing,
                      }}
                    >
                      {tr(slotReason.key, {
                        meal: tr(mealSlotWordKey(slotReason.mealSlot)),
                      })}
                    </V2Text>
                  </V2Box>
                )}
                {/*
                  순서는 **서버의 `sections` 배열 그대로**. 앱이 시계를 보고 정렬하지
                  않는다(계약 §2 — 기기 시계가 틀리면 섹션 순서가 사람마다 달라진다).
                  첫 조회 중에는 서버가 준 순서를 아직 모르므로 섹션 자체가 없다.
                */}
                {/*
                  날은 섹션마다 따로 묻는다. 하루가 넘어간 날에도 **넘어간 슬롯 하나만**
                  내일이고 나머지 둘은 오늘 끝낸 끼니(배지가 오늘의 사실을 말한다)라,
                  세 제목을 한꺼번에 "내일" 로 돌리면 제목과 배지가 어긋난다.
                */}
                {homeSections.map((section) => (
                  <RecipeMealSection
                    key={section.slot}
                    section={section}
                    day={resolveMealSectionDay(section.slot, homeSlotDecision)}
                    onPressItem={handleOpenRecipe}
                  />
                ))}
                {homeIsLoading && (
                  // 아래에 섹션이 더 붙는 중이다. 카드 실루엣으로 이어야 도착할 때 밀리지 않는다.
                  <V2Box justify="center" style={{ height: 168 }}>
                    <RecipeCarouselSkeleton />
                  </V2Box>
                )}
              </V2VStack>
            )}

            {/* ②층 ↔ ③층. 여기 한 곳에만 톤 경계를 둔다. */}
            <V2Box
              style={{
                height: LAYER_BAND_HEIGHT,
                backgroundColor: surface.surface,
              }}
            />

            <V2VStack
              paddingHorizontal={GUTTER}
              style={{ paddingTop: SECTION_GAP }}
            >
              <V2Text
                color={surface.textStrong}
                style={{
                  fontSize: TYPE.sectionTitle.fontSize,
                  lineHeight: TYPE.sectionTitle.lineHeight,
                  letterSpacing: TYPE.sectionTitle.letterSpacing,
                  fontWeight: "700",
                }}
              >
                {tr(RECIPE_HOME_LIST_TITLE_KEY)}
              </V2Text>
            </V2VStack>
          </>
        )}

        <V2VStack
          style={{ paddingTop: showMealSections ? spacing[4] : spacing[4] }}
        >
          {/*
            목록의 머리 — **제목/결과수 → 추정값 안내 → 정렬** 순서다.

            추정값 안내가 여기 있는 이유: 이 문장이 가리키는 것은 바로 아래 줄들의
            영양 수치다. 예전에는 결과 수와 **같은 줄의 오른쪽 끝**에 혼자 떠 있어서,
            무엇에 대한 말인지도, 왜 거기 있는지도 읽히지 않았다(지적 5번).
            왼쪽 `GUTTER` 에 맞춰 제목 바로 아래 붙이면 "아래 목록에 대한 단서" 로 읽힌다.

            provenance 를 카드마다 배지로 쌓지 않고 목록에 한 번만 알린다(§6.4) —
            176개 카드에 같은 배지를 붙이면 그것은 정보가 아니라 무늬가 된다.
          */}
          {/*
            결과 머리 한 줄. 예전에는 회색 잔글씨 두 줄이 정렬 칩 위에 떠 있었고,
            **로딩 중에는 아예 없다가 결과가 오면 생겨서** 아래 목록이 통째로 밀렸다
            (2026-08-02 QA: 스켈레톤에 없어서 레이아웃 시프트 + 시작선 어긋남).

            고친 방식 셋:
             1. 두 문장을 한 줄로 합친다 — 개수는 굵게(이 줄의 주인공), 추정값 안내는
                가운뎃점 뒤 보조. 잔글씨 두 줄이 쌓이면 무엇이 중요한지 사라진다.
             2. **높이를 항상 차지한다**(minHeight). 검색 전/로딩 중에도 자리가 비어
                있을 뿐이라 결과가 도착해도 아래가 밀리지 않는다.
             3. 시작선을 정렬 칩의 **글자**에 맞춘다. 칩은 면이 있어 안쪽 여백만큼
                글자가 밀리는데, 맨 글자인 이 줄을 GUTTER 에 두면 혼자 왼쪽으로 튀어
                나온 것처럼 보인다(그게 "혼자 시작선 안 맞는다" 의 정체다).
          */}
          <V2Box style={styles.resultHead}>
            {showResultCount && (
              <RNText
                style={[styles.resultCount, { color: surface.textStrong }]}
                numberOfLines={1}
              >
                {resultCountText}
                {showEstimateNotice ? (
                  <RNText style={{ color: surface.textMuted }}>
                    {`  ·  ${tr("list.estimateNotice")}`}
                  </RNText>
                ) : null}
              </RNText>
            )}
          </V2Box>

          {/*
            정렬 줄이 맨 글자에서 **칩**이 되면서 이 자리의 높이가 20 → 32 로 커졌다.
            위아래 여백을 그대로 두면 제목·목록에서 이 줄만 떠 보인다 — 칩의 면 자체가
            여백을 대신하므로 바깥 여백을 그만큼 줄인다(총 높이는 거의 그대로다).
          */}
          <V2VStack
            style={{ paddingTop: spacing[8], paddingBottom: spacing[2] }}
          >
            <RecipeSortRow sort={sort} onChange={setSort} />
          </V2VStack>
        </V2VStack>
      </V2VStack>
    ),
    [
      handleOpenRecipe,
      homeIsError,
      homeIsLoading,
      homeSections,
      homeSlotDecision,
      refetchHome,
      resultCountText,
      showEstimateNotice,
      showMealSections,
      showResultCount,
      slotReason,
      sort,
      surface,
      tr,
    ],
  )

  return (
    <V2VStack
      flex={1}
      style={{ backgroundColor: surface.canvas, paddingTop: insets.top }}
    >
      <FeatureIntroSheet
        feature="recipe"
        visible={recipeIntro.visible}
        onClose={recipeIntro.dismiss}
      />
      {/*
        ①층(고정부) — **제목줄 · 검색 · 카테고리 레일.** 셋 다 스크롤하지 않는다.

        레일이 여기 있는 이유(2026-08-21): 사용자가 실기기에서 두 가지를 한 번에
        지적했다 — 레일이 스크롤에 딸려 올라가는 것, 그리고 "검색↔카테고리" 가
        "제목↔검색" 보다 더 벌어져 보이는 것. 둘은 **같은 원인**이었다. 레일이 목록
        머리(`ListHeaderComponent`)에 있어서 두 요소가 서로 다른 스크롤 평면에 있었고,
        그래서 그 사이에는 고정층의 아래 패딩 + 레일 자신의 여백이 겹쳐 들어갔다.
        레일을 이 층으로 올리자 두 문제가 같이 사라진다 — 간격이 한 값이 되고
        (`RECIPE_STICKY.searchToRailGap`, 커뮤니티 탭과 **공유하는 상수**), 레일이
        스크롤에서 빠진다.

        ─── 아래 여백은 장식이 아니다 ──────────────────────────────────────────────
        이 블록은 스크롤하지 않고 목록이 그 **밑변에서 잘린다.** `padBottom` 이 없으면
        스크롤한 순간 카드 사진이 밑변에 딱 붙어 잘려서, 층이 겹친 것이 아니라
        **사진이 깨진 것처럼** 보인다(실측 2026-08-18). 그 밑변이 이제 검색창이 아니라
        **레일**이므로 처방을 새 경계로 옮겼다 — 그래서 패딩이 제목·검색 묶음이 아니라
        이 바깥 상자에 있다. 레일이 없는 상태(검색 중)에는 같은 패딩이 검색창 밑변을
        지킨다. 잘리는 자리가 어디든 여백은 하나여야 한다.

        하드라인(1px)은 **긋지 않는다.** 커뮤니티 레일은 이 자리에 선이 있지만, 그것은
        `CategoryChipRail` 자신의 실측 높이(64/52)에 선이 **포함된** 컴포넌트 계약이지
        "고정층 밑변에는 선을 긋는다" 는 규칙이 아니다. 이 화면은 배경이 위아래 모두
        `surface.canvas` 라 면의 단차가 없고, 그 상태의 전폭 1px 은 평면 경계가 아니라
        **내용 사이의 구분선**으로 읽힌다 — 이 파일 머리말이 경고하는 "층마다 선을 그으면
        무엇이 무엇의 부분인지 알 수 없다" 가 바로 그것이다(이 화면의 전폭 경계는
        ②↔③ 톤 밴드 하나뿐이고, 목록 줄 사이의 헤어라인은 글자 시작선까지 들여져 있다).
        면의 단차나 그림자를 도입하는 날 이 판단을 다시 하면 된다.
      */}
      <V2VStack
        style={{
          paddingTop: RECIPE_STICKY.padTop,
          paddingBottom: RECIPE_STICKY.padBottom,
        }}
      >
        <V2VStack
          paddingHorizontal={GUTTER}
          gap={RECIPE_STICKY.titleToSearchGap}
        >
          <V2HStack align="center" justify="space-between" gap={12}>
            <V2Text
              color={surface.textStrong}
              lineBreakStrategyIOS="hangul-word"
              style={{ fontSize: 22, lineHeight: 30, fontWeight: "700" }}
            >
              {t("recipe.title")}
            </V2Text>

            {/*
            헤더 액션 둘. **글자만 있던 것을 누를 수 있는 면으로 바꿨다.**

            `보관함` 은 지금까지 맨 글자였다(지적 8번). 회색 글자는 제목 옆의 부제처럼
            보여서 "눌러도 되는 것" 으로 읽히지 않는다 — 이 진입점이 없으면
            `app/recipe/saved.tsx` · `recent.tsx` 와 `RecipeArchiveScreen` 전체가 **어떤
            화면에서도 도달할 수 없다**(딥링크로만 열리는 화면이었다). 면과 아이콘을 줘서
            누를 수 있다는 사실을 모양이 말하게 한다.

            `쓰기` 는 플로팅에서 올라온 것이다(머리말 §플로팅). 스크롤을 따라오지
            않는 대신 목록을 아무것도 가리지 않는다.

            둘 다 **회색 면 + 회색 글자**다. 브랜드색을 쓰면 화면에 프라이머리가 둘이
            되고, 이 화면에서 주황은 "오늘 남은 양을 넘는다" 한 가지 뜻으로만 쓴다.
            아이콘만 두지 않고 낱말을 함께 두는 이유는 §6.4 다 — 북마크 아이콘 하나로는
            "저장한다" 인지 "저장한 것을 본다" 인지 알 수 없고, 카드 위 북마크와 같은
            모양이라 더 헷갈린다.
          */}
            <RNView style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr("archive.title")}
                onPress={() => router.push("/recipe/saved")}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.headerChip,
                  {
                    backgroundColor: pressed
                      ? surface.surfacePressed
                      : surface.surface,
                  },
                ]}
              >
                <Icon name="bookmark" size={15} color={surface.textMuted} />
                <RNText
                  style={[styles.headerChipLabel, { color: surface.text }]}
                >
                  {tr("archive.entry")}
                </RNText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                /*
                라벨은 칩에 보이는 `쓰기` 가 아니라 **`레시피 쓰기`** 로 읽힌다 —
                스크린리더에는 앞뒤 맥락이 없어서 `쓰기` 만으로는 무엇을 쓰는지 모른다.
              */
                accessibilityLabel={t("recipe.write")}
                onPress={() => router.push("/(write)/recipe/new")}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.headerChip,
                  {
                    backgroundColor: pressed
                      ? surface.surfacePressed
                      : surface.surface,
                  },
                ]}
              >
                <Icon name="pencil" size={15} color={surface.textMuted} />
                <RNText
                  style={[styles.headerChipLabel, { color: surface.text }]}
                >
                  {tr("list.writeEntry")}
                </RNText>
              </Pressable>
            </RNView>
          </V2HStack>

          <RecipeSearchField
            value={search.draft}
            onChangeText={search.setDraft}
            onSubmit={() => handleCommitSearch()}
            onClear={handleClearSearch}
            onFocus={search.focus}
            onBlur={search.blur}
            onOpenFilters={() => setFilterSheetOpen(true)}
            appliedFilterCount={appliedCount}
          />
        </V2VStack>

        {/*
          카테고리 레일. **좌우 여백을 여기서 주지 않는다** — 가로 스크롤 컨테이너에
          `paddingHorizontal` 을 주면 오른쪽 패딩이 스크롤 끝에서 잘려 마지막 칸이
          화면에 붙는다. 인셋은 레일 안쪽(`contentContainerStyle`)이 갖는다.

          `showStickyCategoryRail` 이 두 조건인 이유는 그 상수 주석에 있다.
        */}
        {showStickyCategoryRail && (
          <V2VStack style={{ paddingTop: RECIPE_STICKY.searchToRailGap }}>
            <RecipeCategoryCarousel
              selected={selectedCategoryQueryValues}
              onToggle={handleToggleCategory}
              onClearAll={handleClearCategories}
            />
          </V2VStack>
        )}
      </V2VStack>

      {search.showSuggestions ? (
        <RecipeSuggestPanel
          draft={search.draft}
          suggestions={search.suggestions}
          isSuggesting={search.isSuggesting}
          onSelect={(text) => handleCommitSearch(text)}
        />
      ) : (
        <>
          {/*
            ①층에 남는다 — 스크롤해도 걸려 있는 필터가 보여야 한다. 카테고리 칩만
            캐러셀이 보이는 동안 빠진다(위 §카테고리가 사는 자리).

            좌우 인셋을 여기서 주지 않는다 — 줄 안쪽(contentContainerStyle)이 갖는다.
            여기서 주면 가로 스크롤 뷰포트가 좁아져 칩이 화면 끝에서 잘린다.
          */}
          {visibleApplied.length > 0 && (
            <V2VStack style={{ paddingTop: 12 }}>
              <AppliedFilterRow
                applied={visibleApplied}
                onRemove={handleRemoveFilter}
                onClearAll={() => setFilters(EMPTY_RECIPE_FILTERS)}
              />
            </V2VStack>
          )}

          <FlashList
            ref={listRef}
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y
            }}
            scrollEventThrottle={16}
            data={list.items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={{ flex: 1 }}
            /*
              바닥 여백은 **여기**에 있다. `ListFooterComponent` 에 두면 다음 페이지를
              불러오는 동안 그 자리가 스피너로 바뀌면서 여백이 통째로 사라진다 —
              `onEndReachedThreshold` 가 0.6 이라 목록 끝에서는 거의 항상 불러오는
              중이고, 그래서 마지막 줄이 탭바·`AI 상담` 필에 잘렸다(지적 9번).
              `contentContainerStyle` 의 패딩은 어떤 상태에서도 사라지지 않는다.
            */
            contentContainerStyle={{
              paddingTop: spacing[12],
              paddingBottom: recipeListBottomInset(insets.bottom),
            }}
            ListHeaderComponent={listHeader}
            ItemSeparatorComponent={renderSeparator}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            /*
              FlatList 시절의 initialNumToRender/windowSize 튜닝과 "removeClippedSubviews
              를 못 쓴다"는 안드로이드 빈 캐러셀 우회는 FlashList 로 오면서 걷어냈다 —
              리사이클링이 그 둘이 하던 일을 대신한다(2026-08 마이그레이션).
            */
            onEndReached={list.loadMore}
            onEndReachedThreshold={0.6}
            {...refreshable.scrollProps}
            /*
              `refreshable.isRunning` 을 같이 태운다 — 4번(복구)에는 스피너가 없다.
              프로그램 새로고침은 `RefreshControl` 을 켜지 않기 때문이다
              (`useRefreshable` 머리말 4번: 켜면 iOS 가 스크롤을 밀어 두고 되돌리지
              않아 부를 때마다 위 여백이 쌓인다 — 이 화면에서 실측된 결함이다).
              빈 자리에만 그려지므로 목록이 있는 동안에는 아무 변화가 없고, 실제로
              켜지는 조합은 전면 오류를 복구하는 중이다.
            */
            ListEmptyComponent={
              list.isLoading || refreshable.isRunning ? (
                <RecipeListSkeleton />
              ) : list.isError ? (
                <V2VStack
                  paddingVertical={40}
                  paddingHorizontal={GUTTER}
                  align="center"
                  gap={6}
                >
                  {/*
                    문구를 화면이 고르지 않는다. `레시피를 불러오지 못했어요 /
                    연결을 확인한 뒤 다시 해 주세요` 는 400·500 에도 똑같이 떴고,
                    그러면 사용자는 고칠 수 없는 자기 와이파이를 의심한다.
                  */}
                  <V2Text
                    color={surface.textStrong}
                    lineBreakStrategyIOS="hangul-word"
                    textBreakStrategy="balanced"
                    style={{
                      fontSize: 15,
                      lineHeight: 21,
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    {listFailure.title}
                  </V2Text>
                  {listFailure.body ? (
                    <V2Text
                      color={surface.textMuted}
                      lineBreakStrategyIOS="hangul-word"
                      textBreakStrategy="balanced"
                      style={{
                        fontSize: 13,
                        lineHeight: 19,
                        textAlign: "center",
                      }}
                    >
                      {listFailure.body}
                    </V2Text>
                  ) : null}
                  <Pressable
                    onPress={() => void list.refetch()}
                    accessibilityRole="button"
                    accessibilityLabel={tr("list.retry")}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      marginTop: 8,
                    })}
                  >
                    <V2Text
                      color={tokens.color.primary.val}
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        fontWeight: "700",
                      }}
                    >
                      {tr("list.retry")}
                    </V2Text>
                  </Pressable>
                </V2VStack>
              ) : (
                <V2VStack
                  paddingVertical={40}
                  paddingHorizontal={GUTTER}
                  align="center"
                  gap={6}
                >
                  <V2Text
                    color={surface.textStrong}
                    style={{ fontSize: 15, lineHeight: 21, fontWeight: "600" }}
                  >
                    {search.isSearching
                      ? tr("feed.noResultsTitle")
                      : tr("list.emptyTitle")}
                  </V2Text>
                  <V2Text
                    color={surface.textMuted}
                    style={{
                      fontSize: 13,
                      lineHeight: 19,
                      textAlign: "center",
                    }}
                  >
                    {search.isSearching
                      ? tr("feed.noResultsBody")
                      : tr("list.emptyBody")}
                  </V2Text>
                </V2VStack>
              )
            }
            ListFooterComponent={
              list.isFetchingNextPage ? <RecipeListSkeleton count={2} /> : null
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

      {/*
        작성 진입점은 **둘**이다 — 헤더의 `쓰기` 칩과 이 플로팅 버튼.

        헤더 칩은 스크롤을 따라 올라가 버려서, 목록을 한참 내린 뒤에는 쓰려면 다시
        맨 위로 올라와야 했다(지적 2026-08-19). 커뮤니티는 같은 자리에 플로팅이
        있어 두 탭의 작성 동선이 달랐다.

        예전에 이 화면의 플로팅(`RecipeWriteFab`)을 없앤 이유는 **가림**이었다 —
        연필 FAB 이 스크롤 중 카드 글자를 덮었다. 그 문제는 여기서 두 가지로 막는다:
          · 브랜드 필은 `AI 상담` **위**에 쌓여 카드 본문 위가 아니라 화면 구석에 선다
          · `recipeListBottomInset()` 이 목록 바닥에서 그 두 필을 다 비운다
        즉 되돌린 것이 아니라, 가리지 않는 자리로 옮겨 다시 세운 것이다.

        목적지는 v2 작성 화면(`app/(write)/recipe/new.tsx` → `views/RecipeWriteScreen`)이다.
        예전 플로팅은 v1 `RecipeEditor` 모달을 열고 있었다 — 재료를 입력하면
        나트륨·칼륨이 실시간으로 계산되는 v2 폼은 **어느 화면에서도 열리지 않았다.**
        모달이 아니라 화면 전환인 이유: 작성은 사진·재료·조리 단계로 여러 단계를
        오가고, 모달 안에서 또 시트를 띄우면 뒤로 가기가 무엇을 닫는지 예측할 수 없다.
      */}
      <FloatingWriteButton
        label={t("recipe.write")}
        accessibilityLabel={t("recipe.write")}
        onPress={() => router.push("/(write)/recipe/new")}
      />
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    flexShrink: 0,
  },
  /**
   * 헤더 액션 칩. 높이 32 는 검색 필드(44)보다 낮아 **제목 줄의 부속**으로 읽힌다 —
   * 44 로 맞추면 제목과 같은 무게가 되어 무엇이 이 화면의 제목인지 흐려진다.
   */
  headerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    height: 32,
    paddingHorizontal: spacing[10],
    // 알약 모양. 실제 px(16)이 아니라 `radius.full` 을 쓴다(DS 규칙).
    borderRadius: radius.full,
  },
  headerChipLabel: {
    ...typography.label.xSmall,
  },

  /** 목록 줄의 좌우 여백. 세로 여백·높이는 카드가 격자에서 가져온다. */
  rowWrap: {
    paddingHorizontal: GUTTER,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: RECIPE_ROW_TEXT_INDENT,
  },

  /** 결과 수 — 검색·필터 중에만 나온다. 그냥 둘러볼 때 개수는 소음이다. */
  /**
   * 결과 머리 자리. **비어 있어도 높이를 차지한다** — 검색 전·로딩 중·결과 도착이
   * 모두 같은 높이라 목록이 밀리지 않는다(레이아웃 시프트 방지).
   */
  resultHead: {
    minHeight: 22,
    justifyContent: "center",
    // 칩의 글자 시작선과 맞춘다(GUTTER + 칩 안쪽 여백). 정렬 줄 바로 위라 이 줄만
    // GUTTER 에 두면 왼쪽으로 튀어나와 보인다.
    // 12 = 정렬 칩(size="s")의 paddingHorizontal(V2Chip SIZE.s).
    paddingHorizontal: GUTTER + 12,
    paddingTop: spacing[4],
  },
  resultCount: {
    ...typography.label.small,
    fontWeight: "700",
  },
})
