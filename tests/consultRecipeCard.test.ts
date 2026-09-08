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
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 0.5 },
}))
const mockPush = jest.fn()
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, args?: { count?: number; title?: string }) =>
      `${key}:${args?.count ?? args?.title ?? ""}`,
  }),
}))
jest.mock("@/src/design-system-v2", () => ({
  V2Text: "Text",
  V2Icon: "Icon",
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
import { ConsultRecipeCard } from "../src/features/consultation/components/ConsultRecipeCard"
import { readConsultRecipeCard } from "../src/types/consultRecipeCard"
import {
  consultSources,
  mapMessage,
  mergeConsultActivity,
  parseConsultActivity,
  parseConsultSources,
  type ConsultSource,
} from "../src/types/chat"

const recipe = {
  version: 1 as const,
  timeMin: 35,
  servings: 1,
  ingredients: [
    { name: "흑미흰밥", amount: "70g" },
    { name: "당면(건조)", amount: "60g" },
    { name: "다진 마늘·파·참깨·물", amount: "소량" },
  ],
  steps: ["재료를 썰어요.", "당면을 삶아 함께 볶아요."],
}
const source: ConsultSource = {
  type: "recipe",
  id: 45,
  title: "잡채덮밥 (저염)",
  recipe,
}
const receipt = {
  id: "recipe_1",
  action: "recipe",
  status: "complete",
  sources: [source],
}
function nodes(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (node == null || typeof node === "boolean") return []
  if (typeof node !== "object") return [node]
  if (node.props?.open === false) return [node]
  return [node, ...nodes(node.props?.children)]
}
const strings = (tree: unknown) =>
  nodes(tree).filter((node) => typeof node === "string")
const button = (tree: unknown, key: string) =>
  nodes(tree).find((node) => node.props?.accessibilityLabel?.startsWith(key))

test("a streamed recipe survives completion and history with the exact facts, independent of prose", () => {
  const activity = parseConsultActivity(receipt)!
  const updates = mergeConsultActivity(
    mergeConsultActivity([], activity),
    activity,
  )
  expect(consultSources(updates)).toEqual([source])
  for (const content of [
    "오늘 저녁에 참고해 보세요.",
    "재료:\n- 흑미흰밥 70g\n- 당면 60g",
  ]) {
    const restored = mapMessage(
      {
        messageId: 1,
        role: "ASSISTANT",
        content,
        category: null,
        categoryLabel: null,
        createdAt: "2026-09-06T01:00:00",
        activities: updates,
      },
      2,
    )
    expect(consultSources(restored.activities!)).toEqual([source])
  }
  expect(
    parseConsultActivity({ ...receipt, status: "error" })?.sources,
  ).toBeUndefined()
})
test("malformed snapshots preserve only a valid internal recipe link and never repair amounts", () => {
  for (const invalid of [
    null,
    { ...recipe, version: 2 },
    { ...recipe, servings: 0 },
    { ...recipe, timeMin: Infinity },
    { ...recipe, ingredients: [{ name: "당면", amount: "60g\u202e" }] },
    { ...recipe, steps: Array(41).fill("썰어요") },
    { ...recipe, ingredients: Array(61).fill(recipe.ingredients[0]) },
    { ...recipe, steps: Array(40).fill("x".repeat(500)) },
  ]) {
    expect(readConsultRecipeCard(invalid)).toBeUndefined()
    expect(parseConsultSources([{ ...source, recipe: invalid }])).toEqual([
      { type: "recipe", id: 45, title: source.title },
    ])
  }
  expect(
    readConsultRecipeCard({
      ...recipe,
      secret: "private",
      ingredients: recipe.ingredients.map((item) => ({
        ...item,
        prompt: "private",
      })),
    }),
  ).toEqual(recipe)
})
test("ingredient and cooking disclosures are independent, preserve quantities, and pause following", () => {
  const onDisclosure = jest.fn()
  let currentSource = source
  const hook = renderHookWithEffects(() =>
    ConsultRecipeCard({ source: currentSource, onDisclosure }),
  )
  expect(strings(hook.result())).not.toContain("60g")
  button(hook.result(), "consult.recipeCard.ingredients").props.onPress()
  expect(strings(hook.result())).toEqual(
    expect.arrayContaining(["당면(건조)", "60g", "소량"]),
  )
  expect(strings(hook.result())).not.toContain("재료를 썰어요.")
  currentSource = { ...source, recipe: { ...recipe } }
  hook.rerender()
  expect(
    button(hook.result(), "consult.recipeCard.ingredients").props
      .accessibilityState.expanded,
  ).toBe(true)
  button(hook.result(), "consult.recipeCard.steps").props.onPress()
  expect(strings(hook.result())).toContain("재료를 썰어요.")
  button(hook.result(), "consult.recipeCard.ingredients").props.onPress()
  expect(strings(hook.result())).not.toContain("60g")
  expect(strings(hook.result())).toContain("재료를 썰어요.")
  expect(onDisclosure).toHaveBeenCalledTimes(3)
  button(hook.result(), "consult.sources.openRecipe").props.onPress()
  expect(mockPush).toHaveBeenLastCalledWith("/recipe/45")
  hook.unmount()
})
test("old histories remain navigable without fabricated time, servings, or empty disclosures", () => {
  const hook = renderHookWithEffects(() =>
    ConsultRecipeCard({
      source: { type: "recipe", id: 45, title: source.title },
    }),
  )
  expect(
    button(hook.result(), "consult.recipeCard.ingredients"),
  ).toBeUndefined()
  expect(
    strings(hook.result()).some((text) =>
      text.includes("consult.recipeCard.minutes"),
    ),
  ).toBe(false)
  button(hook.result(), "consult.sources.openRecipe").props.onPress()
  expect(mockPush).toHaveBeenLastCalledWith("/recipe/45")
  hook.unmount()
})
