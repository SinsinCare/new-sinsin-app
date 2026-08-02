/**
 * 길찾기 링크(`mapAppLinks`).
 *
 * 여기서 막는 사고는 셋이다:
 *  1. **좌표 없는 가게로 길찾기 버튼을 그리는 것.** 이름만으로 링크를 만들면 동명 가게로
 *     안내한다 — 없는 것보다 나쁘다.
 *  2. **`0,0` 을 좌표로 받아들이는 것.** 서버의 빈 좌표가 0 으로 내려온 적이 있고, 그 점은
 *     기니만 바다 위라 링크가 "정상적으로" 열린다.
 *  3. **플랫폼에 없는 앱을 목록에 넣는 것.** 애플 지도는 iOS 에만, 구글 내비는 안드로이드에.
 */

import {
  canRouteTo,
  mapAppLinks,
} from "../src/features/restaurant/utils/mapAppLinks"

const GANGNAM = { lat: 37.4979, lng: 127.0276, name: "신신국밥" }

describe("mapAppLinks", () => {
  it("국내 앱을 먼저 준다 — 카카오맵 · 네이버지도 순", () => {
    const links = mapAppLinks(GANGNAM, "ios")
    expect(links.map((link) => link.key)).toEqual(["kakao", "naver", "apple"])
  })

  it("안드로이드에는 애플 지도 대신 구글이 온다", () => {
    const links = mapAppLinks(GANGNAM, "android")
    expect(links.map((link) => link.key)).toEqual(["kakao", "naver", "google"])
  })

  it("좌표를 목적지로 싣는다 (앱 · 웹 양쪽)", () => {
    const [kakao, naver] = mapAppLinks(GANGNAM, "ios")
    expect(kakao!.appUrl).toContain("37.4979,127.0276")
    expect(kakao!.webUrl).toContain("37.4979,127.0276")
    expect(naver!.appUrl).toContain("dlat=37.4979")
    expect(naver!.appUrl).toContain("dlng=127.0276")
  })

  it("가게 이름을 URL 인코딩한다 — 한글·공백이 링크를 깨지 않는다", () => {
    const [kakao, naver] = mapAppLinks(
      { ...GANGNAM, name: "신신 국밥 & 밥집" },
      "ios",
    )
    expect(kakao!.webUrl).toContain(encodeURIComponent("신신 국밥 & 밥집"))
    expect(kakao!.webUrl).not.toContain(" ")
    expect(naver!.appUrl).toContain(encodeURIComponent("신신 국밥 & 밥집"))
  })

  it("이름이 비어도 링크를 만든다 — 좌표만 있으면 길은 찾을 수 있다", () => {
    const links = mapAppLinks({ ...GANGNAM, name: "   " }, "ios")
    expect(links).toHaveLength(3)
    expect(links[0]!.webUrl).toContain(encodeURIComponent("목적지"))
  })

  it("좌표가 없으면 **아무 링크도 만들지 않는다**", () => {
    expect(mapAppLinks({ lat: null, lng: null, name: "가게" }, "ios")).toEqual(
      [],
    )
    expect(mapAppLinks({ lat: 37.5, lng: null, name: "가게" }, "ios")).toEqual(
      [],
    )
    expect(canRouteTo({ lat: null, lng: 127.0, name: "가게" })).toBe(false)
  })

  it("`0,0` 은 좌표가 아니다 (빈 값이 실제 바다 좌표로 새지 않는다)", () => {
    expect(mapAppLinks({ lat: 0, lng: 0, name: "가게" }, "ios")).toEqual([])
    expect(canRouteTo({ lat: 0, lng: 0, name: "가게" })).toBe(false)
  })

  it("범위를 벗어난 좌표·NaN 을 거른다", () => {
    expect(canRouteTo({ lat: 91, lng: 127, name: "가게" })).toBe(false)
    expect(canRouteTo({ lat: 37.5, lng: 181, name: "가게" })).toBe(false)
    expect(canRouteTo({ lat: Number.NaN, lng: 127, name: "가게" })).toBe(false)
  })

  it("정상 좌표면 길찾기를 줄 수 있다고 답한다", () => {
    expect(canRouteTo(GANGNAM)).toBe(true)
  })
})
