/**
 * 통계 혈당 추이 모델(`features/home/utils/glucoseTrendModel.ts`).
 *
 * 지키는 것 셋:
 *  - **x축은 하루의 차례다.** 입력 순서가 어떻든 선은 공복 → 아침 → 점심 → 저녁으로 간다.
 *  - **목표는 칸마다 다르다.** 식후 90–180 · 식전/공복 70–99. 하나로 뭉치면 어느 쪽에도
 *    맞지 않는 판정이 나온다(시트의 배지와 통계의 띠가 서로 다른 말을 하게 된다).
 *  - **끼니를 모르는 기록은 선에서 빠지되 요약에는 남는다.** 아침 자리에 끼워 넣으면
 *    없는 사실을 그리는 것이고, 통째로 버리면 평균이 거짓말을 한다.
 */
import { buildGlucoseTrend } from "../src/features/home/utils/glucoseTrendModel"

const at = (
  recordDate: string,
  slot: "" | "BREAKFAST" | "LUNCH" | "DINNER",
  timing: "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL",
  value: number,
) => ({ recordDate, slot, timing, value })

describe("혈당 추이 모델", () => {
  test("기록이 없으면 빈 모델 — 화면은 이걸로 빈 상태를 그린다", () => {
    const model = buildGlucoseTrend([])
    expect(model.lines).toEqual([])
    expect(model.summary).toMatchObject({
      count: 0,
      days: 0,
      average: null,
      inTargetRatio: null,
      worstCell: null,
    })
  })

  test("한 날의 점들은 입력 순서와 무관하게 하루의 차례로 선다", () => {
    const model = buildGlucoseTrend([
      at("2026-08-05", "DINNER", "AFTER_MEAL", 165),
      at("2026-08-05", "", "FASTING", 95),
      at("2026-08-05", "BREAKFAST", "AFTER_MEAL", 140),
    ])
    expect(model.lines).toHaveLength(1)
    expect(model.lines[0]?.points.map((p) => p.index)).toEqual([0, 2, 6])
    expect(model.lines[0]?.points.map((p) => p.value)).toEqual([95, 140, 165])
  })

  test("날짜별로 선이 갈리고 날짜 오름차순이다", () => {
    const model = buildGlucoseTrend([
      at("2026-08-05", "", "FASTING", 95),
      at("2026-08-03", "", "FASTING", 88),
      at("2026-08-04", "LUNCH", "AFTER_MEAL", 150),
    ])
    expect(model.lines.map((line) => line.date)).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
    ])
  })

  test("목표는 칸마다 다르다 — 140 은 식후엔 안, 공복엔 밖", () => {
    const model = buildGlucoseTrend([
      at("2026-08-05", "LUNCH", "AFTER_MEAL", 140),
      at("2026-08-05", "", "FASTING", 140),
    ])
    const [fasting, afterLunch] = model.lines[0]?.points ?? []
    expect(fasting?.outOfTarget).toBe(true)
    expect(afterLunch?.outOfTarget).toBe(false)
    expect(model.summary.inTargetRatio).toBe(0.5)
  })

  test("끼니를 모르는 식후는 선에서 빠지지만 평균에는 남는다", () => {
    const model = buildGlucoseTrend([
      at("2026-08-05", "", "FASTING", 90),
      at("2026-08-05", "", "AFTER_MEAL", 210),
    ])
    // 축(공복 + 3끼니 × 식전/식후)에 자리가 없는 칸이다.
    expect(model.lines[0]?.points).toHaveLength(1)
    expect(model.summary.count).toBe(2)
    expect(model.summary.average).toBe(150)
    expect(model.summary.max).toBe(210)
  })

  test("가장 자주 목표를 벗어난 칸을 짚는다", () => {
    const model = buildGlucoseTrend([
      at("2026-08-03", "DINNER", "AFTER_MEAL", 220),
      at("2026-08-04", "DINNER", "AFTER_MEAL", 210),
      at("2026-08-05", "DINNER", "AFTER_MEAL", 205),
      at("2026-08-05", "BREAKFAST", "AFTER_MEAL", 200),
    ])
    expect(model.summary.worstCell).toEqual({
      slot: "DINNER",
      timing: "AFTER_MEAL",
      overCount: 3,
    })
  })

  test("y축은 목표 띠를 늘 품고, 값이 밖으로 나가면 따라 넓어진다", () => {
    const inside = buildGlucoseTrend([at("2026-08-05", "", "FASTING", 95)])
    expect(inside.yMin).toBeLessThanOrEqual(70)
    expect(inside.yMax).toBeGreaterThanOrEqual(180)

    const spike = buildGlucoseTrend([
      at("2026-08-05", "DINNER", "AFTER_MEAL", 320),
      at("2026-08-05", "", "FASTING", 45),
    ])
    expect(spike.yMax).toBeGreaterThanOrEqual(320)
    expect(spike.yMin).toBeLessThanOrEqual(45)
  })

  test("기록한 날 수는 측정 수가 아니라 날짜 수다", () => {
    const model = buildGlucoseTrend([
      at("2026-08-05", "", "FASTING", 95),
      at("2026-08-05", "LUNCH", "BEFORE_MEAL", 98),
      at("2026-08-04", "", "FASTING", 92),
    ])
    expect(model.summary.count).toBe(3)
    expect(model.summary.days).toBe(2)
  })
})
