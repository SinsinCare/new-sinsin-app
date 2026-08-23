/**
 * 레시피 상세 — 레시피 v2 의 핵심 화면(계약 §6.2).
 *
 * v1 에는 이 화면이 **없었다**. 참고 서비스 3곳(만개의레시피·우리의식탁·NYT Cooking)이
 * 전부 상세 페이지 얘기인데 그게 없어서 제품이 없는 셈이었다.
 *
 * ─── 이 파일이 소유하는 상태 ───────────────────────────────────────────────
 * 인분(`servings`)을 화면이 갖는다. 재료 섹션이 갖고 있으면 **영양 카드가 따라올 수 없다** —
 * 계약이 요구하는 "인분을 바꾸면 영양도 같이 바뀐다"(결과 예측 가능)를 지키려면 두 섹션의
 * 공통 조상이 값을 들고 있어야 한다. 체크 상태도 여기 둔다(서버에 보내지 않는 화면 상태).
 *
 * ─── 기준 ─────────────────────────────────────────────────────────────
 * 응답의 `nutrition` 은 1인분 기준이고 `ingredients[].grams` 는 원문(=`servings` 인분) 기준이다.
 * 배율이 둘로 갈리는 이유와 스테퍼의 시작값은 `recipeDetailModel.ts` 머리말에 적어 뒀다.
 *
 * ─── 왜 `[id].tsx` 가 아니라 `[id]/index.tsx` 인가 (지우지 마라) ──────────────
 * `app/(write)/recipe/[id].tsx`(수정 스텁)와 이 파일은 **URL 이 같다**. `(write)` 는
 * 그룹이라 URL 에서 투명하기 때문에 둘 다 `/recipe/:id` 를 주장한다. expo-router 는
 * 패턴 문자열이 달라서(`(write)/recipe/:id` vs `recipe/:id`) 중복 예외를 던지지 않는다.
 *
 * 실측(expo-router 55.0.17, `getRoutes`+`getReactNavigationConfig`+fork `getStateFromPath`
 * 를 오프라인 호출): 이 파일이 `app/recipe/[id].tsx` 였을 때 `/recipe/7` 은 **여섯 가지
 * 진입 위치에서 전부** `(write)/recipe/[id]`(수정 스텁)로 갔다. 즉 이 상세 화면은
 * URL 로 도달할 수 없었고, `RecipeArchiveScreen` 의 `router.push('/recipe/{id}')` 는
 * "수정 기능이 없습니다" 화면을 열었다.
 *
 * 이유는 정렬자(`fork/getStateFromPath-forks.js::getRouteConfigSorter`)에 있다. 두 설정은
 * staticPartCount(`recipe` 1개)·parts(`recipe`,`:id`)·type(dynamic)이 모두 같아 승부가
 * 나지 않고, 마지막 `b.parts.length - a.parts.length` 가 0 이라 **설정 삽입 순서**가
 * 이긴다. 최상위 키 순서는 `…,(write),post/[id],recipe,restaurant` 로 `(write)` 가 앞이다.
 *
 * `index.tsx` 로 두면 `createConfig` 가 `isIndex` 에서 parts 에 `index` 를 밀어넣고
 * staticPartCount 를 1 올린다 → 2 vs 1 로 **구조적으로** 이긴다(삽입 순서에 기대지 않는다).
 * 실측: `/recipe/7` → `recipe / [id]/index`, `/recipe/saved`·`/recipe/recent` 는 그대로
 * 정적 세그먼트가 이긴다.
 *
 * 근본 해결은 수정 스텁을 `app/(write)/recipe/edit/[id].tsx` 로 옮기는 것이다(그 파일은
 * 내 담당 밖이라 손대지 않았다). 둘을 같이 적용해도 충돌하지 않는다 — 실측으로 확인했다.
 * **그때도 이 파일을 `[id].tsx` 로 되돌리지 마라.** 되돌리면 같은 사고가 되돌아온다.
 *
 * ─── 재설계 기록 (2026-07-31) ───────────────────────────────────────────────
 * 이 화면은 Tamagui + `useSurface`(legacy)로 그려져 있었다. design-system-v2 로 옮기면서
 * 구조도 같이 바꿨다. 되돌리기 전에 알아야 할 실측 사실 넷:
 *
 *  1. **레시피 사진이 하나도 없다.** dev DB 175건 중 `image_url`/`thumbnail_url`/
 *     `detail_image_url` 이 채워진 행이 0건이다 → `heroImageUrl` 은 항상 null.
 *     그래서 300pt 패럴랙스 히어로와 그 위에 뜬 반투명 검은 원(뒤로/저장/공유)은
 *     사진 위 컨트롤이 아니라 **글자 위 가림막**이었다(제목과 재료 줄을 실제로 덮었다).
 *     지금은 `V2ScreenHeader` + 본문 안 액션 알약이고, 사진은 있을 때만 카드로 들어간다.
 *  2. **서버는 레시피에 대한 개인 판정을 계산하지 않는다.** 응답에 있는 건 `budget` 과
 *     `percentOfRemaining` 뿐이다. 그러니 이 화면에 "나에게 맞다/아니다" 를 만들지 마라.
 *  3. **175/175 의 provenance 가 `reference_estimate`** 다. 영양 수치는 재료를 더한 값이
 *     아니라 한 그릇 단위로 받은 값이고, 재료 줄의 "식품표에 없다" 는 아무 숫자도 바꾸지
 *     않는다. 판단은 `ingredientUncertainty`/`ingredientCoverage` 한 곳에 있다.
 *  4. **리뷰는 진짜로 붙어 있다.** `PUT /recipes/{id}/reviews/mine` 이 200 을 주고
 *     summary 가 갱신되는 것을 확인했다. `리뷰 쓰기` 는 죽은 버튼이 아니다.
 *
 * 격자는 `@/src/design-system-v2` 의 `GUTTER`·`SECTION_GAP` 등을 쓴다. 식당 기능의
 * `layout.ts` 를 import 하지 않는다 — 기능 모듈끼리 의존하면 안 된다(그 파일 머리말 참고).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import Ionicons from "@expo/vector-icons/Ionicons"
import type { Href } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import {
  recipeV2Keys,
  flattenReviewPages,
  useMyReview,
  useRecipeDetailV2,
  useRecipeReviews,
  useRecipeSave,
} from "@/src/features/recipe/hooks/useRecipeDetailV2"
import { ARCHIVE_QUERY_ROOT } from "@/src/features/recipe/archive/useRecipeArchiveList"
import { showActionSheet, showConfirm } from "@/src/lib/dialog"
import { showSuccessToast } from "@/src/lib/toast"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import { recipeWriteService } from "@/src/features/recipe/services/recipeWriteService"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import {
  SECTION_BAND,
  SECTION_GAP,
  V2ScreenHeader,
  useV2Theme,
} from "@/src/design-system-v2"
import { presentError } from "@/src/lib/errorMessage"
import { ArticleSkeleton, ConfirmModal } from "@/src/shared/components"
import { classifyFetchFailure } from "@/src/shared/utils/fetchFailure"
import { STORE_REDIRECT_URL, recipeDeepLink } from "@/src/shared/utils/deepLink"
import { shareContent } from "@/src/shared/utils/share"
import {
  IngredientSection,
  NutritionCard,
  ProvenanceSheet,
  RecipeActionRow,
  RecipeFetchErrorState,
  RecipeHeroImage,
  RecipeTitleBlock,
  ReviewComposer,
  ReviewSection,
  StepSection,
  breakdownForDisplay,
  clampServings,
  ingredientScale,
  isServingAdjustable,
  parseRecipeId,
  scaleBreakdown,
  scaleIngredients,
  scaleNutrition,
  visibleReviews,
} from "@/src/features/recipe/components/detail"
import { RECIPE_DETAIL_REFRESH } from "@/src/features/recipe/refresh/scopes"
import { useRefreshable, useRevalidateOnReturn } from "@/src/shared/refresh"
import { useBlockedUsers } from "@/src/features/recipe/hooks/useBlockedUsers"
import type { ReviewSort } from "@/src/features/recipe/types/recipeV2"

const REVIEW_SORT: ReviewSort = "recent"

/**
 * 제목이 앱바로 올라오는 스크롤 지점(벤치마크 §B-6 "헤더가 접히면 제목이 앱바로 들어간다").
 * 제목 블록의 대략적인 높이다 — 정확한 측정을 위해 onLayout 을 붙이면 첫 프레임에
 * 레이아웃이 한 번 더 돌고, 이 화면에서 그만한 정밀도가 필요한 곳이 없다.
 */
