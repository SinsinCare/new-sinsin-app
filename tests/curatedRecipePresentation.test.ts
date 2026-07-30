/* eslint-disable import/first */
const apiGet = jest.fn()

jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
  },
}))

import type { CuratedRecipe } from "../src/features/recipe/data/curatedRecipeTypes"
import { recipeCatalogService } from "../src/features/recipe/services/recipeCatalogService"
import { getCuratedRecipeContentPresentation } from "../src/features/recipe/utils/curatedRecipePresentation"

function recipe(overrides: Partial<CuratedRecipe> = {}): CuratedRecipe {
  return {
    id: 4,
    sourceKey: "recipe_004",
    category: "Korean",
    name: "Japchae Rice Bowl",
    description: "This recipe has 10 ingredients and 3 steps.",
    difficulty: "Moderate",
    time_min: 35,
    servings: 1,
    tags: ["#Korean"],
    ingredients: [],
    steps: [],
    nutrition: {
      kcal: 650,
      protein_g: 7,
      sodium_mg: 376,
      potassium_mg: 580,
      phosphorus_mg: 218,
      ckd_friendliness: "moderate",
      estimated: true,
      verification_required: true,
    },
    ckd_guide: {},
    ai_summary: { headline: "", risk_flags: {} },
    content_availability: {
      requested_locale: "en",
      source_locale: "ko",
      ingredient_count: 10,
      step_count: 3,
      ingredients_available: false,
      steps_available: false,
    },
    ...overrides,
  }
}

describe("curated recipe English detail presentation", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("keeps safe canonical facts visible when reviewed English method copy is missing", () => {
    expect(getCuratedRecipeContentPresentation(recipe(), "en")).toEqual({
      isEnglishCatalog: true,
      hasEnglishContentGap: true,
      ingredientCount: 10,
      stepCount: 3,
    })
  })

  it("does not show a translation gap when reviewed ingredients and directions exist", () => {
    const translated = recipe({
      ingredients: [{ name: "Steamed white rice", amount: "210 g" }],
      steps: [{ order: 1, content: "Stir-fry the rice." }],
      content_availability: {
        requested_locale: "en",
        source_locale: "ko",
        ingredient_count: 1,
        step_count: 1,
        ingredients_available: true,
        steps_available: true,
      },
    })

    expect(getCuratedRecipeContentPresentation(translated, "en")).toMatchObject(
      {
        hasEnglishContentGap: false,
        ingredientCount: 1,
        stepCount: 1,
      },
    )
  })

  it("treats Korean catalog content and user-authored posts as original content", () => {
    expect(
      getCuratedRecipeContentPresentation(
        recipe({
          content_availability: {
            requested_locale: "ko",
            source_locale: "ko",
            ingredient_count: 10,
            step_count: 3,
            ingredients_available: true,
            steps_available: true,
          },
        }),
        "ko",
      ).hasEnglishContentGap,
    ).toBe(false)

    expect(
      getCuratedRecipeContentPresentation(
        recipe({ sourceKey: "user:42" }),
        "en",
      ).isEnglishCatalog,
    ).toBe(false)
  })

  it("requests Korean source content only with an explicit locale override", async () => {
    apiGet.mockResolvedValue({
      data: {
        result: {
          id: 4,
          sourceKey: "recipe_004",
          name: "잡채덮밥",
          description: "재료와 조리 순서를 확인해 보세요.",
          category: "한식",
          ingredients: [],
          steps: [],
          contentAvailability: {
            requestedLocale: "ko",
            sourceLocale: "ko",
            ingredientCount: 10,
            stepCount: 3,
            ingredientsAvailable: true,
            stepsAvailable: true,
          },
        },
      },
    })

    await recipeCatalogService.getRecipe(4, { locale: "ko" })

    expect(apiGet).toHaveBeenCalledWith("/recipes/4", {
      params: { locale: "ko" },
    })
  })
})
