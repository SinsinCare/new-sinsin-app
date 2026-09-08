import { createInstance } from "i18next"
import { consultCopyText } from "../src/features/consultation/lib/consultCopy"
import type { Message } from "../src/types/chat"
const activities: Message["activities"] = [
  {
    id: "r1",
    action: "recipe",
    status: "complete",
    sources: [
      {
        type: "recipe",
        id: 45,
        title: "잡채덮밥 (저염)",
        recipe: {
          version: 1,
          timeMin: 35,
          servings: 1,
          ingredients: [
            { name: "당면", amount: "60g" },
            { name: "물", amount: "소량" },
          ],
          steps: ["당면을 삶아요."],
        },
      },
    ],
  },
  {
    id: "n1",
    action: "intake",
    status: "complete",
    nutrition: {
      version: 1,
      kind: "intake",
      date: "2026-09-06",
      asOf: "2026-09-06T01:00:00.000Z",
      recorded: true,
      proteinBasisKg: null,
      rows: [
        { nutrient: "sodium", unit: "mg", consumed: 2300, target: 2000 },
        { nutrient: "potassium", unit: "mg", consumed: null, target: 2500 },
        { nutrient: "phosphorus", unit: "mg", consumed: 0, target: null },
        { nutrient: "protein", unit: "g", consumed: 6.1, target: null },
        { nutrient: "water", unit: "mL", consumed: 300, target: 1500 },
      ],
    },
  },
]
test.each(["ko", "en"])(
  "copy includes card facts and provenance, including collapsed sections (%s)",
  async (lang) => {
    const i18n = createInstance()
    await i18n.init({
      lng: lang,
      defaultNS: "common",
      resources: {
        [lang]: { common: require(`../src/i18n/locales/${lang}/common.json`) },
      },
    })
    const copy = consultCopyText(
      { content: "짧은 추천 설명", activities },
      i18n.getFixedT(lang, "common"),
    )
    expect(copy).toContain("짧은 추천 설명")
    expect(copy).toContain("당면 60g")
    expect(copy).toContain("물 소량")
    expect(copy).toContain("1. 당면을 삶아요.")
    expect(copy).toContain("2300 mg / 2000 mg")
    expect(copy).toContain("0 mg /")
    expect(copy).toContain("6.1 g /")
    expect(copy).toContain("2026-09-06T01:00:00.000Z")
    expect(copy).not.toContain("consult.")
    expect(
      consultCopyText(
        { content: "기존 답변", activities: [] },
        i18n.getFixedT(lang, "common"),
      ),
    ).toBe("기존 답변")
  },
)