const TITLE_HANDOFF_Y = 72

export default function RecipeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const recipeId = parseRecipeId(id)
  const router = useAppRouter()
  const { t } = useTranslation("recipe")
  const { colors, surface } = useV2Theme()
  const insets = useSafeAreaInsets()

  const detailQuery = useRecipeDetailV2(recipeId)
  /*
    상세에도 당김이 없었다 — 남이 방금 쓴 리뷰를 보려면 나갔다 다시 들어와야 했고,
    캐시가 살아 있으면 그래도 같은 화면이었다. 뿌리가 `recipe-v2`(단수) 라
    본문과 리뷰만 따라오고 뒤에 깔린 목록은 건드리지 않는다.
  */
  const refreshable = useRefreshable({
    queryKeys: RECIPE_DETAIL_REFRESH,
    scope: "recipe-detail",
  })
  useRevalidateOnReturn({ queryKeys: RECIPE_DETAIL_REFRESH })
  const detail = detailQuery.data
  const saveMutation = useRecipeSave(recipeId)
  const reviewsQuery = useRecipeReviews(recipeId, REVIEW_SORT)
  const { upsert, remove } = useMyReview(recipeId, REVIEW_SORT)

  const queryClient = useQueryClient()
  const [servings, setServings] = useState<number | null>(null)
  const [checkedOrdinals, setCheckedOrdinals] = useState<Set<number>>(
    () => new Set(),
  )
  const [provenanceOpen, setProvenanceOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [deleteAsking, setDeleteAsking] = useState(false)
  /** 차단 확인 중인 작성자 닉네임. `null` 이면 확인 창이 없다. */
  const [blockAsking, setBlockAsking] = useState<string | null>(null)
  const [titleInBar, setTitleInBar] = useState(false)
  const initializedIdRef = useRef<number | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  /**
   * **레시피가 바뀌면 스크롤과 앱바 제목을 처음으로 되돌린다.**
   *
   * expo-router 는 같은 라우트에서 파라미터만 바뀌면 이 컴포넌트를 **다시 만들지 않는다**.
   * 실측(딥링크 `/recipe/61` → `/recipe/71`): 화면은 새 레시피를 그렸는데 앱바에는 여전히
   * 제목이 떠 있어서 **큰 제목과 앱바 제목이 동시에** 보였다. `titleInBar` 가 이전 레시피의
   * 상태였기 때문이다. 스크롤 위치도 같은 이유로 남아, 긴 레시피에서 짧은 레시피로 옮기면
   * 중간부터 보이게 된다. 둘 다 여기서 끊는다.
   *
   * `detail` 이 아니라 `recipeId` 에 매다는 것이 중요하다 — `detail` 은 응답이 온 뒤에야
   * 바뀌므로 그 사이 한 프레임 동안 이전 화면의 스크롤이 남는다.
   */
  useEffect(() => {
    setTitleInBar(false)
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [recipeId])

  // 인분은 레시피가 **바뀔 때만** 초기화한다. 저장 낙관 갱신으로 detail 객체가 새로 와도
  // 사용자가 고른 인분이 되돌아가면 안 된다.
  useEffect(() => {
    if (detail == null) return
    if (initializedIdRef.current === detail.id) return
    initializedIdRef.current = detail.id
    setServings(clampServings(detail.servings ?? 1))
    setCheckedOrdinals(new Set())
  }, [detail])

  const handleToggleChecked = useCallback((ordinal: number) => {
    setCheckedOrdinals((previous) => {
      const next = new Set(previous)
      if (next.has(ordinal)) next.delete(ordinal)
      else next.add(ordinal)
      return next
    })
  }, [])

  /**
   * 상세에서 **나가는 길**. 오류 화면의 뒤로가기와 "레시피 목록으로" 가 둘 다 이걸 쓴다.
   *
   * 404 가 가장 잘 나는 경로가 딥링크(`sinsin:///recipe/1`)이고, 그때 이 화면은
   * **스택 맨 아래**라 뒤로 갈 곳이 없다. `useAppRouter` 의 `back()` 이 그 경우
   * 라우트 그래프가 정한 곳(레시피 탭)으로 대신 나간다.
   */
  const handleLeaveDetail = useCallback(() => {
    router.back()
  }, [router])

  /*
    ══════════════════ 내 레시피 — 수정 · 내리기 (계약 §3.8) ══════════════════

    **소유권은 서버가 정한다**(`detail.authored`). 앱이 닉네임을 비교해서 정하지
    않는다 — 화면이 "내 것" 이라고 믿는 것과 서버가 아는 것이 갈리면 그 차이는
    조용히 틀린 쪽으로 기운다(`content-ownership-server-authority`).
    서버도 `PUT`·`DELETE` 를 403 으로 막으므로 이 버튼은 **편의**이지 방벽이 아니다.
  */
  const [deleting, setDeleting] = useState(false)

  const handleEditRecipe = useCallback(async () => {
    if (detail == null) return
    // 시트 dismiss 전환(~220ms 지연 언마운트)과 스택 push 가 겹치지 않게 가라앉힌다.
    await afterModalTransitions()
    router.push(`/recipe/edit/${detail.id}` as Href)
  }, [detail, router])

  /*
    **내려간 것을 확인한 뒤에만 나간다.** 커뮤니티 글 삭제에서 실측된 결함이 그것이다 —
    요청을 쏘고 바로 back() 하면, 실패했을 때 사용자는 사라진 줄 알고 나가고 화면은
    아무 말도 하지 않는다. 실패하면 지우려던 레시피 위에 남아 이유를 듣는다.
  */
  const handleDeleteRecipe = useCallback(async () => {
    if (detail == null || deleting) return
    const confirmed = await showConfirm({
      title: t("recipeWrite.deleteTitle"),
      description: t("recipeWrite.deleteBody"),
      confirmLabel: t("recipeWrite.deleteConfirm"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (!confirmed) return
    await afterModalTransitions()

    setDeleting(true)
    try {
      await recipeWriteService.deleteRecipe(detail.id)
    } catch (error) {
      setDeleting(false)
      presentError(error, { scope: "recipe-delete" })
      return
    }
    /*
      내린 레시피는 목록·검색·홈·보관함 어디에도 남으면 안 된다. 서버가 `is_active`
      로 이미 막지만, 캐시에 남아 있으면 사용자는 방금 내린 것을 다시 본다.
      상세 캐시까지 지운다 — 뒤로 갔다 앞으로 오면 404 가 될 자리다.
    */
    await queryClient.invalidateQueries({ queryKey: recipeV2Keys.root })
    await queryClient.invalidateQueries({ queryKey: ARCHIVE_QUERY_ROOT })
    handleLeaveDetail()
    showSuccessToast(t("recipeWrite.deleted"))
  }, [detail, deleting, t, queryClient, handleLeaveDetail])

  const handleMoreRecipe = useCallback(async () => {
    const picked = await showActionSheet({
      title: undefined,
      actions: [
        { label: t("recipeWrite.editAction") },
        { label: t("recipeWrite.deleteConfirm"), destructive: true },
      ],
    })
    if (picked === 0) await handleEditRecipe()
    else if (picked === 1) await handleDeleteRecipe()
  }, [t, handleEditRecipe, handleDeleteRecipe])

  const handleShare = useCallback(() => {
    if (detail == null) return
    /*
      **레시피는 레시피처럼 말한다.**

      예전 본문은 `이름 + 요약` 두 줄이었다. 그건 식당 공유(`{이름} — 신신당부에서
      확인해 보세요`)와 모양이 같아서, 받은 사람은 이게 식당인지 음식인지 레시피인지
      알 수 없었다(QA 2026-08-05 "레시피 공유 메시지가 식당처럼 나간다"). 그래서
      무엇을 보내는지(`[신신당부 레시피]`)와 무엇을 얻는지(재료·만드는 법)를 본문이
      직접 말한다.

      링크는 두 종류가 필요하다. 딥링크는 **앱이 깔린 사람**을 그 레시피로 바로
      보내지만, 안 깔린 사람에게는 눌러지지도 않는 문자열이다. 그래서 본문에는
      스토어로 보내는 https 링크를 싣고(게시글 공유가 쓰는 것과 같은 한 줄),
      딥링크는 `link` 로 넘긴다.
    */
    const summary = detail.summary?.trim() ?? ""
    void shareContent({
      body: t(
        summary.length > 0
          ? "detail.shareMessage"
          : "detail.shareMessageNoSummary",
        { name: detail.name, summary, url: STORE_REDIRECT_URL },
      ),
      link: recipeDeepLink(detail.id),
      scope: "recipe-detail",
    })
  }, [detail, t])

  const handleToggleSave = useCallback(() => {
    if (detail == null || saveMutation.isPending) return
    saveMutation.mutate(!detail.saved, {
      // 화면 폴백(`저장 상태를 바꾸지 못했어요`)을 주지 않는다. 지워진 레시피를
      // 저장하려 한 것인지 세션이 끊긴 것인지는 서버 코드만 안다.
      onError: (error) => presentError(error, { scope: "recipe-save-toggle" }),
    })
  }, [detail, saveMutation])

  const handleSubmitReview = useCallback(
    (rating: number, body: string | null) => {
      upsert.mutate(
        { rating, body },
        {
          onSuccess: () => setComposerOpen(false),
        },
      )
    },
    [upsert],
  )

  const handleDeleteReview = useCallback(() => {
    setDeleteAsking(false)
    remove.mutate(undefined, {
      onError: (error) =>
        presentError(error, { scope: "recipe-review-delete" }),
    })
  }, [remove])

  const adjustable = detail != null && isServingAdjustable(detail)
  const selectedServings = servings ?? clampServings(detail?.servings ?? 1)
  /**
   * 영양 카드의 기준 인분. 조절할 수 없는 레시피는 응답 그대로 1인분을 보인다 —
   * 원본 인분을 모르는 채 "N인분 기준" 이라고 적을 수 없다.
   */
  const basisServings = adjustable ? selectedServings : 1

  const scaledIngredients = useMemo(
    () =>
      detail == null
        ? []
        : scaleIngredients(
            detail.ingredients,
            ingredientScale(detail.servings, selectedServings),
          ),
    [detail, selectedServings],
  )

  const scaledNutrition = useMemo(
    () =>
      detail?.nutrition == null
        ? null
        : scaleNutrition(detail.nutrition, basisServings),
    [basisServings, detail?.nutrition],
  )

  // 서버가 breakdown 을 비워 보내도 네 줄이 사라지지 않는다 — 규칙은
  // `breakdownForDisplay` 한 곳에 있고 단위 테스트가 지킨다.
  const scaledBreakdown = useMemo(
    () =>
      detail == null
        ? []
        : scaleBreakdown(
            breakdownForDisplay(detail.nutrientBreakdown, detail.nutrition),
            basisServings,
          ),
    [basisServings, detail],
  )

  /**
   * 차단한 사용자의 리뷰는 **그리기 전에** 뺀다.
   *
   * 이 앱의 다른 UGC(커뮤니티 글·댓글, 식당 후기)는 전부 신고·차단 경로를 갖고 있는데
   * 레시피 리뷰만 없었다 — 남이 쓴 글이 내 화면에 뜨는데 치울 방법이 없는 화면이 하나
   * 남아 있었다.
   *
   * 차단은 **사람 id** 기준이다(서버 alembic 088). 리뷰 응답의 `authorId` 가 그 축이고,
   * 판정은 커뮤니티와 같은 `isAuthorBlocked` 한 곳이다 — `visibleReviews` 는 순서와
   * "내 리뷰는 안 접는다" 만 책임진다.
   *
   * 서버도 같은 기준으로 이미 걸러서 준다. 여기 필터가 남아 있는 이유는 **차단 직후
   * 한 박자**다 — 서버 필터는 다음 조회부터 듣고, 이미 받아 둔 쪽에는 방금 차단한
   * 사람의 리뷰가 그대로 들어 있다.
   *
   * 별점 요약은 건드리지 않는다 — 그건 서버가 전체로 계산한 값이고, 한 명을 가렸다고
   * 앱에서 평균을 다시 내면 같은 레시피의 별점이 사람마다 달라진다. 그래서 목록 수와
   * 요약 수가 다를 수 있고, 그게 정상이다.
   */
  const { blockedAuthors, blockUser } = useBlockedUsers()
  const reviews = useMemo(
    () =>
      visibleReviews(
        flattenReviewPages(reviewsQuery.data?.pages),
        blockedAuthors,
      ),
    [reviewsQuery.data?.pages, blockedAuthors],
  )

  const handleConfirmBlock = useCallback(() => {
    if (blockAsking === null) return
    blockUser(blockAsking)
    setBlockAsking(null)
  }, [blockAsking, blockUser])

  /**
   * 파라미터를 id 로 읽지 못했다(`/recipe/abc`). 서버에 물어보지도 못한 경우지만 사용자가
   * 보는 상황은 "없는 레시피" 와 같아서 같은 화면을 쓴다.
   */
  if (recipeId == null) {
    return (
      <RecipeFetchErrorState
        kind={null}
        onRetry={handleLeaveDetail}
        onLeave={handleLeaveDetail}
      />
    )
  }

  if (detailQuery.isLoading) {
    return (
      <View
        style={[styles.flex, { backgroundColor: colors.background.default }]}
      >
        <V2ScreenHeader onBack={handleLeaveDetail} />
        <ArticleSkeleton variant="recipe" />
      </View>
    )
  }

  /**
   * 실패를 **원인별로** 그린다. 종전에는 갈래가 하나뿐이라 404 도 "인터넷 연결을 확인" 이
   * 됐다(`sinsin:///recipe/1` 로 재현). 분류는 `classifyFetchFailure`, 문구는
   * `recipeFailureCopy` 가 정하고 이 화면은 고르지 않는다.
   *
   * `detail == null` 인데 오류도 아닌 경우(캐시 비정상)는 남는데, 그때는 우리 쪽 결함이라
   * `REQUEST_REJECTED` 로 말한다 — "인터넷을 확인" 이라고 하지 않는 것이 핵심이다.
   */
  if (detailQuery.isError || detail == null) {
    const failureKind = detailQuery.isError
      ? classifyFetchFailure(detailQuery.error, "recipe-detail")
      : "REQUEST_REJECTED"
    return (
      <RecipeFetchErrorState
        kind={failureKind}
        onRetry={() => void detailQuery.refetch()}
        onLeave={handleLeaveDetail}
      />
    )
  }

  return (
    /*
      바닥이 연회색이다. 흰 블록이 그 위에 떠 있는 것처럼 보이게 하는 값이고,
      그래서 블록에 그림자나 테두리를 얹을 필요가 없다.

      **값은 `background.lower`(#f7f7f7)였다 — 그 의도가 성립하지 않는 값이었다**
      (2026-08-22). 흰 블록과의 명도차가 ΔL* **2.77** 뿐이라 블록이 뜨는 게 아니라
      바닥과 같은 평면으로 읽혔다. 우물(라이트 #eaeaec)로 내리면 같은 경계가
      **7.25** 가 된다 — 커뮤니티 피드·홈·마이페이지가 이미 쓰는 그 바닥이고,
      그래서 레시피 상세가 앱의 다른 "카드가 뜬 화면" 들과 같은 재료로 읽힌다.
      층의 정본은 `community/SectionHeader` 머리말 §층의 정본.
      다크는 `canvas`(#1f1f21)이고 블록(`background.default`)도 같은 값이라
      **예전과 똑같다** — 다크에서 층을 만드는 것은 원래 카드 쪽이었다.
    */
    <View
      style={[
        styles.flex,
        {
          backgroundColor: surface.bed,
        },
      ]}
    >
      {/*
       * 헤더는 **항상** 있고 절대 위치가 아니다. 종전의 떠 있는 반투명 원은 사진이 없는
       * 레시피에서 제목과 재료 줄을 덮었다(머리말 1번). 스크롤이 제목을 지나가면
       * 앱바가 레시피 이름을 받아 든다(벤치마크 §B-6).
       */}
      <V2ScreenHeader
        title={titleInBar ? detail.name : undefined}
        onBack={handleLeaveDetail}
        style={{ backgroundColor: colors.background.default }}
        right={
          /* 내 레시피에만 나온다. 남의 것에는 아무것도 더 붙이지 않는다. */
          detail.authored ? (
            <Pressable
              onPress={handleMoreRecipe}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel={t("recipeWrite.more")}
              hitSlop={12}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={deleting ? colors.label.assistive : colors.label.normal}
              />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + SECTION_GAP }}
        scrollEventThrottle={32}
        {...refreshable.scrollProps}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const y = event.nativeEvent.contentOffset.y
          setTitleInBar((previous) =>
            previous === y > TITLE_HANDOFF_Y ? previous : y > TITLE_HANDOFF_Y,
          )
        }}
      >
        <View style={styles.blocks}>
          <Block first>
            {/*
              이미지 섹션이 지면의 첫 블록이다 — 이 페이지가 무슨 요리인지 사진(없으면
              카테고리 그림)이 먼저 말하고 이름이 뒤따른다. 사진이 0건인 지금도 빈 띠가
              되지 않는 이유는 `RecipeHero` 머리말에 있다.
            */}
            <RecipeHeroImage
              imageUrl={detail.heroImageUrl}
              category={detail.category}
            />
            <RecipeTitleBlock
              name={detail.name}
              summary={detail.summary}
              description={detail.description}
              category={detail.category}
              timeMin={detail.timeMin}
              servings={detail.servings}
              difficulty={detail.difficulty}
              tags={detail.tags}
              author={detail.author}
              saveCount={detail.saveCount}
              authored={detail.authored}
              localeInfo={detail.localeInfo}
              rating={detail.rating}
            />
            <RecipeActionRow
              saved={detail.saved}
              saveBusy={saveMutation.isPending}
              onToggleSave={handleToggleSave}
              onShare={() => void handleShare()}
            />
          </Block>

          <Block>
            <NutritionCard
              nutrition={scaledNutrition}
              breakdown={scaledBreakdown}
              budget={detail.budget}
              servings={basisServings}
              onOpenProvenance={() => setProvenanceOpen(true)}
            />
          </Block>

          <Block>
            <IngredientSection
              ingredients={scaledIngredients}
              adjustable={adjustable}
              provenance={detail.nutrition?.provenance ?? "reference_estimate"}
              servings={selectedServings}
              onChangeServings={(next) => setServings(clampServings(next))}
              checkedOrdinals={checkedOrdinals}
              onToggleChecked={handleToggleChecked}
            />
          </Block>

          <Block>
            <StepSection steps={detail.steps} />
          </Block>

          <Block>
            <ReviewSection
              rating={detail.rating}
              myReview={detail.myReview}
              reviews={reviews}
              isLoading={reviewsQuery.isLoading}
              hasMore={Boolean(reviewsQuery.hasNextPage)}
              isFetchingMore={reviewsQuery.isFetchingNextPage}
              onLoadMore={() => void reviewsQuery.fetchNextPage()}
              onWrite={() => setComposerOpen(true)}
              onDeleteMine={() => setDeleteAsking(true)}
              isDeleting={remove.isPending}
              onBlockAuthor={(nickName) => setBlockAsking(nickName)}
            />
          </Block>
        </View>
      </ScrollView>

      <ProvenanceSheet
        visible={provenanceOpen}
        onClose={() => setProvenanceOpen(false)}
        nutrition={scaledNutrition}
      />

      <ReviewComposer
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        recipeName={detail.name}
        recipeImageUrl={detail.heroImageUrl}
        myReview={detail.myReview}
        isSubmitting={upsert.isPending}
        hasError={upsert.isError}
        onSubmit={handleSubmitReview}
      />

      {/* 차단은 되돌릴 수 있지만(설정 → 차단 목록) 그 사실을 본문이 말해 준다. */}
      <ConfirmModal
        visible={blockAsking !== null}
        title={t("detail.reviews.blockTitle")}
        description={t("detail.reviews.blockBody", { name: blockAsking ?? "" })}
        confirmText={t("detail.reviews.blockConfirm")}
        onCancel={() => setBlockAsking(null)}
        onConfirm={handleConfirmBlock}
      />

      <ConfirmModal
        visible={deleteAsking}
        title={t("detail.reviews.deleteTitle")}
        description={t("detail.reviews.deleteBody")}
        confirmText={t("action.delete")}
        onCancel={() => setDeleteAsking(false)}
        onConfirm={handleDeleteReview}
      />
    </View>
  )
}

/**
 * 섹션 하나 = 흰 블록 하나. 화면 바닥은 연회색이라 **블록 사이의 회색 띠가 곧 구분선**이다.
 * 실선(hairline)·그림자·테두리를 쓰지 않는다 — 다섯 섹션에 선을 그으면 화면에 가로줄이
 * 다섯 개 생기고, 그 줄들이 제목·수치와 같은 세기로 눈에 들어온다. 위계는 선이 아니라
 * 면과 여백으로 만든다(벤치마크 §F-P4 "정보 블록을 둥근 카드로 묶는다"의 화면 버전).
 *
 * 안쪽 좌우 여백은 블록이 갖지 않는다 — **각 섹션 컴포넌트가 `GUTTER` 를 스스로 쓴다.**
 * 그래야 제목·본문·재료 줄이 전부 같은 왼쪽 시작선에 선다. 여기서 한 번 더 주면
 * 시작선이 두 겹으로 밀린다(공용 격자 `layout.ts` 머리말의 "세 번째 시작선").
 */
function Block({
  children,
  first = false,
}: {
  children: React.ReactNode
  first?: boolean
}) {
  const { colors } = useV2Theme()
  return (
    <View
      style={[
        styles.block,
        {
          backgroundColor: colors.background.default,
          // 첫 블록은 헤더에 이어 붙어야 한다 — 헤더와 같은 흰 면인데 위에 여백을 주면
          // 제목이 이유 없이 아래로 밀린 것처럼 보인다.
          paddingTop: first ? 0 : SECTION_GAP,
        },
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  blocks: { gap: SECTION_BAND },
  block: { paddingBottom: SECTION_GAP, gap: SECTION_GAP },
})
