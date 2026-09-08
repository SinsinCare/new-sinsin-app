/**
 * 기록 페이지의 치수가 **시안에서 온 한 벌**(`recordPageSpec`)만 쓰는지 본다.
 *
 * 화면 파일에 숫자를 다시 적으면 두 벌이 되고 한쪽만 고쳐진다. 그래서 여기서는
 *   1. 상수 값이 시안에서 뽑은 값 그대로인지(회귀 방지),
 *   2. 화면 파일의 스타일에 4의 배수가 아닌 날 숫자가 없는지(예외는 시안 값 상수)
 * 를 검사한다. 음성 대조도 함께 둔다 — 규칙이 헛돌면 알아채야 한다.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  CTA,
  FIELD,
  FOOTER_FADE,
  PAGE_X,
  TABLE,
  TITLE_BLOCK,
  WATER_CARD,
  WATER_QUICK,
  WATER_ROW,
} from "../src/features/home/components/record/pages/recordPageSpec"

const root = join(__dirname, "..")
const read = (relative: string) => readFileSync(join(root, relative), "utf8")

describe("six-page measurement system", () => {
  it("retains the shared 20pt page margin and accessible save action", () => {
    expect(PAGE_X).toBe(20)
    expect(CTA.height).toBeGreaterThanOrEqual(44)
    expect(CTA.radius).toBeLessThanOrEqual(16)
    expect(CTA.bottomInset).toBeGreaterThanOrEqual(16)
  })
  it("allocates room for persistent labels, units and large numeric entry", () => {
    expect(FIELD.height).toBeGreaterThanOrEqual(88)
    expect(FIELD.heroHeight).toBeGreaterThan(FIELD.height)
    expect(FIELD.pairedHeight).toBeGreaterThan(FIELD.height)
    expect(FIELD.heroFontSize).toBeGreaterThan(FIELD.fontSize)
    expect(FIELD.gap).toBe(8)
  })
  it("keeps history rows and quick additions easy to tap and read", () => {
    expect(TABLE.rowHeight).toBeGreaterThanOrEqual(48)
    expect(WATER_ROW.height).toBeGreaterThanOrEqual(44)
    expect(WATER_QUICK.height).toBeGreaterThanOrEqual(44)
    expect(WATER_CARD.height).toBeLessThan(WATER_CARD.size)
    expect(WATER_CARD.glassSize).toBeLessThan(WATER_CARD.height)
  })
  it("maintains a four-point spacing rhythm for headings and the footer", () => {
    expect(TITLE_BLOCK.marginTop % 4).toBe(0)
    expect(TITLE_BLOCK.marginBottom % 4).toBe(0)
    expect(FOOTER_FADE % 4).toBe(0)
  })
})

/** 화면 파일이 쓰는 날 숫자. 시안 값은 상수로 들어오므로 여기 남는 것은 4의 배수여야 한다. */
const PAGE_FILES = [
  "src/features/home/components/record/pages/RecordPageShell.tsx",
  "src/features/home/components/record/pages/WaterRecordPage.tsx",
  "src/features/home/components/record/pages/BloodPressureRecordPage.tsx",
  "src/features/home/components/record/pages/WeightRecordPage.tsx",
  "src/features/home/components/record/pages/BloodGlucoseRecordPage.tsx",
  "src/features/home/components/record/pages/EdemaRecordPage.tsx",
  "src/features/home/components/record/pages/MedicationRecordPage.tsx",
  "src/features/home/components/record/pages/RecordNumberField.tsx",
  "src/features/home/components/record/pages/RecordMetricSummary.tsx",
]

/** 격자 밖이지만 근거가 있는 값들 — 글자 크기·줄 높이·반지름·불투명도는 4pt 사다리가 아니다. */
const GRID_EXEMPT = new Set([
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "borderRadius",
  "borderWidth",
  "opacity",
  "flex",
  "flexGrow",
  "flexShrink",
  "width",
  "height",
  "top",
  "bottom",
  "left",
  "right",
  "size",
  "maxLength",
])

function offGridNumbers(source: string): string[] {
  const found: string[] = []
  const styleBlocks =
    source.match(/StyleSheet\.create\(\{[\s\S]*?\n\}\)/gu) ?? []
  for (const block of styleBlocks) {
    for (const match of block.matchAll(/(\w+):\s*(\d+(?:\.\d+)?)\b/gu)) {
      const key = match[1] as string
      const value = Number(match[2])
      if (GRID_EXEMPT.has(key)) continue
      if (value % 4 !== 0 && value !== 2 && value !== 6)
        found.push(`${key}: ${value}`)
    }
  }
  return found
}

describe("4pt 격자", () => {
  it.each(PAGE_FILES)("%s 의 여백은 격자 위에 있다", (file) => {
    expect(offGridNumbers(read(file))).toEqual([])
  })

  it("규칙이 헛돌지 않는다 — 격자 밖 값을 넣으면 잡힌다 (음성 대조)", () => {
    const fake = `StyleSheet.create({
  a: { paddingTop: 13, marginLeft: 8 },
})`
    expect(offGridNumbers(fake)).toEqual(["paddingTop: 13"])
  })
})
