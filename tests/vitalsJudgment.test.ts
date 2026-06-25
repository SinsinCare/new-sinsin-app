import {
  judgeBloodPressure,
  judgeGlucose,
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

  it.each([
    [89, "caution"],
    [90, "normal"],
    [139, "normal"],
    [140, "caution"],
  ] as const)("judges post-meal glucose %s as %s", (value, expected) => {
    expect(judgeGlucose(value, "AFTER_MEAL")).toBe(expected)
  })

  it("normalizes blank and invalid vital input to null", () => {
    expect(parseVital("")).toBeNull()
    expect(parseVital("   ")).toBeNull()
    expect(parseVital("abc")).toBeNull()
    expect(parseVital("120")).toBe(120)
  })
})
