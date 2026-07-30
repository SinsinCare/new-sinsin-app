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
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Share,
  StyleSheet,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { Text, View, YStack } from "tamagui"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { showErrorToast } from "@/src/lib/toast"
import { ConfirmModal } from "@/src/shared/components"
import {
  IngredientSection,
  NutritionCard,
  ProvenanceSheet,
  RecipeDetailTopBar,
  RecipeHeroImage,
  RecipeTitleBlock,
  ReviewComposer,
  ReviewSection,
  StepSection,
  breakdownForDisplay,
  clampServings,
  heroHeight,
  ingredientScale,
  isServingAdjustable,
  parseRecipeId,
  scaleBreakdown,
  scaleIngredients,
  scaleNutrition,
} from "@/src/features/recipe/components/detail"
import {
  flattenReviewPages,
  useMyReview,
  useRecipeDetailV2,
  useRecipeReviews,
  useRecipeSave,
} from "@/src/features/recipe/hooks/useRecipeDetailV2"
import type { ReviewSort } from "@/src/features/recipe/types/recipeV2"

const REVIEW_SORT: ReviewSort = "recent"

export default function RecipeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const recipeId = parseRecipeId(id)
  const router = useRouter()
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const insets = useSafeAreaInsets()

  const scrollY = useRef(new Animated.Value(0)).current
  const detailQuery = useRecipeDetailV2(recipeId)
  const detail = detailQuery.data
  const saveMutation = useRecipeSave(recipeId)
  const reviewsQuery = useRecipeReviews(recipeId, REVIEW_SORT)
  const { upsert, remove } = useMyReview(recipeId, REVIEW_SORT)

  const [servings, setServings] = useState<number | null>(null)
  const [checkedOrdinals, setCheckedOrdinals] = useState<Set<number>>(
    () => new Set(),
  )
  const [provenanceOpen, setProvenanceOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [deleteAsking, setDeleteAsking] = useState(false)
  const initializedIdRef = useRef<number | null>(null)

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

  const handleShare = useCallback(async () => {
    if (detail == null) return
    const message = [detail.name, detail.summary]
      .filter((line): line is string => Boolean(line))
      .join("\n")
    try {
      await Share.share({ message })
    } catch {
      // 공유 시트를 닫은 것도 여기로 온다. 실패를 알릴 일이 아니다.
    }
  }, [detail])

  const handleToggleSave = useCallback(() => {
    if (detail == null || saveMutation.isPending) return
    saveMutation.mutate(!detail.saved, {
      onError: () => showErrorToast(t("detail.saveFailed")),
    })
  }, [detail, saveMutation, t])

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
      onError: () => showErrorToast(t("detail.reviews.deleteError")),
    })
  }, [remove, t])

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

  const reviews = flattenReviewPages(reviewsQuery.data?.pages)
  const heroTop = insets.top + 4

  if (recipeId == null) {
    return (
      <CenteredMessage
        message={t("detail.notFound")}
        paddingTop={insets.top + 40}
      />
    )
  }

  if (detailQuery.isLoading) {
    return (
      <YStack
        flex={1}
        backgroundColor={surface.canvas}
        alignItems="center"
        justifyContent="center"
        gap={12}
      >
        <ActivityIndicator color={surface.brand} />
        <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
          {t("detail.loading")}
        </Text>
      </YStack>
    )
  }

  if (detailQuery.isError || detail == null) {
    return (
      <YStack
        flex={1}
        backgroundColor={surface.canvas}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={LAYOUT.screenX}
        gap={8}
      >
        <Text {...TYPE.cardTitle} fontFamily="$body" color={surface.textStrong}>
          {t("detail.errorTitle")}
        </Text>
        <Text
          {...TYPE.caption}
          fontFamily="$body"
          color={surface.textMuted}
          textAlign="center"
        >
          {t("detail.errorBody")}
        </Text>
        <Pressable
          onPress={() => void detailQuery.refetch()}
          accessibilityRole="button"
          accessibilityLabel={t("detail.retry")}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View
            marginTop={8}
            height={LAYOUT.ctaCompact.height}
            paddingHorizontal={24}
            borderRadius={LAYOUT.ctaCompact.radius}
            backgroundColor={surface.surface}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              {...TYPE.cta}
              fontFamily="$body"
              fontWeight="600"
              color={surface.textStrong}
            >
              {t("detail.retry")}
            </Text>
          </View>
        </Pressable>
      </YStack>
    )
  }

  return (
    <View flex={1} backgroundColor={surface.canvas}>
      <RecipeHeroImage imageUrl={detail.heroImageUrl} scrollY={scrollY} />

      <Animated.ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: heroHeight(detail.heroImageUrl),
          paddingBottom: insets.bottom + 48,
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        <YStack
          backgroundColor={surface.canvas}
          borderTopLeftRadius={detail.heroImageUrl ? 20 : 0}
          borderTopRightRadius={detail.heroImageUrl ? 20 : 0}
          paddingHorizontal={LAYOUT.screenX}
          paddingTop={20}
          gap={24}
        >
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
          />

          <Divider />

          <NutritionCard
            nutrition={scaledNutrition}
            breakdown={scaledBreakdown}
            budget={detail.budget}
            servings={basisServings}
            onOpenProvenance={() => setProvenanceOpen(true)}
          />

          <Divider />

          <IngredientSection
            ingredients={scaledIngredients}
            adjustable={adjustable}
            provenance={detail.nutrition?.provenance ?? "reference_estimate"}
            servings={selectedServings}
            onChangeServings={(next) => setServings(clampServings(next))}
            checkedOrdinals={checkedOrdinals}
            onToggleChecked={handleToggleChecked}
          />

          <Divider />

          <StepSection steps={detail.steps} />

          <Divider />

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
          />
        </YStack>
      </Animated.ScrollView>

      <RecipeDetailTopBar
        top={heroTop}
        saved={detail.saved}
        saveBusy={saveMutation.isPending}
        onBack={() => router.back()}
        onToggleSave={handleToggleSave}
        onShare={() => void handleShare()}
      />

      <ProvenanceSheet
        visible={provenanceOpen}
        onClose={() => setProvenanceOpen(false)}
        nutrition={scaledNutrition}
      />

      <ReviewComposer
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        myReview={detail.myReview}
        isSubmitting={upsert.isPending}
        hasError={upsert.isError}
        onSubmit={handleSubmitReview}
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

function Divider() {
  const surface = useSurface()
  return <View height={1} backgroundColor={surface.hairline} />
}

function CenteredMessage({
  message,
  paddingTop,
}: {
  message: string
  paddingTop: number
}) {
  const surface = useSurface()
  return (
    <YStack
      flex={1}
      backgroundColor={surface.canvas}
      alignItems="center"
      paddingTop={paddingTop}
      paddingHorizontal={LAYOUT.screenX}
    >
      <Text {...TYPE.value} fontFamily="$body" color={surface.textMuted}>
        {message}
      </Text>
    </YStack>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
