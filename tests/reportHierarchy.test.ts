/**
 * 위계 규칙 — 격자가 맞아도 **무엇이 먼저 읽히는가**가 없으면 화면은 평평하다.
 * 눈으로 "위계가 있어 보인다" 는 재현이 안 되므로, 규칙을 소스에서 센다.
 *
 * 1. 채워진 브랜드 버튼은 화면에 **하나**(tone="primary" 한 번).
 * 2. 파괴적 동작은 **중립 면**에 앉는다 — 브랜드 틴트 위에 올리면 추천 동작으로 읽힌다.
 * 3. 도넛 고리와 숫자는 같은 크기이고, 집중 영양소는 이름만 강조한다.
 * 4. 배지는 내용에 맞는 폭으로 표시하고 글자를 압축하지 않는다.
 * 5. 세로 간격은 세 값(24·16·8)만 쓴다.
 * 6. 이 섹션의 가장 큰 글자는 숫자(총 열량)다 — 섹션 제목보다 크다.
 */
import { readFileSync } from "fs"
import { resolve } from "path"

const SOURCE = readFileSync(
  resolve(
    __dirname,
    "..",
    "src/features/home/components/FoodAnalysisResult.tsx",
  ),
  "utf8",
)

function styleBlock(name: string): string {
  return new RegExp(`\\b${name}: \\{([^}]*)\\}`, "u").exec(SOURCE)?.[1] ?? ""
}

function fontSizeOf(name: string): number {
  const value = /fontSize:\s*(\d+)/u.exec(styleBlock(name))?.[1]
  expect(value).toBeDefined()
  return Number(value)
}

/** 화면에 선 "채운 브랜드" 버튼의 수. 검사와 대조가 같은 규칙을 쓰게 하는 한 벌이다. */
function primaryToneCount(source: string): number {
  return [...source.matchAll(/tone="primary"/gu)].length
}

describe("리포트 위계", () => {
  it("채워진 브랜드 버튼은 한 번에 하나다", () => {
    // 신규(저장 전)와 저장본 두 갈래가 각각 primary 를 하나씩 쓴다 — 동시에 그려지지 않는다.
    const primaries = primaryToneCount(SOURCE)
    expect(primaries).toBe(2)
    expect([...SOURCE.matchAll(/tone="soft"/gu)]).toHaveLength(1)
    expect([...SOURCE.matchAll(/tone="danger"/gu)]).toHaveLength(1)
  })

  it("파괴적 동작은 중립 면에 앉는다 (브랜드 틴트가 아니다)", () => {
    expect(SOURCE).toMatch(
      /tone="danger"\s*\n\s*neutralColor=\{planes\.neutral\}/u,
    )
    // 다크의 중립 면은 `surfaceSunken` — 바탕(`canvas`)·띠(`surface`)와 구분되는 브랜드 없는
    // 회색이고 보조 버튼 면의 공통 토큰이다(docs/design/medication-grayscale-2026-09-07/REVIEW.md).
    expect(SOURCE).toMatch(
      /neutral: s\.isDark \? s\.surfaceSunken : INK\.band/u,
    )
    // danger 가 softColor 를 다시 쓰지 않는지 — 회귀 방지
    expect(SOURCE).not.toMatch(/tone="danger"\s*\n\s*softColor=/u)
  })

  it("도넛은 같은 바닥과 굵기를 쓰고 집중 영양소 이름만 강조한다", () => {
    expect(SOURCE).toMatch(/const stroke = 8/u)
    expect(SOURCE).not.toMatch(/styles\.donut(?:PercentFocus|ValueMuted)/u)
    expect(styleBlock("donutCell")).not.toMatch(/backgroundColor|borderColor/u)
    expect(SOURCE).not.toMatch(/focusColor|focusCard/u)
    expect(styleBlock("donutLabelFocus")).toMatch(/fontWeight: "600"/u)
    expect(styleBlock("donutValue")).toMatch(/fontWeight: "600"/u)
  })

  it("배지는 내용에 맞는 폭으로 표시하고 글자를 압축하지 않는다", () => {
    expect(styleBlock("badge")).toMatch(/minHeight:/u)
    expect(styleBlock("foodBadge")).toMatch(/minHeight:/u)
    expect(styleBlock("foodBadge")).toMatch(/flexShrink: 0/u)
  })

  it("세로 리듬은 24·16·8 세 값이다", () => {
    expect(SOURCE).toMatch(
      /const RHYTHM = \{ SECTION: 24, BLOCK: 16, ITEM: 8 \} as const/u,
    )
    expect(styleBlock("band")).toMatch(/marginTop: RHYTHM\.SECTION/u)
    expect(styleBlock("insight")).toMatch(/gap: RHYTHM\.BLOCK/u)
    expect(styleBlock("splitWrap")).toMatch(/gap: RHYTHM\.ITEM/u)
  })

  it("섹션의 주인공은 숫자다 — 총 열량이 섹션 제목보다 크다", () => {
    expect(fontSizeOf("caloriesValue")).toBeGreaterThan(
      fontSizeOf("sectionTitle"),
    )
    expect(fontSizeOf("caloriesValue")).toBeGreaterThan(
      fontSizeOf("caloriesLabel"),
    )
  })

  it("규칙이 헛돌지 않는다 — 채운 브랜드가 둘인 가짜 소스는 잡힌다 (대조)", () => {
    // 위 검사와 **같은 함수**를 부른다. 정규식을 다시 적으면 대조만 통과하고
    // 진짜 검사는 다른 규칙을 돌린다(2026-09-05 검수).
    expect(primaryToneCount('tone="primary" tone="soft"')).toBe(1)
    expect(primaryToneCount('tone="primary" tone="primary"')).toBe(2)
  })
})
