import { readFileSync } from "fs"
import { join } from "path"

/**
 * 별점은 별 다섯 개다(2026-09-12 사용자 피드백: "수치를 버튼식으로 나열하는 건 좋은 UX 가
 * 아니다"). 후기 화면 둘이 같은 `RecordRating` 을 쓰고, 별점 자리에 `RecordChoices` 가
 * 돌아오면 여기서 잡힌다.
 */
const ROOT = join(__dirname, "..")
const read = (relative: string) =>
  readFileSync(join(ROOT, relative), "utf8").replace(
    /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
    "",
  )

const RATING = read(
  "src/features/home/components/record/pages/RecordRating.tsx",
)
const RESTAURANT = read("src/features/restaurant/views/ReviewWriteScreen.tsx")
const RECIPE = read("src/features/recipe/components/detail/ReviewComposer.tsx")

describe("RecordRating — 별 다섯 개", () => {
  it("별 5개, 44 터치 상자, 채운 별 brand · 빈 별 textWeak, 접근성 adjustable + 버튼", () => {
    expect(RATING).toMatch(/RECORD_RATING_MAX = 5/)
    expect(RATING).toMatch(/width: MIN\.TOUCH,\s*height: MIN\.TOUCH/)
    expect(RATING).toMatch(/name=\{filled \? "starFilled" : "star"\}/)
    expect(RATING).toMatch(/color=\{filled \? s\.brand : s\.textWeak\}/)
    expect(RATING).toMatch(/accessibilityRole="adjustable"/)
    expect(RATING).toMatch(/accessibilityRole="button"/)
    expect(RATING).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })

  it("식당 후기 · 레시피 후기가 RecordRating 을 쓰고 별점 칩(RecordChoices)이 없다", () => {
    for (const src of [RESTAURANT, RECIPE]) {
      expect(src).toMatch(/<RecordRating\b/)
      expect(src).not.toMatch(/<RecordChoices\b/)
      expect(src).not.toMatch(/columns=\{5\}/)
    }
    // 레시피 후기는 점수의 말(1~5)을 별 아래 한 줄로 보여 준다.
    expect(RECIPE).toMatch(/words=\{/)
    expect(RECIPE).toMatch(/ratingWords\.5/)
    // 식당 후기는 특징 다중 선택은 그대로 칩이다(그건 수치가 아니다).
    expect(RESTAURANT).toMatch(/<RecordMultiChoices\b/)
  })
})
