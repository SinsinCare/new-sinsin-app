import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  clampWaterIntake,
  displayedWaterIntake,
  getAppliedWaterDelta,
} from "../src/features/home/utils/waterIntake"

describe("water intake policy", () => {
  it("does not cap positive water intake", () => {
    expect(clampWaterIntake(6300)).toBe(6300)
    expect(clampWaterIntake(12000)).toBe(12000)
    expect(clampWaterIntake(-100)).toBe(0)
  })

  it("returns the requested delta unless it would go below zero", () => {
    expect(getAppliedWaterDelta(5800, 500)).toBe(500)
    expect(getAppliedWaterDelta(6000, 50)).toBe(50)
    expect(getAppliedWaterDelta(200, -500)).toBe(-200)
  })

  /**
   * 홈 타일·물 시트가 그리는 숫자는 사용자가 적은 물이어야 한다. 음식 수분을 더하면
   * (a) 시트가 편집하는 값(extraWater)과 화면의 큰 숫자가 어긋나고 (b) 끼니 재집계가
   * 끝나는 순간 물을 마시지 않았는데 숫자가 혼자 늘어난다(2026-08-19 신고).
   */
  it("shows only the water the user logged, never the water in food", () => {
    expect(displayedWaterIntake({ water: 905, extraWater: 168 })).toBe(168)
    expect(displayedWaterIntake({ water: 905, extraWater: 0 })).toBe(0)
    expect(displayedWaterIntake({ water: null, extraWater: null })).toBe(0)
    expect(displayedWaterIntake(null)).toBe(0)
  })
})

/**
 * 헬퍼만 옳아도 RecordView 가 `analysis.water` 를 다시 더하면 같은 결함이다.
 * 시트·타일·안내문이 전부 `displayedWaterIntake` 한 곳을 거치는지 소스에서 확인한다
 * (2026-09-02 "식단 분석 뒤 수분 시트에 음식 수분이 섞인다" 재점검).
 */
describe("RecordView wiring — every water figure goes through displayedWaterIntake", () => {
  const raw = readFileSync(
    join(__dirname, "../src/features/home/components/record/RecordView.tsx"),
    "utf8",
  )
  // 주석과 문자열은 뺀다 — 헬퍼 머리말 같은 설명이나 i18n 키("home.tile.water")는
  // 코드가 아니라서 검사에 걸리면 안 된다(2026-09-02 리뷰).
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""')

  it("builds consumedWater only from displayedWaterIntake", () => {
    expect(source).toMatch(
      /const consumedWater = displayedWaterIntake\(\s*data\?\.result\.analysis,?\s*\)/,
    )
  })

  it("never reads analysis water or sums extraWater directly", () => {
    // 점 접근·대괄호 접근·구조 분해 모두 잡는다.
    expect(source).not.toMatch(/\.water\b/)
    expect(source).not.toMatch(/\["water"\]/)
    expect(source).not.toMatch(/\{[^}]*\bwater\b[^}]*\}\s*=\s*[^=]/)
    expect(source).not.toMatch(/extraWater\s*\+|\+\s*\S*extraWater\b/)
  })

  it("물 기록 페이지에 consumedWater 를 넘긴다", () => {
    // 시트였을 때는 prop(`consumed={consumedWater}`)이었고, 페이지가 된 뒤로는 스토어 재료다.
    expect(source).toMatch(/consumed: consumedWater/)
  })
})
