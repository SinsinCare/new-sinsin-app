import i18n from "../src/i18n"
import enRecipe from "../src/i18n/locales/en/recipe.json"
import koRecipe from "../src/i18n/locales/ko/recipe.json"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe("recipe translations", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("keeps Korean and English recipe keys in sync", () => {
    expect(leafKeys(enRecipe).sort()).toEqual(leafKeys(koRecipe).sort())
  })

  it("switches recipe, community, and poll copy without restarting", async () => {
    await i18n.changeLanguage("en")
    expect(i18n.t("recipeEditor.title", { ns: "recipe" })).toBe("New recipe")
    expect(i18n.t("category.post.dining-out", { ns: "recipe" })).toBe(
      "Dining out",
    )
    expect(i18n.t("poll.participants", { ns: "recipe", count: 12 })).toBe(
      "12 votes",
    )
    expect(i18n.t("poll.participants", { ns: "recipe", count: 1 })).toBe(
      "1 vote",
    )
    expect(i18n.t("curated.ingredientCount", { ns: "recipe", count: 1 })).toBe(
      "1 ingredient",
    )
    expect(i18n.t("curated.stepCount", { ns: "recipe", count: 3 })).toBe(
      "3 steps",
    )
    expect(i18n.t("curated.showOriginal", { ns: "recipe" })).toBe(
      "Show original Korean recipe",
    )

    await i18n.changeLanguage("ko")
    expect(i18n.t("recipeEditor.title", { ns: "recipe" })).toBe("레시피 쓰기")
    expect(i18n.t("category.post.dining-out", { ns: "recipe" })).toBe(
      "외식 후기",
    )
  })
})
