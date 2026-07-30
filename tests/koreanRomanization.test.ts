import {
  romanizeKorean,
  romanizedDisplayName,
} from "../src/shared/utils/koreanRomanization"

/**
 * 서버(`result_presentation.py`)에 같은 표가 있다. 두 구현이 어긋나면 화면마다
 * 음식 이름이 달라 보이므로, 여기 기대값은 서버 테스트와 **같은 값**을 쓴다.
 */
describe("Korean romanization", () => {
  it.each([
    ["감자조림", "Gamjajorim"],
    ["삼겹살 구이", "Samgyeopsal gui"],
    ["비빔밥", "Bibimbap"],
    ["감자탕", "Gamjatang"],
    ["두부조림", "Dubujorim"],
    ["미역국", "Miyeokguk"],
  ])("romanizes %s as %s", (korean, expected) => {
    expect(romanizedDisplayName(korean)).toBe(expected)
  })

  it.each([
    // 받침이 다음 음절 초성 ㅇ 으로 넘어가는 연음. 흔한 음식명이라 중요하다.
    ["제육볶음", "Jeyukbokkeum"],
    ["떡볶이", "Tteokbokki"],
    ["잡곡밥", "Japgokbap"],
  ])("applies liaison for %s", (korean, expected) => {
    expect(romanizedDisplayName(korean)).toBe(expected)
  })

  it("leaves non-Hangul characters untouched", () => {
    expect(romanizeKorean("Greek yogurt")).toBe("Greek yogurt")
    expect(romanizeKorean("100g")).toBe("100g")
  })

  it("keeps Latin fragments inside a mixed name", () => {
    expect(romanizeKorean("A형 간염")).toBe("Ahyeong ganyeom")
  })

  it("falls back to Food only when nothing is left", () => {
    expect(romanizedDisplayName("")).toBe("Food")
    expect(romanizedDisplayName("   ")).toBe("Food")
  })

  it("never returns an empty string for a Hangul name", () => {
    for (const name of ["밥", "국", "면", "죽", "빵"]) {
      expect(romanizedDisplayName(name).length).toBeGreaterThan(0)
      expect(romanizedDisplayName(name)).not.toBe("Food")
    }
  })
})
