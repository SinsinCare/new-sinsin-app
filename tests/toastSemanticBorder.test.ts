/**
 * 토스트가 다크 화면에 묻히지 않고 의미별로 구분되는지 고정한다.
 *
 * ## 실측 사고 (2026-08-19)
 *
 * 토스트 면은 라이트·다크 공용 잉크색이었다. 다크 식당 화면의 시트·탭바와 거의 같은
 * 명도라 카드 외곽이 사라졌고, `현재 위치가 서비스 지역 밖이에요` 통보가 필터 칩 위에
 * 떠 있는지 배경에 붙어 있는지 구분하기 어려웠다.
 *
 * 의미색을 면 전체에 깔면 경고가 너무 무거워진다. 대신 1px 얕은 보더만 의미색으로
 * 두른다. 성공/주의/오류는 각 status 색, 기본은 탭바와 같은 line.alternative를 쓴다.
 * 다크 면은 body/default와 정확히 같게 해 OKLCH L·chroma가 혼자 튀지 않게 한다.
 */
import {
  toastBackgroundColor,
  toastBorderColor,
  type ToastBorderPalette,
} from "@/src/design-system-v2/components/toastChrome"

const palette: ToastBorderPalette = {
  lineAlternative: "#70737c38",
  success: "#41D992",
  caution: "#FFB84D",
  error: "#FF6B6B",
}

describe("toast semantic border", () => {
  it("다크 토스트 면은 body와 정확히 같은 색이라 L·chroma가 혼자 튀지 않는다", () => {
    const darkBody = "#1f1f21"
    expect(
      toastBackgroundColor("dark", {
        lightInk: "#2a2a37",
        darkBody,
      }),
    ).toBe(darkBody)
  })

  it("라이트에서는 기존 어두운 잉크 필을 유지한다", () => {
    expect(
      toastBackgroundColor("light", {
        lightInk: "#2a2a37",
        darkBody: "#1f1f21",
      }),
    ).toBe("#2a2a37f5")
  })

  it("기본 토스트도 탭바와 같은 중립 alternative 보더를 가진다", () => {
    expect(toastBorderColor("default", palette)).toBe(palette.lineAlternative)
  })

  it("성공·주의·오류가 서로 다른 의미색 보더를 가진다", () => {
    const success = toastBorderColor("success", palette)
    const caution = toastBorderColor("caution", palette)
    const error = toastBorderColor("error", palette)

    expect(new Set([success, caution, error]).size).toBe(3)
    expect(success.toLowerCase()).toContain(palette.success.toLowerCase())
    expect(caution.toLowerCase()).toContain(palette.caution.toLowerCase())
    expect(error.toLowerCase()).toContain(palette.error.toLowerCase())
  })

  it("의미색 보더도 탭바와 같은 약 22% 알파를 쓴다", () => {
    for (const variant of ["success", "caution", "error"] as const) {
      const color = toastBorderColor(variant, palette)
      expect(color).toMatch(/^#[0-9a-f]{8}$/iu)
      expect(color.slice(-2).toLowerCase()).toBe("38")
    }
  })
})
