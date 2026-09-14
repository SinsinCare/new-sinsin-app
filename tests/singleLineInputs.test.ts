import { readFileSync } from "fs"
import { join } from "path"

/**
 * 단일행 입력에 `lineHeight` 가 남아 있으면 iOS 가 글리프·플레이스홀더를 라인박스 바닥으로
 * 민다("플레이스홀더가 아래로 몰린다", 2026-09-12 재발). 규칙은 `surface.ts` 의
 * `singleLineInputText` 하나 — 단일행 입력 스타일은 그걸 거치고 `lineHeight` 를 직접 두지 않는다.
 */
const ROOT = join(__dirname, "..")
const read = (p: string) =>
  readFileSync(join(ROOT, p), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")

const inputBlock = (src: string, name: string) => {
  const i = src.indexOf(`  ${name}: {`)
  expect(i).toBeGreaterThan(-1)
  return src.slice(i, src.indexOf("},", i))
}

describe("단일행 입력은 lineHeight 없이 그린다", () => {
  it.each([
    ["src/features/recipe/components/list/RecipeSearchField.tsx", "input"],
    ["src/features/consultation/components/ConsultHistoryList.tsx", "input"],
    ["src/features/consultation/components/RenameModal.tsx", "input"],
  ])("%s", (file, styleName) => {
    const src = read(file)
    const block = inputBlock(src, styleName)
    expect(block).toMatch(/singleLineInputText\(/)
    expect(block).not.toMatch(/lineHeight:/)
  })

  it("공용 TextField 의 input 스타일에 lineHeight 가 없다", () => {
    const block = inputBlock(
      read("src/shared/components/TextField.tsx"),
      "input",
    )
    expect(block).not.toMatch(/lineHeight:/)
    expect(block).toMatch(/includeFontPadding: false/)
  })

  it("V2SearchField 는 이미 lineHeight 를 뺀다(회귀 금지)", () => {
    const src = read("src/design-system-v2/components/V2SearchField.tsx")
    expect(src).toMatch(/lineHeight: _searchLineHeight/)
  })
})
