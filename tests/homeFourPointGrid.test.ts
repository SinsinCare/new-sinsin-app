/**
 * 4pt 격자 — 홈·리포트·시트·카메라의 간격/높이/줄높이/반경이 4 의 배수인지 **소스에서** 센다.
 *
 * 눈으로 "정렬이 맞아 보인다" 는 재현이 안 된다(2026-09-04 피드백: "패딩 시스템이 개판").
 * 규칙은 하나다: `padding*`·`margin*`·`gap`·`height`·`minHeight`·`lineHeight`·`borderRadius*`
 * 의 리터럴은 4 의 배수. 예외는 1(보더·hairline), 2(막대 칸 사이 틈), 그리고 시안 좌표를
 * 그대로 옮긴 절대 위치(`top`/`left` 는 검사 대상이 아니다). 글자 크기는 격자 대상이 아니다.
 */
import { readFileSync } from "fs"
import { resolve } from "path"

const FILES = [
  "src/features/home/components/FoodAnalysisResult.tsx",
  "src/features/home/components/record/HomeHero.tsx",
  "src/features/home/components/record/TodayRecord.tsx",
  "src/features/home/components/record/MealRecordList.tsx",
  "src/features/home/components/record/sheets/MealSheet.tsx",
  "src/features/home/components/record/sheets/RecipeImportSheet.tsx",
  "src/features/home/views/FoodCameraScreen.tsx",
]

const KEY =
  /\b(padding(?:Top|Bottom|Left|Right|Horizontal|Vertical)?|margin(?:Top|Bottom|Left|Right|Horizontal|Vertical)?|gap|height|minHeight|lineHeight|borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius):\s*(-?\d+(?:\.\d+)?)\b/gu

const ALLOWED = new Set([1, 2])

/**
 * `S[3] + 2` 같은 **식**도 잡는다. 숫자 리터럴만 보던 시절에는 사다리 상수에 2 를 더해
 * 격자를 빠져나갈 수 있었고, 실제로 배지 반경 하나가 그렇게 14 였다(2026-09-05 검수).
 * 사다리끼리의 합(`S[8] + S[6]`)과 반쪽(`S[7] / 2`)은 격자 위에 남으므로 통과시킨다.
 */
const OFF_GRID_EXPRESSION =
  /\b(padding\w*|margin\w*|gap|height|minHeight|lineHeight|borderRadius\w*):\s*S\[\d\]\s*[+-]\s*(\d+)\b/gu

function offenders(source: string): string[] {
  const start = source.indexOf("StyleSheet.create(")
  const sheet = start === -1 ? source : source.slice(start)
  const out: string[] = []
  for (const match of sheet.matchAll(KEY)) {
    const value = Number(match[2])
    if (value % 4 === 0 || ALLOWED.has(Math.abs(value))) continue
    out.push(`${match[1]}=${match[2]}`)
  }
  for (const match of sheet.matchAll(OFF_GRID_EXPRESSION)) {
    const addend = Number(match[2])
    if (addend % 4 === 0) continue
    out.push(`${match[1]}=S[]±${match[2]}`)
  }
  return out
}

describe("4pt 격자", () => {
  it.each(FILES)("%s 의 간격·높이·줄높이·반경은 4 의 배수다", (file) => {
    const source = readFileSync(resolve(__dirname, "..", file), "utf8")
    expect(offenders(source)).toEqual([])
  })

  it("규칙이 헛돌지 않는다 — 47.5 와 lineHeight 23 은 잡힌다 (대조)", () => {
    expect(
      offenders(
        "StyleSheet.create({ a: { height: 47.5, lineHeight: 23, gap: 8 } })",
      ),
    ).toEqual(["height=47.5", "lineHeight=23"])
  })

  it("사다리 상수에 2 를 더해 빠져나갈 수 없다 (대조)", () => {
    expect(
      offenders(
        "StyleSheet.create({ a: { borderRadius: S[3] + 2, gap: S[2] } })",
      ),
    ).toEqual(["borderRadius=S[]±2"])
    // 사다리끼리의 합은 격자 위에 남는다.
    expect(
      offenders("StyleSheet.create({ a: { minWidth: S[8] + S[6] } })"),
    ).toEqual([])
  })

  it("리포트의 최소 여백 상수가 살아 있고, 도넛 셀은 고정 높이가 아니라 최소 높이 + 위아래 여백이다", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "..",
        "src/features/home/components/FoodAnalysisResult.tsx",
      ),
      "utf8",
    )
    expect(source).toMatch(
      /const MIN = \{ INSET: 16, EDGE: 4, TOUCH: 44 \} as const/u,
    )
    const donut = /donutCell: \{([^}]*)\}/u.exec(source)?.[1] ?? ""
    expect(donut).toMatch(/minHeight:/u)
    expect(donut).not.toMatch(/\bheight:/u)
    expect(donut).toMatch(/paddingVertical: MIN\.EDGE/u)
    // 헤더 줄과 누르는 줄은 터치 최소 44
    expect(source).toMatch(/header: \{\s*height: MIN\.TOUCH/u)
    expect(source).toMatch(/consultLink: \{\s*height: MIN\.TOUCH/u)
  })
})
