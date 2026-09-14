import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import koRecipe from "../src/i18n/locales/ko/recipe.json"
import enRecipe from "../src/i18n/locales/en/recipe.json"

/**
 * 레시피 작성·보기·리뷰 쓰기는 홈 건강기록 6페이지와 같은 시스템(RecordPageShell·
 * recordPageSpec·v2 토큰)으로 그려야 한다(2026-09-12). 구 토큰(`theme/surface` 의
 * `TYPE`/`LAYOUT`)·자체 헤더·자체 제출 바로 되돌아가면 여기서 잡힌다. 동작(훅·API·
 * 초안 가드·조리 순서 시트·리뷰 제출)은 재설계 전과 같아야 한다.
 */
const ROOT = join(__dirname, "..")
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")
const read = (relative: string) =>
  strip(readFileSync(join(ROOT, relative), "utf8"))
const filesUnder = (relative: string) =>
  readdirSync(join(ROOT, relative))
    .filter((name) => /\.tsx?$/.test(name))
    .map((name) => `${relative}/${name}`)

const WRITE_SCREEN = "src/features/recipe/views/RecipeWriteScreen.tsx"
const DETAIL_ROUTE = "app/recipe/[id]/index.tsx"
const REVIEW_COMPOSER =
  "src/features/recipe/components/detail/ReviewComposer.tsx"
const WRITE_FILES = [
  WRITE_SCREEN,
  ...filesUnder("src/features/recipe/components/write"),
]
const DETAIL_FILES = [
  DETAIL_ROUTE,
  ...filesUnder("src/features/recipe/components/detail"),
]

/** 브리프가 금지한 것 — 구 면·구 토큰·구 헤더·구 CTA·RN 키보드 회피. */
const FORBIDDEN = [
  "ThemedText",
  "ThemedView",
  "useSettingsColors",
  "@/src/theme/tokens",
  "@/src/theme/surface",
  "KeyboardAvoidingView",
  "V2BottomCTA",
  "SurfacePressable",
  "primitives.",
]
/** `V2ScreenHeader` 는 키트다 — 구 `ScreenHeader` 만 잡는다. */
const LEGACY_HEADER = /(?<!V2)\bScreenHeader\b/
const HEX = /#[0-9a-fA-F]{6}\b/

function expectClean(files: string[]) {
  for (const file of files) {
    const code = read(file)
    for (const legacy of FORBIDDEN) {
      expect({ file, legacy, found: code.includes(legacy) }).toEqual({
        file,
        legacy,
        found: false,
      })
    }
    expect({ file, legacyHeader: LEGACY_HEADER.test(code) }).toEqual({
      file,
      legacyHeader: false,
    })
    expect({ file, hex: HEX.test(code) }).toEqual({ file, hex: false })
  }
}

