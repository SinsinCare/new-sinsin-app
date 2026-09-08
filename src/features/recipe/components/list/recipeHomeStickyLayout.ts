import { SEARCH_TO_RAIL_GAP } from "@/src/design-system-v2/tokens/layout"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

/** Compact text categories retain 44 pt touch targets and a fixed location below search. */
export const RECIPE_CATEGORY_RAIL = {
  chipHeight: 32,
  slotPadV: spacing[6],
} as const
export function recipeCategoryRailHeight(): number {
  return RECIPE_CATEGORY_RAIL.chipHeight + RECIPE_CATEGORY_RAIL.slotPadV * 2
}
export const RECIPE_STICKY = {
  padTop: spacing[12],
  titleToSearchGap: spacing[12],
  searchToRailGap: SEARCH_TO_RAIL_GAP,
  padBottom: spacing[8],
} as const
export const RECIPE_STICKY_TITLE_ROW = 32
export const RECIPE_SEARCH_FIELD_HEIGHT = 44
export function recipeHomeStickyHeight({
  hasRail,
}: {
  hasRail: boolean
}): number {
  const base =
    RECIPE_STICKY.padTop +
    RECIPE_STICKY_TITLE_ROW +
    RECIPE_STICKY.titleToSearchGap +
    RECIPE_SEARCH_FIELD_HEIGHT +
    RECIPE_STICKY.padBottom
  return (
    base +
    (hasRail ? RECIPE_STICKY.searchToRailGap + recipeCategoryRailHeight() : 0)
  )
}
export const RECIPE_STICKY_BUDGET_SCREEN_HEIGHT = 812
export const RECIPE_STICKY_BUDGET = RECIPE_STICKY_BUDGET_SCREEN_HEIGHT / 4
