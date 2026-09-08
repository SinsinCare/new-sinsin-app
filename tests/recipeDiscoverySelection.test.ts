import { selectRecipeMealSection } from "../src/features/recipe/components/list/recipeDiscoveryModel"
import {
  EMPTY_RECIPE_FILTERS,
  toggleRecipeFilter,
  toRecipeListQueryFilters,
  clearRecipeFilterGroup,
} from "../src/features/recipe/components/list/recipeListFilterModel"
import type { RecipeHomeSection } from "../src/features/recipe/types/recipeHome"

const sections: RecipeHomeSection[] = [
  { slot: "LUNCH", state: "OPEN", items: [] },
  { slot: "DINNER", state: "OPEN", items: [] },
  { slot: "BREAKFAST", state: "RECORDED", items: [] },
]
describe("meal selection follows the server until the reader chooses", () => {
  it("uses server priority instead of the client clock", () => {
    expect(selectRecipeMealSection(sections, null)?.slot).toBe("LUNCH")
  })
  it("preserves an explicitly selected recorded or empty meal on refetch", () => {
    expect(selectRecipeMealSection(sections, "BREAKFAST")).toBe(sections[2])
    expect(selectRecipeMealSection([...sections].reverse(), "LUNCH")).toBe(
      sections[0],
    )
  })
  it("handles unavailable sections without fabricating content", () => {
    expect(selectRecipeMealSection([], "BREAKFAST")).toBeNull()
    expect(selectRecipeMealSection(sections.slice(0, 1), "BREAKFAST")).toBe(
      sections[0],
    )
  })
})
describe("category bar and filter sheet share multiple selection", () => {
  it("adds a second category and removes only the tapped category", () => {
    const first = toggleRecipeFilter(EMPTY_RECIPE_FILTERS, "category", "korean")
    const second = toggleRecipeFilter(first, "category", "chinese")
    expect(toRecipeListQueryFilters(second).categories).toEqual([
      "한식",
      "중식",
    ])
    expect(
      toRecipeListQueryFilters(toggleRecipeFilter(second, "category", "korean"))
        .categories,
    ).toEqual(["중식"])
  })
  it("all categories does not clear independently chosen nutrition criteria", () => {
    const filtered = toggleRecipeFilter(
      toggleRecipeFilter(EMPTY_RECIPE_FILTERS, "nutrition", "low-salt"),
      "category",
      "korean",
    )
    expect(
      toRecipeListQueryFilters(clearRecipeFilterGroup(filtered, "category")),
    ).toEqual({ categories: [], tags: ["저염"] })
  })
})
