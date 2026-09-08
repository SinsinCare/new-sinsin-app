import { resolveConsultUserCard } from "../src/features/consultation/utils/consultUserMessage"
import { parseFoodConsultMessage } from "../src/features/consultation/utils/foodConsultMessage"
import i18n from "../src/i18n"
import { buildRecipePortionConsult } from "../src/features/recipe/consult/recipePortionConsult"
import { parseRestaurantConsultMessage } from "../src/features/restaurant/consult/restaurantConsultMessage"
import { parseExamConsultMessage } from "../src/features/consultation/utils/examConsultMessage"
import type { PersonalPortionSelection } from "../src/features/nutrition/utils/portionReference"
const selection = (): PersonalPortionSelection => ({
  meals: 2,
  share: 0.5,
  input: {
    targets: { sodium: 2000, potassium: 2000, phosphorus: 1000, protein: 60 },
    perServing: { sodium: 1000, potassium: 200, phosphorus: 100, protein: 10 },
    intake: {
      date: new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10),
      status: "recorded",
      values: { sodium: 1000, potassium: 0, phosphorus: 0, protein: 0 },
    },
  },
})
const t = (key: string, options?: Record<string, unknown>) =>
  String(i18n.t(key as never, options as never))
test.each(["ko", "en"])(
  "recipe plan keeps personal conditions and reopens as a question in %s",
  async (language) => {
    await i18n.changeLanguage(language)
    const result = buildRecipePortionConsult({
      id: 123,
      name: "Recipe sample",
      selection: selection(),
      t,
    })!
    expect(result).not.toBeNull()
    expect(result.consultPrompt).toContain("1/4")
    expect(result.consultPrompt).toContain("50%")
    expect(result.consultContext).toContain(
      language === "ko" ? "[레시피]" : "[Recipe]",
    )
    expect(result.consultContext).not.toContain(
      language === "ko" ? "[식당]" : "[Restaurant]",
    )
    expect(result.consultContext).toContain(
      language === "ko" ? "조리 인분 수" : "Cooking yield",
    )
    expect(result.consultContext).toContain(
      language === "ko" ? "실제 섭취로 기록하지" : "do not record it as intake",
    )
    expect(parseExamConsultMessage(result.consultPrompt, t)).toBeNull()
    expect(
      resolveConsultUserCard({
        restaurant: () => parseRestaurantConsultMessage(result.consultPrompt),
        food: () => parseFoodConsultMessage(result.consultPrompt),
        exam: () => parseExamConsultMessage(result.consultPrompt, t),
      })?.kind,
    ).toBe("restaurant")
    expect(parseRestaurantConsultMessage(result.consultPrompt)).toEqual({
      question: t("portionGuide.consultQuestion", { name: "Recipe sample" }),
    })
  },
)
test("stale or incomplete intake never creates an automatic consultation request", () => {
  const stale = selection()
  stale.input.intake.date = "2020-01-01"
  expect(
    buildRecipePortionConsult({ id: 123, name: "sample", selection: stale, t }),
  ).toBeNull()
  const incomplete = selection()
  incomplete.input.intake = {
    ...incomplete.input.intake,
    status: "incomplete",
    values: null,
  }
  expect(
    buildRecipePortionConsult({
      id: 123,
      name: "sample",
      selection: incomplete,
      t,
    }),
  ).toBeNull()
})
