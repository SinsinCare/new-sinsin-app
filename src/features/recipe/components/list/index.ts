export { AppliedFilterRow } from "./AppliedFilterRow"
export { RecipeFilterSheet } from "./RecipeFilterSheet"

/**
 * `RecipeListCard` 는 없어졌다. 마지막 사용처가 보관함이었고, 그동안 같은 레시피가
 * 목록에서는 72pt 타일 줄로, 보관함에서는 옛 카드로 **두 가지 모양**으로 보였다.
 * 줄 카드는 `RecipePhotoCard variant="row"` 하나뿐이다 — 두 벌을 두면 한쪽만 고쳐진다.
 */

export {
  RECIPE_CATEGORY_ART,
  RecipeCategoryArt,
  resolveRecipeCategoryArt,
} from "./RecipeCategoryArt"
export type { RecipeCategoryArtEntry } from "./RecipeCategoryArt"

/**
 * 카테고리 매핑·캐러셀 항목 계산의 **정본은 모델 모듈**이다(`recipeCategoryArtModel.ts`).
 * 컴포넌트에서 내보내면 `react-native`/`*.svg` 를 함께 끌고 와 jest(node)에서 판정을
 * 검증할 수 없다 — 그래서 순수 함수는 모델에서, 컴포넌트는 컴포넌트에서 내보낸다.
 */
export {
  buildRecipeCategoryCarouselItems,
  RECIPE_CATEGORY_ART_KEYS,
  RECIPE_CATEGORY_KEYS_WITH_ROWS,
  RECIPE_CATEGORY_MATCH,
  recipeCategoryOptionKeyForQueryValue,
  resolveRecipeCategoryArtKey,
} from "./recipeCategoryArtModel"
export type {
  RecipeCategoryArtKey,
  RecipeCategoryCarouselItemModel,
  RecipeCategoryMatchEntry,
} from "./recipeCategoryArtModel"

export { RecipeCategoryCarousel } from "./RecipeCategoryCarousel"
export { RecipeMealSection } from "./RecipeMealSection"
export type {
  RecipeCategoryCarouselItem,
  RecipeCategoryCarouselProps,
} from "./RecipeCategoryCarousel"

export {
  RECIPE_PHOTO_CARD_GAP,
  RECIPE_PHOTO_CARD_WIDTH,
  RecipePhotoCard,
} from "./RecipePhotoCard"
export type { RecipePhotoCardProps } from "./RecipePhotoCard"
export {
  RecipeCarouselSkeleton,
  RecipeListSkeleton,
  RecipeRowSkeleton,
} from "./RecipeSkeletons"
export { RecipeSearchField } from "./RecipeSearchField"
export { RecipeSortRow } from "./RecipeSortRow"
export { RecipeSuggestPanel } from "./RecipeSuggestPanel"
/**
 * `RecipeWriteFab` 은 없어졌다. 화면 오른쪽 아래에 플로팅이 **둘**(주황 연필 + 전역 검정
 * `AI 상담`) 쌓여 있었고, 연필이 카드 글자를 덮었다(실측). 작성 진입점은 헤더의
 * 액션 칩으로 옮겼다 — 자세한 근거는 `app/(tabs)/recipe.tsx` 머리말 §플로팅.
 *
 * 목록 바닥 여백은 이제 순수 모듈이 계산한다. 컴포넌트 안에 있으면 node 환경 jest 가
 * 파싱하지 못해 "마지막 줄이 필에 가리지 않는가" 를 검증할 수 없다.
 */
export {
  RECIPE_LIST_BOTTOM_INSET,
  RECIPE_ROW_ART,
  RECIPE_ROW_HEIGHT,
  RECIPE_ROW_PAD_V,
  RECIPE_ROW_TEXT_INDENT,
  RECIPE_ROW_THUMB,
  RECIPE_ROW_THUMB_GAP,
  RECIPE_ROW_THUMB_RADIUS,
} from "./recipeRowLayout"

export {
  CARD_TAG_CHAR_BUDGET,
  CARD_TAG_MAX_COUNT,
  CLINICAL_TAG_TOKENS,
  formatNutrientAmount,
  groupThousands,
  hasEstimatedNutrition,
  isClinicalTag,
  HEADLINE_OVER_BUDGET_PERCENT,
  joinMetaParts,
  resolveCardBookmark,
  resolveCardHeadline,
  resolveCardMeta,
  resolveCardMetaTokens,
  resolveCardPhotoSlot,
  resolveCardRating,
  resolveCardTags,
  resolveHeadlineEmphasis,
  resolvePhotoWellGeometry,
} from "./recipeCardFormat"
export type {
  CardBookmarkDisplay,
  CardMetaTokens,
  CardPhotoSlot,
  HeadlineEmphasis,
  PhotoWellGeometry,
} from "./recipeCardFormat"

export {
  clearRecipeFilters,
  countRecipeFilters,
  EMPTY_RECIPE_FILTERS,
  listAppliedRecipeFilters,
  RECIPE_FILTER_GROUP_VIEWS,
  RECIPE_FILTER_GROUPS,
  removeRecipeFilter,
  toggleRecipeFilter,
  toRecipeListQueryFilters,
} from "./recipeListFilterModel"
export type {
  AppliedRecipeFilter,
  RecipeFilterGroupKey,
  RecipeFilterGroupView,
  RecipeFilterLabelKey,
  RecipeFilterOption,
  RecipeFilterSelection,
} from "./recipeListFilterModel"

export {
  categoryFilterAffordances,
  mealSectionCopyKeys,
  mealSlotStateBadgeKey,
  RECIPE_HOME_EMPTY_COPY_KEY,
  RECIPE_HOME_LIST_TITLE_KEY,
  resolveMealSectionBody,
  resolveRecipeBrowseLayout,
  resolveSlotReasonCopy,
  splitTitleHighlight,
  visibleAppliedRecipeFilters,
} from "./recipeHomePresentation"
export type {
  CategoryFilterAffordance,
  MealSectionBody,
  RecipeBrowseLayout,
  RecipeBrowseLayoutInput,
  SlotReasonCopy,
  SplitTitle,
} from "./recipeHomePresentation"

export {
  resolveResultCount,
  shouldShowSuggestions,
} from "./recipeListPresentation"
export type { ResultCount, ResultCountKind } from "./recipeListPresentation"
