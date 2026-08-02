/**
 * 지도 상단 스크림 색 (`scrimColor`).
 *
 * 이 함수가 있는 이유는 그라디언트의 **끝 색**이다. 끝을 `transparent`(= `#00000000`)로
 * 두면 안드로이드에서 검은 기가 도는 그라디언트가 되고, 반대로 알파를 못 먹이면 지도 위에
 * 단색 띠가 깔려 지도가 그 선에서 잘린 것처럼 보인다. 둘 다 화면에서만 드러나는 결함이라
 * 여기서 값으로 못 박는다.
 */

import { scrimColor } from "../src/features/restaurant/components/mapScrim"

describe("scrimColor", () => {
  it("불투명 hex 를 같은 RGB 의 알파 색으로 바꾼다", () => {
    // 라이트 배경(`background.default` = #ffffff)
    expect(scrimColor("#ffffff", 0.92)).toBe("rgba(255,255,255,0.92)")
    // 다크 배경(#1f1f21)
    expect(scrimColor("#1f1f21", 0.92)).toBe("rgba(31,31,33,0.92)")
  })

  it("알파 0 에서도 **RGB 를 유지한다** — 검은 기가 도는 그라디언트를 만들지 않는다", () => {
    expect(scrimColor("#1f1f21", 0)).toBe("rgba(31,31,33,0)")
    expect(scrimColor("#ffffff", 0)).toBe("rgba(255,255,255,0)")
  })

  it("3자리 hex 도 받는다", () => {
    expect(scrimColor("#fff", 1)).toBe("rgba(255,255,255,1)")
  })

  it("rgb()/rgba() 표기도 받는다 (토큰이 알파 색일 수 있다)", () => {
    expect(scrimColor("rgb(10, 20, 30)", 0.5)).toBe("rgba(10,20,30,0.5)")
    expect(scrimColor("rgba(10, 20, 30, 0.6)", 0.5)).toBe("rgba(10,20,30,0.5)")
  })

  it("알파는 0~1 로 잘린다", () => {
    expect(scrimColor("#ffffff", 2)).toBe("rgba(255,255,255,1)")
    expect(scrimColor("#ffffff", -1)).toBe("rgba(255,255,255,0)")
  })

  it("모르는 표기는 **투명**으로 떨어진다 — 단색 띠를 만들지 않는다", () => {
    // 그대로 돌려주면 알파가 안 먹은 불투명 색이 그라디언트 양 끝에 들어가 지도 위에
    // 띠가 생긴다. 아무것도 안 그리는 쪽이 낫다.
    expect(scrimColor("papayawhip", 0.9)).toBe("rgba(255,255,255,0)")
    expect(scrimColor("", 0.9)).toBe("rgba(255,255,255,0)")
  })
})
