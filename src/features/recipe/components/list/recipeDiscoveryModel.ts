import type { MealSlot, RecipeHomeSection } from "../../types/recipeHome"

/** Keep server priority on first load, but preserve an explicit meal selection on refetch. */
export function selectRecipeMealSection(
  sections: readonly RecipeHomeSection[],
  selected: MealSlot | null,
): RecipeHomeSection | null {
  return (
    sections.find((section) => section.slot === selected) ?? sections[0] ?? null
  )
}
