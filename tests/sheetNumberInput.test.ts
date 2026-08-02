import {
  commitSheetNumber,
  formatSheetNumber,
  sanitizeSheetNumberText,
} from "../src/features/home/utils/sheetNumberInput"

const WEIGHT = { min: 1, max: 300, decimals: 1 }
const GLUCOSE = { min: 1, max: 999, decimals: 0 }

describe("sheet number input — 타이핑 중", () => {
  it("빈 문자열을 그대로 둔다 — 지울 수 없는 입력창을 만들지 않는다", () => {
    expect(sanitizeSheetNumberText("", WEIGHT)).toBe("")
  })

  it("소수점만 찍은 중간 상태를 허용한다", () => {
    expect(sanitizeSheetNumberText("72.", WEIGHT)).toBe("72.")
  })

  it("소수 자릿수를 넘겨 치지 못하게 막는다", () => {
    expect(sanitizeSheetNumberText("72.36", WEIGHT)).toBe("72.3")
  })

  it("정수 전용 규격에서는 소수점을 아예 받지 않는다", () => {
    // 소수점이 사라진 뒤 남은 "1205" 는 다시 max(999) 자릿수에서 잘려 "120" 이 된다.
    expect(sanitizeSheetNumberText("120.5", GLUCOSE)).toBe("120")
    expect(sanitizeSheetNumberText("12.5", GLUCOSE)).toBe("125")
  })

  it("소수점은 하나만 남긴다", () => {
    expect(sanitizeSheetNumberText("7.2.5", WEIGHT)).toBe("7.2")
  })

  it("iOS decimal-pad 가 쉼표를 보내도 소수점으로 받는다", () => {
    expect(sanitizeSheetNumberText("72,5", WEIGHT)).toBe("72.5")
  })

  it("붙여넣은 문자를 버린다", () => {
    expect(sanitizeSheetNumberText("72kg", WEIGHT)).toBe("72")
  })

  it("정수부를 max 자릿수까지만 받는다", () => {
    expect(sanitizeSheetNumberText("12345", GLUCOSE)).toBe("123")
    expect(sanitizeSheetNumberText("9999", WEIGHT)).toBe("999")
  })
})

describe("sheet number input — 확정", () => {
  it("빈 값은 0 이 아니라 null 이다 — 지운 것과 0 은 다르다", () => {
    expect(commitSheetNumber("", WEIGHT)).toBeNull()
    expect(commitSheetNumber("   ", WEIGHT)).toBeNull()
    expect(commitSheetNumber(".", WEIGHT)).toBeNull()
  })

  it("소수점으로 끝난 중간 상태를 숫자로 확정한다", () => {
    expect(commitSheetNumber("72.", WEIGHT)).toBe(72)
  })

  it("범위를 벗어나면 자른다", () => {
    expect(commitSheetNumber("500", WEIGHT)).toBe(300)
    expect(commitSheetNumber("0", WEIGHT)).toBe(1)
    expect(commitSheetNumber("1500", GLUCOSE)).toBe(999)
  })

  it("소수 자릿수에 맞춰 반올림한다", () => {
    expect(commitSheetNumber("72.35", WEIGHT)).toBe(72.4)
    expect(commitSheetNumber("120.6", GLUCOSE)).toBe(121)
  })

  it("앞의 0 을 흘려보낸다", () => {
    expect(commitSheetNumber("0072.5", WEIGHT)).toBe(72.5)
  })
})

describe("sheet number input — 표기", () => {
  it("체중은 소수 한 자리를 유지한다", () => {
    expect(formatSheetNumber(72, WEIGHT)).toBe("72.0")
    expect(formatSheetNumber(72.35, WEIGHT)).toBe("72.4")
  })

  it("혈당은 정수로 적는다", () => {
    expect(formatSheetNumber(120.6, GLUCOSE)).toBe("121")
  })

  it("확정한 값을 다시 넣어도 값이 변하지 않는다", () => {
    const once = commitSheetNumber("72.35", WEIGHT)
    expect(once).not.toBeNull()
    expect(
      commitSheetNumber(formatSheetNumber(once as number, WEIGHT), WEIGHT),
    ).toBe(once)
  })
})
