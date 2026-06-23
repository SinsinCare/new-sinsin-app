import {
  formatBirthDateInput,
  getBirthDateInputState,
} from "../src/features/auth/data/dateUtils"

describe("birth date text input", () => {
  it("formats numeric input as YYYY.MM.DD", () => {
    expect(formatBirthDateInput("19900101")).toBe("1990.01.01")
    expect(formatBirthDateInput("1990.01")).toBe("1990.01")
    expect(formatBirthDateInput("1990년01월01일")).toBe("1990.01.01")
  })

  it("accepts leap-day dates", () => {
    expect(
      getBirthDateInputState("2000.02.29", new Date("2026-06-23T00:00:00Z")),
    ).toEqual({
      isValid: true,
      message: "",
      parts: { year: "2000", month: "02", day: "29" },
    })
  })

  it("rejects invalid or future dates", () => {
    expect(
      getBirthDateInputState("2001.02.29", new Date("2026-06-23T00:00:00Z")),
    ).toMatchObject({ isValid: false, message: "잘못된 생년월일입니다." })
    expect(
      getBirthDateInputState("2026.06.24", new Date("2026-06-23T00:00:00Z")),
    ).toMatchObject({
      isValid: false,
      message: "미래 날짜는 입력할 수 없습니다.",
    })
  })
})