describe("recipe write — record page system", () => {
  const code = read(WRITE_SCREEN)
  it("uses the record page shell and kit fields", () => {
    expect(code).toMatch(/<RecordPageShell\b/)
    expect(code).toMatch(/<RecordNumberField\b/)
    expect(code).toMatch(/<RecordChoices\b/)
    expect(code).toMatch(/<RecordMultiChoices\b/)
    expect(code).toMatch(/<RecordFieldHint\b/)
    expect(code).toMatch(
      /from "@\/src\/features\/home\/components\/record\/pages\/recordPageSpec"/,
    )
    // 시안 실측 숫자를 화면에 다시 적지 않는다 — 간격은 spec 상수다.
    expect(code).toMatch(/gap: FORM\.sectionGap/)
    expect(code).not.toMatch(/paddingVertical:\s*\d+/)
  })
  it("the old chip rail and submit bar are gone", () => {
    expect(code).not.toContain("WriteChipRail")
    expect(code).not.toContain("WriteSubmitBar")
    expect(code).not.toContain("KeyboardAwareScrollView")
    expect(() =>
      readFileSync(
        join(ROOT, "src/features/recipe/components/write/WriteChipRail.tsx"),
      ),
    ).toThrow()
  })
  it("write files carry no legacy surface pieces", () => {
    expectClean(WRITE_FILES)
  })
  it("keeps the hook, submit, draft guard and step sheet paths", () => {
    expect(code).toMatch(/useRecipeWriteScreen\(\{/)
    expect(code).toMatch(/onCtaPress=\{\(\) => void screen\.submit\(\)\}/)
    expect(code).toMatch(/ctaDisabled=\{!evaluation\.canSubmit\}/)
    expect(code).toMatch(/usePreventRemove\(screen\.hasDraft/)
    expect(code).toMatch(/afterModalTransitions\(\)\.then\(onClose\)/)
    expect(code).toMatch(/<ConfirmExitModal\b/)
    expect(code).toMatch(/<StepSheet\b/)
    expect(code).toMatch(/<PhotoPickerRow\b/)
    expect(code).toMatch(/<NutritionPreviewCard\b/)
    expect(code).toMatch(/<IngredientEditor\b/)
    // 버튼 위 상태 한 줄은 버튼을 막는 계산과 같은 곳에서 나온다.
    expect(code).toMatch(/MISSING_COPY_KEY\[evaluation\.missing\[0\]\]/)
    expect(code).toMatch(
      /<RecordFieldHint error=\{statusIsError\}>\{statusText\}/,
    )
  })
  it("text and step fields sit on the kit surface", () => {
    for (const file of [
      "src/features/recipe/components/write/WriteTextField.tsx",
      "src/features/recipe/components/write/StepSummaryField.tsx",
      "src/features/recipe/components/write/IngredientEditor.tsx",
    ]) {
      const source = read(file)
      expect({ file, radius: /FIELD\.radius/.test(source) }).toEqual({
        file,
        radius: true,
      })
      expect({ file, sunken: /s\.surfaceSunken/.test(source) }).toEqual({
        file,
        sunken: true,
      })
    }
    expect(
      read("src/features/recipe/components/write/WriteTextField.tsx"),
    ).toMatch(/from "@\/src\/design-system-v2\/primitives\/NativeText"/)
  })
})

describe("recipe detail — v2 surface", () => {
  const code = read(DETAIL_ROUTE)
  it("uses the v2 header, theme and detail components", () => {
    expect(code).toMatch(/<V2ScreenHeader\b/)
    expect(code).toMatch(/useV2Theme\(\)/)
    expect(code).toMatch(/<HeaderIconButton\b/)
    expect(code).toMatch(/<RecipeTitleBlock\b/)
    expect(code).toMatch(/<NutritionCard\b/)
    expect(code).toMatch(/<IngredientSection\b/)
    expect(code).toMatch(/<StepSection\b/)
    expect(code).toMatch(/<ReviewSection\b/)
    expect(code).toMatch(/<ProvenanceSheet\b/)
    expect(code).toMatch(/<ReviewComposer\b/)
  })
  it("detail files carry no legacy surface pieces", () => {
    expectClean(DETAIL_FILES)
  })
  it("keeps the data flow", () => {
    expect(code).toMatch(/useRecipeDetailV2\(recipeId\)/)
    expect(code).toMatch(/useMyReview\(recipeId, REVIEW_SORT\)/)
    expect(code).toMatch(/visibleReviews\(/)
    expect(code).toMatch(/upsert\.mutate\(\s*\{ rating, body \}/)
    expect(code).toMatch(/onSuccess: \(\) => setComposerOpen\(false\)/)
    expect(code).toMatch(/handleSubmitReview/)
  })
})

describe("recipe review composer — record page system", () => {
  const code = read(REVIEW_COMPOSER)
  it("uses the record page shell, choices and the kit text surface", () => {
    expect(code).toMatch(/<AppModal\b/)
    expect(code).toMatch(/<RecordPageShell\b/)
    expect(code).toMatch(/<RecordRating\b/)
    expect(code).not.toMatch(/<RecordChoices\b/)
    expect(code).toMatch(/<RecordFieldHint\b/)
    expect(code).toMatch(
      /from "@\/src\/design-system-v2\/primitives\/NativeText"/,
    )
    expect(code).toMatch(/FIELD\.radius/)
    expect(code).toMatch(/s\.surfaceSunken/)
    expect(code).not.toContain("Pretendard-Regular")
  })
  it("keeps the submit contract", () => {
    expect(code).toMatch(/rating >= 1 && rating <= 5 && !isSubmitting/)
    expect(code).toMatch(
      /onSubmit\(rating, body\.trim\(\)\.length > 0 \? body\.trim\(\) : null\)/,
    )
    expect(code).toMatch(/ctaDisabled=\{!canSubmit\}/)
    expect(code).toMatch(/ctaLoading=\{isSubmitting\}/)
    // 처음 별점을 고르면 본문으로 포커스가 간다.
    expect(code).toMatch(/bodyRef\.current\?\.focus\(\)/)
    // 제출 경로는 상위 훅이 든다 — 서비스의 PUT 이 그대로다.
    expect(
      read("src/features/recipe/services/recipeDetailV2Service.ts"),
    ).toMatch(/api\.put\(`\/recipes\/\$\{recipeId\}\/reviews\/mine`/)
  })
})

describe("new copy exists in both locales", () => {
  const leaf = (tree: unknown, path: string) =>
    path
      .split(".")
      .reduce<unknown>(
        (node, key) =>
          node && typeof node === "object"
            ? (node as Record<string, unknown>)[key]
            : undefined,
        tree,
      )
  it.each([
    "recipeWrite.navigationTitle",
    "recipeWrite.intro",
    "detail.reviews.composerIntro",
    "detail.reviews.ratingChoice",
    "detail.reviews.bodyFieldLabel",
  ])("%s", (key) => {
    expect(typeof leaf(koRecipe, key)).toBe("string")
    expect(typeof leaf(enRecipe, key)).toBe("string")
  })
})
