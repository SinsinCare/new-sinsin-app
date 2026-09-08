/* eslint-disable import/first */
jest.mock("../src/features/consultation/components/ConsultDisclosure", () => ({
  ConsultDisclosure: "Disclosure",
  ConsultChevron: "Chevron",
}))
import { renderHookWithEffects } from "./helpers/effectHookHarness"
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...require("./helpers/effectHookHarness"),
}))
jest.mock("react-native", () => ({
  Pressable: "Pressable",
  View: "View",
  ScrollView: "ScrollView",
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 0.5 },
}))
const mockPush = jest.fn()
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "ko" },
    t: (key: string, args: unknown) => `${key}:${JSON.stringify(args ?? {})}`,
  }),
}))
jest.mock("@/src/design-system-v2", () => ({
  V2Text: "Text",
  V2Icon: "Icon",
  borderWidth: { thin: 1 },
  spacing: Object.fromEntries(
    [2, 4, 6, 8, 10, 12, 16, 20, 24].map((n) => [n, n]),
  ),
  useV2Theme: () => ({
    colors: {
      label: { normal: "#222", neutral: "#666" },
      line: { normal: "#ddd" },
      background: { default: "#fff" },
      fill: { normal: "#eee", alternative: "#fafafa" },
    },
  }),
}))
import { ConsultNutritionCard } from "../src/features/consultation/components/ConsultNutritionCard"
import {
  consultNutritionCards,
  nutrientComparison,
} from "../src/features/consultation/lib/consultNutrition"
import {
  readConsultNutritionCard,
  type ConsultNutritionCard as Snapshot,
} from "../src/types/consultNutritionCard"
import {
  parseConsultActivity,
  parseActivityHistory,
  type ConsultActivity,
} from "../src/types/chat"
const card: Snapshot = {
  version: 1,
  kind: "intake",
  date: "2026-09-06",
  asOf: "2026-09-06T01:00:00.000Z",
  recorded: true,
  proteinBasisKg: 50,
  rows: [
    { nutrient: "sodium", unit: "mg", target: 2000, consumed: 2300 },
    { nutrient: "potassium", unit: "mg", target: null, consumed: 0 },
    { nutrient: "phosphorus", unit: "mg", target: 800, consumed: null },
    { nutrient: "protein", unit: "g", target: 40, consumed: 40 },
    { nutrient: "water", unit: "mL", target: 1500, consumed: 300 },
  ],
}
const receipt: ConsultActivity = {
  id: "intake_1",
  action: "intake",
  status: "complete",
  nutrition: card,
}
function nodes(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (node == null || typeof node === "boolean") return []
  if (typeof node !== "object") return [node]
  if (node.props?.open === false) return [node]
  return [node, ...nodes(node.props?.children)]
}
const text = (tree: unknown) =>
  nodes(tree)
    .filter((n) => typeof n === "string")
    .join(" ")

test("typed receipts survive live events and history while extra profile data and bad statuses are excluded", () => {
  expect(
    parseConsultActivity({
      ...receipt,
      nutrition: { ...card, private: "SECRET" },
    })?.nutrition,
  ).toEqual(card)
  expect(parseActivityHistory([receipt])[0]?.nutrition).toEqual(card)
  for (const status of ["error", "running"])
    expect(
      parseConsultActivity({ ...receipt, status })?.nutrition,
    ).toBeUndefined()
  expect(
    parseConsultActivity({ ...receipt, action: "recipe" })?.nutrition,
  ).toBeUndefined()
  for (const invalid of [
    { ...card, date: "2026-02-31" },
    { ...card, recorded: false },
    { ...card, rows: card.rows.slice(1) },
    { ...card, rows: card.rows.map((row) => ({ ...row, target: 0 })) },
  ])
    expect(readConsultNutritionCard(invalid)).toBeUndefined()
})
test("one intake snapshot subsumes equal targets but keeps different dates and changed targets distinct", () => {
  const targets: Snapshot = {
    ...card,
    kind: "targets",
    rows: card.rows.map((row) => ({ ...row, consumed: null })),
  }
  const targetReceipt: ConsultActivity = {
    ...receipt,
    action: "profile",
    id: "profile_1",
    nutrition: targets,
  }
  expect(consultNutritionCards([targetReceipt, receipt, receipt])).toEqual([
    card,
  ])
  expect(
    consultNutritionCards([
      targetReceipt,
      { ...receipt, nutrition: { ...card, date: "2026-09-05" } },
    ]),
  ).toHaveLength(2)
  expect(
    consultNutritionCards([
      targetReceipt,
      {
        ...receipt,
        nutrition: {
          ...card,
          rows: card.rows.map((row) => ({ ...row, target: 1700 })),
        },
      },
    ]),
  ).toHaveLength(2)
  expect(consultNutritionCards([{ ...receipt, status: "error" }])).toEqual([])
})
test("comparisons clamp only the visual bar and preserve actual excess, null and recorded zero", () => {
  expect(nutrientComparison(card.rows[0])).toEqual({
    ratio: 1,
    difference: 300,
    direction: "over",
  })
  expect(nutrientComparison(card.rows[1])).toEqual({
    ratio: null,
    difference: null,
    direction: "unknown",
  })
  expect(nutrientComparison(card.rows[2])).toEqual({
    ratio: null,
    difference: null,
    direction: "unknown",
  })
  expect(nutrientComparison({ ...card.rows[0], consumed: 0 })).toEqual({
    ratio: 0,
    difference: -2000,
    direction: "under",
  })
  expect(nutrientComparison(card.rows[3]).direction).toBe("equal")
})
test("the card displays exact known amounts, dates and unknown labels, and basis disclosure pauses follow", () => {
  const onDisclosure = jest.fn()
  const h = renderHookWithEffects(() =>
    ConsultNutritionCard({ card, onDisclosure }),
  )
  const copy = text(h.result())
  expect(copy).toContain("2,300")
  expect(copy).toContain("2,000")
  expect(copy).toContain("2026.09.06")
  expect(copy).toContain("unrecorded")
  expect(copy).toContain("unset")
  expect(copy).not.toContain("proteinBasis")
  const button = () =>
    nodes(h.result()).find((n) => n.props?.accessibilityRole === "button")
  button().props.onPress()
  expect(onDisclosure).toHaveBeenCalledTimes(1)
  expect(button().props.accessibilityState.expanded).toBe(true)
  expect(text(h.result())).toContain('"weight":"50"')
  expect(text(h.result())).toContain("intakeBasis")
  h.rerender()
  expect(button().props.accessibilityState.expanded).toBe(true)
  h.unmount()
})

test("new card and quick-question copy resolves from the actual Korean and English namespaces", () => {
  for (const lang of ["ko", "en"]) {
    const resource = require(`../src/i18n/locales/${lang}/common.json`)
    for (const key of [
      "intake",
      "targets",
      "recipe",
      "intakePrompt",
      "targetsPrompt",
      "recipePrompt",
    ])
      expect(typeof resource.consult.quickTools[key]).toBe("string")
    for (const key of [
      "asOf",
      "noIntake",
      "unrecorded",
      "unset",
      "basis",
      "source",
      "proteinBasis",
      "intakeBasis",
    ])
      expect(typeof resource.consult.nutritionCard[key]).toBe("string")
    for (const row of card.rows)
      expect(typeof resource.consult.nutritionCard.names[row.nutrient]).toBe(
        "string",
      )
  }
})
