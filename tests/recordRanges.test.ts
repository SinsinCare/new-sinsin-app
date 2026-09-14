/**
 * 기록 페이지 입력 중 판정(`features/home/components/record/pages/recordRanges.ts`).
 *
 * 문턱값은 제품 오너가 F3(2026-09-11)에서 준 값이다. 이 파일이 잡는 회귀는 셋이다.
 *
 * 1. **목표 띠는 양 끝을 포함하고, 그 위 경계는 이상이다.** "목표 90–120" 이라 말해 놓고
 *    120 을 주의로 읽으면 배지와 바가 서로 다른 말을 한다. 140 은 높음이다.
 * 2. **혈압은 둘 중 나쁜 쪽.** 최고가 정상이어도 최저가 높으면 높음이다.
 * 3. **빈 값·반쪽 값은 판정하지 않는다.** 지어낸 판정은 조용한 폴백이다.
 */
import {
  DIASTOLIC_RANGE,
  GLUCOSE_AFTER_MEAL_RANGE,
  GLUCOSE_FASTING_RANGE,
  SYSTOLIC_RANGE,
  classifyBloodPressure,
  classifyValue,
  glucoseRangeFor,
  parseReading,
  rangePosition,
  worseStatus,
} from "../src/features/home/components/record/pages/recordRanges"

describe("혈당 공복 띠", () => {
  const range = GLUCOSE_FASTING_RANGE
  test.each([
    [69, "low"],
    [70, "normal"],
    [100, "normal"],
    [101, "elevated"],
    [125, "elevated"],
    [126, "high"],
    [300, "high"],
  ] as const)("%i → %s", (value, status) => {
    expect(classifyValue(value, range)).toBe(status)
  })
  test("식전은 공복 띠, 식후·미지정은 식후 띠", () => {
    expect(glucoseRangeFor("FASTING")).toBe(GLUCOSE_FASTING_RANGE)
    expect(glucoseRangeFor("BEFORE_MEAL")).toBe(GLUCOSE_FASTING_RANGE)
    expect(glucoseRangeFor("AFTER_MEAL")).toBe(GLUCOSE_AFTER_MEAL_RANGE)
    expect(glucoseRangeFor(null)).toBe(GLUCOSE_AFTER_MEAL_RANGE)
    expect(glucoseRangeFor(undefined)).toBe(GLUCOSE_AFTER_MEAL_RANGE)
  })
})

describe("혈당 식후 띠", () => {
  const range = GLUCOSE_AFTER_MEAL_RANGE
  test.each([
    [69, "low"],
    [70, "normal"],
    [85, "normal"],
    [112, "normal"],
    [180, "normal"],
    [181, "elevated"],
    [200, "elevated"],
    [201, "high"],
  ] as const)("%i → %s", (value, status) => {
    expect(classifyValue(value, range)).toBe(status)
  })
  test("라벨은 목표 90–180 을 가리킨다", () => {
    expect(range.targetLow).toBe(90)
    expect(range.targetHigh).toBe(180)
  })
})

describe("혈압 최고·최저", () => {
  test.each([
    [89, "low"],
    [90, "normal"],
    [120, "normal"],
    [121, "elevated"],
    [139, "elevated"],
    [140, "high"],
  ] as const)("최고 %i → %s", (value, status) => {
    expect(classifyValue(value, SYSTOLIC_RANGE)).toBe(status)
  })
  test.each([
    [59, "low"],
    [60, "normal"],
    [80, "normal"],
    [81, "elevated"],
    [89, "elevated"],
    [90, "high"],
  ] as const)("최저 %i → %s", (value, status) => {
    expect(classifyValue(value, DIASTOLIC_RANGE)).toBe(status)
  })
  test("종합은 둘 중 나쁜 쪽이다", () => {
    expect(classifyBloodPressure(118, 78)).toBe("normal")
    expect(classifyBloodPressure(118, 92)).toBe("high")
    expect(classifyBloodPressure(150, 70)).toBe("high")
    expect(classifyBloodPressure(125, 70)).toBe("elevated")
    expect(classifyBloodPressure(85, 70)).toBe("low")
    expect(classifyBloodPressure(85, 85)).toBe("elevated")
    expect(classifyBloodPressure(120, 80)).toBe("normal")
    expect(worseStatus("low", "normal")).toBe("low")
  })
  test("반쪽 입력은 판정하지 않는다", () => {
    expect(classifyBloodPressure(118, null)).toBeNull()
    expect(classifyBloodPressure(null, 78)).toBeNull()
    expect(classifyBloodPressure(undefined, undefined)).toBeNull()
  })
})

describe("빈 값·마커 위치·파싱", () => {
  test("빈 값은 null", () => {
    expect(classifyValue(null, SYSTOLIC_RANGE)).toBeNull()
    expect(classifyValue(undefined, SYSTOLIC_RANGE)).toBeNull()
    expect(classifyValue(Number.NaN, SYSTOLIC_RANGE)).toBeNull()
  })
  test("마커는 0–1 로 접힌다", () => {
    expect(rangePosition(60, SYSTOLIC_RANGE)).toBe(0)
    expect(rangePosition(110, SYSTOLIC_RANGE)).toBeCloseTo(0.5)
    expect(rangePosition(160, SYSTOLIC_RANGE)).toBe(1)
    expect(rangePosition(300, SYSTOLIC_RANGE)).toBe(1)
    expect(rangePosition(10, SYSTOLIC_RANGE)).toBe(0)
  })
  test("세 자리 이하 정수만 값이다", () => {
    expect(parseReading("112")).toBe(112)
    expect(parseReading("")).toBeNull()
    expect(parseReading("1a")).toBeNull()
    expect(parseReading("1234")).toBeNull()
  })
})
