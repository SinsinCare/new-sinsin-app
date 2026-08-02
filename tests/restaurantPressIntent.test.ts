/**
 * "누른 것" 과 "누르지 않은 것" 의 경계를 못 박는다.
 *
 * ## 무엇이 깨져 있었나 (2026-07-31 실측, 시뮬레이터 재현)
 *
 * 지도 화면에서 **손가락이 닿지도 않은 카드의 상세가 열렸다.**
 *
 * - 시트 목록을 세로로 훑기만 했는데(195,700 → 195,450) 상세가 열렸다. 그것도 손가락
 *   아래 카드(순남시래기)가 아니라 목록 **첫 카드**(장호덕손만두)였다.
 * - 정렬 시트의 딤을 눌러 닫았을 뿐인데 그 뒤에 상세가 이미 쌓여 있었다.
 * - 마커를 한 번 눌렀을 때 마커 선택과 **동시에** 첫 카드의 상세가 push 됐다.
 *
 * 원인은 화면 로직이 아니라 **RN 의 JS 리스폰더와 react-native-gesture-handler 가 서로를
 * 모른다**는 데 있다(자세한 전말은 `src/features/restaurant/utils/pressIntent.ts` 헤더).
 * 그래서 "이 press 는 press 가 아니다" 를 화면이 스스로 판정해야 하고, 그 판정 규칙만
 * 순수 함수로 떼어 냈다. 여기서 못을 박는 이유는 세 가지다.
 *
 * 1. 기기 없이 돌아간다. 재현에는 시뮬레이터가 필요했지만 **규칙**은 그렇지 않다.
 * 2. 임계값이 조용히 바뀌는 것을 막는다. 8px·400ms 는 `map/mapHtml.ts` 의 터치 shim 과
 *    같은 값이어야 한다 — 같은 뜻의 숫자가 두 벌 있으면 한쪽만 고쳐진다.
 * 3. **막지 말아야 할 것을 막지 않는 쪽**도 함께 고정한다. 가드를 넓게 잡으면 증상은
 *    사라지지만 정상적인 탭이 삼켜져 "눌러도 안 열린다" 가 된다 — 더 나쁜 결함이다.
 */

import {
  MAP_TOUCH_GUARD_MS,
  SCROLL_GUARD_MS,
  TAP_SLOP_PX,
  isMapTouchEcho,
  isScrollEcho,
  isTapGesture,
} from "@/src/features/restaurant/utils/pressIntent"

describe("isTapGesture — 끄는 동작은 press 가 아니다", () => {
  it("같은 자리에서 뗐으면 탭이다", () => {
    expect(isTapGesture({ x: 195, y: 700 }, { x: 195, y: 700 })).toBe(true)
  })

  it("손가락 떨림(슬롭 이내)은 탭으로 센다", () => {
    expect(
      isTapGesture({ x: 195, y: 700 }, { x: 195 + TAP_SLOP_PX, y: 700 }),
    ).toBe(true)
    expect(
      isTapGesture({ x: 195, y: 700 }, { x: 195, y: 700 - TAP_SLOP_PX }),
    ).toBe(true)
  })

  it("실제로 보고된 스크롤(195,700 → 195,450)은 탭이 아니다", () => {
    expect(isTapGesture({ x: 195, y: 700 }, { x: 195, y: 450 })).toBe(false)
  })

  it("가로로 밀어도(사진 스트립) 탭이 아니다", () => {
    expect(isTapGesture({ x: 300, y: 500 }, { x: 100, y: 500 })).toBe(false)
  })

  it("좌표를 모르면 막지 않는다 — 정보가 없다고 사용자의 탭을 삼키지 않는다", () => {
    expect(isTapGesture(null, { x: 1, y: 1 })).toBe(true)
    expect(isTapGesture({ x: 1, y: 1 }, null)).toBe(true)
    expect(isTapGesture(null, null)).toBe(true)
    expect(isTapGesture({ x: Number.NaN, y: 1 }, { x: 999, y: 999 })).toBe(true)
  })
})

describe("isMapTouchEcho — 마커 탭은 상세를 열지 않는다", () => {
  const now = 1_000_000

  it("지도를 만진 직후의 카드 press 는 지도 터치의 메아리다", () => {
    expect(isMapTouchEcho(now, now)).toBe(true)
    expect(isMapTouchEcho(now, now - (MAP_TOUCH_GUARD_MS - 1))).toBe(true)
  })

  it("창이 지나면 정상적인 카드 탭이다", () => {
    expect(isMapTouchEcho(now, now - MAP_TOUCH_GUARD_MS)).toBe(false)
    expect(isMapTouchEcho(now, now - 5_000)).toBe(false)
  })

  it("지도를 한 번도 만지지 않았으면 아무것도 막지 않는다", () => {
    expect(isMapTouchEcho(now, 0)).toBe(false)
  })

  it("시각이 거꾸로 가도(미래 타임스탬프) 막지 않는다", () => {
    expect(isMapTouchEcho(now, now + 1_000)).toBe(false)
  })

  it("mapHtml 의 마커 탭 가드와 같은 값이다", () => {
    // `map/mapHtml.ts` 가 마커 탭 직후의 지도 click 을 버릴 때 쓰는 400ms 와 같아야 한다.
    expect(MAP_TOUCH_GUARD_MS).toBe(400)
    expect(TAP_SLOP_PX).toBe(8)
  })
})

describe("isScrollEcho — 스크롤은 절대 내비게이션이 되지 않는다", () => {
  const now = 1_000_000

  it("손가락이 목록을 끌고 있는 동안의 press 는 전부 버린다", () => {
    expect(isScrollEcho(now, true, 0)).toBe(true)
    expect(isScrollEcho(now, true, now - 10_000)).toBe(true)
  })

  it("막 스크롤이 끝난 직후의 press 도 스크롤의 꼬리다", () => {
    expect(isScrollEcho(now, false, now)).toBe(true)
    expect(isScrollEcho(now, false, now - (SCROLL_GUARD_MS - 1))).toBe(true)
  })

  it("스크롤을 멈추고 누른 카드는 열려야 한다", () => {
    expect(isScrollEcho(now, false, now - SCROLL_GUARD_MS)).toBe(false)
    expect(isScrollEcho(now, false, now - 1_000)).toBe(false)
  })

  it("한 번도 스크롤하지 않았으면 아무것도 막지 않는다", () => {
    expect(isScrollEcho(now, false, 0)).toBe(false)
  })

  it("창은 짧다 — 길게 잡으면 정상적인 탭이 사라진다", () => {
    expect(SCROLL_GUARD_MS).toBeLessThanOrEqual(300)
  })
})
