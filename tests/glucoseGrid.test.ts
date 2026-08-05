/**
 * 혈당 격자 규칙(`features/home/utils/glucoseGrid.ts`).
 *
 * 이 파일이 잡는 회귀는 셋이다.
 *
 * 1. **하루의 차례.** 서버는 입력 순(id)으로 준다. 저녁을 먼저 적고 아침을 나중에 적은
 *    날의 배열을 그대로 그리면 추이선이 시간을 거꾸로 간다.
 * 2. **칸은 끼니까지 맞아야 같은 칸이다.** 시점만 보고 찾으면 아침 식후 값이 저녁 식후
 *    자리에 떠서, 사용자가 그대로 저장하는 순간 아침 수치가 저녁 수치로 복제된다.
 * 3. **공복에는 끼니를 싣지 않는다.** 서버가 400 으로 막는 조합이라(공복은 끼니에 매이지
 *    않는다) 화면이 실수로도 실을 수 없어야 한다.
 */
import {
  findGlucoseCell,
  orderGlucoseByDay,
  slotForSubmit,
} from "../src/features/home/utils/glucoseGrid"

const record = (
  slot: "" | "BREAKFAST" | "LUNCH" | "DINNER",
  timing: "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL",
  value: number,
) => ({ slot, timing, value })

describe("혈당 격자", () => {
  test("입력 순이 아니라 하루의 차례로 세운다", () => {
    const day = [
      record("DINNER", "AFTER_MEAL", 160),
      record("", "FASTING", 96),
      record("BREAKFAST", "AFTER_MEAL", 141),
      record("LUNCH", "BEFORE_MEAL", 108),
    ]
    expect(orderGlucoseByDay(day).map((r) => r.value)).toEqual([
      96, 141, 108, 160,
    ])
  })

  test("끼니를 모르는 기록은 맨 뒤 — 아침이라고 추측해 끼워 넣지 않는다", () => {
    const day = [
      record("", "AFTER_MEAL", 200),
      record("DINNER", "AFTER_MEAL", 150),
      record("", "FASTING", 90),
    ]
    expect(orderGlucoseByDay(day).map((r) => r.value)).toEqual([90, 150, 200])
  })

  test("서버가 slot 을 안 주는 구버전 응답도 시점 순서는 지킨다", () => {
    const legacy = [
      { timing: "AFTER_MEAL" as const, value: 150 },
      { timing: "FASTING" as const, value: 95 },
    ]
    expect(orderGlucoseByDay(legacy).map((r) => r.value)).toEqual([95, 150])
  })

  test("칸 찾기는 끼니까지 본다 — 아침 식후가 저녁 식후 자리에 뜨지 않는다", () => {
    const day = [record("BREAKFAST", "AFTER_MEAL", 141)]
    expect(findGlucoseCell(day, { slot: "BREAKFAST", timing: "AFTER_MEAL" }))
      .not.toBeNull()
    expect(
      findGlucoseCell(day, { slot: "DINNER", timing: "AFTER_MEAL" }),
    ).toBeNull()
  })

  test("공복 칸은 끼니가 빈 기록과 맞는다", () => {
    const day = [record("", "FASTING", 96)]
    expect(findGlucoseCell(day, { slot: "", timing: "FASTING" })?.value).toBe(96)
  })

  test("저장에 실을 끼니 — 공복이면 언제나 null", () => {
    expect(slotForSubmit({ slot: "BREAKFAST", timing: "FASTING" })).toBeNull()
    expect(slotForSubmit({ slot: "", timing: "AFTER_MEAL" })).toBeNull()
    expect(slotForSubmit({ slot: "LUNCH", timing: "AFTER_MEAL" })).toBe("LUNCH")
    expect(slotForSubmit({ slot: "DINNER", timing: "BEFORE_MEAL" })).toBe(
      "DINNER",
    )
  })
})
