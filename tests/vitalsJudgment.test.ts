import {
  judgeBloodPressure,
  judgeBloodPressureValue,
  judgeGlucose,
  judgeGlucoseValue,
  parseVital,
} from "../src/features/home/utils/vitalsJudgment"

describe("vitals judgment", () => {
  it.each([
    [110, 60, "normal"],
    [119, 79, "normal"],
    [90, 60, "normal"],
    [119, 80, "caution"],
    [120, 60, "caution"],
    [120, 80, "caution"],
    [89, 79, "caution"],
    [110, 59, "caution"],
    [5, 50, "caution"],
  ] as const)(
    "judges blood pressure %s/%s as %s",
    (systolic, diastolic, expected) => {
      expect(judgeBloodPressure(systolic, diastolic)).toBe(expected)
    },
  )

  it("treats incomplete blood pressure as none", () => {
    expect(judgeBloodPressure(119, null)).toBe("none")
    expect(judgeBloodPressure(null, 79)).toBe("none")
  })

  it.each([
    [69, "caution"],
    [70, "normal"],
    [99, "normal"],
    [100, "caution"],
  ] as const)("judges non-post-meal glucose %s as %s", (value, expected) => {
    expect(judgeGlucose(value, "FASTING")).toBe(expected)
    expect(judgeGlucose(value, "BEFORE_MEAL")).toBe(expected)
  })

  // 식후 목표 90–180 은 홈 시트 시안(2026-08-03)의 값이다.
  it.each([
    [89, "caution"],
    [90, "normal"],
    [180, "normal"],
    [181, "caution"],
  ] as const)("judges post-meal glucose %s as %s", (value, expected) => {
    expect(judgeGlucose(value, "AFTER_MEAL")).toBe(expected)
  })

  it("gives the sheet badge a tone and a direction", () => {
    expect(judgeGlucoseValue(null, "FASTING")).toBeNull()
    expect(judgeGlucoseValue(95, "AFTER_MEAL")).toEqual({
      tone: "normal",
      direction: "in",
    })
    expect(judgeGlucoseValue(60, "FASTING")).toEqual({
      tone: "caution",
      direction: "low",
    })
    expect(judgeGlucoseValue(185, "AFTER_MEAL")).toEqual({
      tone: "caution",
      direction: "high",
    })
    // 200 부터는 빠른 확인 구간 — 바의 레드 면과 같은 숫자를 본다.
    expect(judgeGlucoseValue(200, "AFTER_MEAL")).toEqual({
      tone: "danger",
      direction: "high",
    })

    expect(judgeBloodPressureValue(118, 78)).toEqual({
      tone: "normal",
      direction: "in",
    })
    expect(judgeBloodPressureValue(85, 55)).toEqual({
      tone: "caution",
      direction: "low",
    })
    expect(judgeBloodPressureValue(128, 82)).toEqual({
      tone: "caution",
      direction: "high",
    })
    expect(judgeBloodPressureValue(142, 88)).toEqual({
      tone: "danger",
      direction: "high",
    })
    expect(judgeBloodPressureValue(118, null)).toBeNull()
  })

  it("normalizes blank and invalid vital input to null", () => {
    expect(parseVital("")).toBeNull()
    expect(parseVital("   ")).toBeNull()
    expect(parseVital("abc")).toBeNull()
    expect(parseVital("120")).toBe(120)
  })
})
