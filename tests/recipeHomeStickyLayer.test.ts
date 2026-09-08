import fs from "node:fs"
import path from "node:path"
import { SEARCH_TO_RAIL_GAP } from "../src/design-system-v2/tokens/layout"
import {
  RECIPE_CATEGORY_RAIL,
  RECIPE_STICKY,
  RECIPE_STICKY_BUDGET,
  recipeCategoryRailHeight,
  recipeHomeStickyHeight,
} from "../src/features/recipe/components/list/recipeHomeStickyLayout"

const read = (file: string) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8")
const screen = read("src/features/recipe/views/RecipeHomeScreen.tsx")
const chrome = read(
  "src/features/recipe/components/list/RecipeBrowseChrome.tsx",
)
const controller = read("src/features/recipe/hooks/useRecipeBrowseScreen.ts")

describe("compact recipe browse navigation", () => {
  it("keeps the search and category controls outside the recipe list", () => {
    expect(screen.indexOf("<RecipeBrowseHeader")).toBeLessThan(
      screen.indexOf("<FlashList"),
    )
    expect(chrome.indexOf("<RecipeSearchField")).toBeLessThan(
      chrome.indexOf("<RecipeCategoryCarousel"),
    )
    expect(screen).not.toContain("<RecipeCategoryCarousel")
  })
  it("keeps saved recipes and writing reachable without duplicating a floating button", () => {
    expect(screen).toContain('router.push("/recipe/saved")')
    expect(screen).toContain('router.push("/(write)/recipe/new")')
    expect(chrome).toContain("onPress={onOpenSaved}")
    expect(chrome).toContain("onPress={onWrite}")
    expect(screen).not.toContain("FloatingWriteButton")
  })
  it("does not attach the category bar to suggestions or committed search results", () => {
    expect(controller).toContain(
      "showCategoryCarousel && !search.showSuggestions",
    )
    expect(chrome).toContain("m.showStickyCategoryRail")
  })
  it("resets both the visible list and its cached offset when committing or clearing search", () => {
    expect(controller).toContain("scrollOffsetRef.current = 0")
    const actions = controller.slice(
      controller.indexOf("const handleCommitSearch"),
      controller.indexOf("const handleRemoveFilter"),
    )
    expect(actions.match(/resetListToTop\(\)/g)).toHaveLength(2)
    expect(screen).toContain(
      "maintainVisibleContentPosition={{ disabled: true }}",
    )
  })
})
describe("recipe sticky controls fit compact screens", () => {
  it("preserves a 44pt category target while using a 32pt visible chip", () => {
    expect(RECIPE_CATEGORY_RAIL.chipHeight).toBe(32)
    expect(recipeCategoryRailHeight()).toBeGreaterThanOrEqual(44)
    expect(recipeCategoryRailHeight()).toBe(
      RECIPE_CATEGORY_RAIL.chipHeight + 2 * RECIPE_CATEGORY_RAIL.slotPadV,
    )
  })
  it("uses the shared search-to-category rhythm", () => {
    expect(RECIPE_STICKY.searchToRailGap).toBe(SEARCH_TO_RAIL_GAP)
    expect(RECIPE_STICKY.searchToRailGap).toBeLessThan(
      RECIPE_STICKY.titleToSearchGap,
    )
  })
  it("leaves at least three quarters of an 812pt screen below the sticky controls", () => {
    expect(recipeHomeStickyHeight({ hasRail: true })).toBeLessThanOrEqual(
      RECIPE_STICKY_BUDGET,
    )
    expect(
      recipeHomeStickyHeight({ hasRail: true }) -
        recipeHomeStickyHeight({ hasRail: false }),
    ).toBe(RECIPE_STICKY.searchToRailGap + recipeCategoryRailHeight())
  })
})
