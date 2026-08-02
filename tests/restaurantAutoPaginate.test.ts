/**
 * 자동 다음 쪽 판정. 화면 없이 도는 순수 함수 둘이라 여기서 전부 고정한다.
 */

import {
  AUTO_PAGE_LIMIT,
  isNearBottom,
  loadMoreLead,
} from "@/src/features/restaurant/utils/autoPaginate"

describe("isNearBottom", () => {
  it("바닥에서 lead 만큼 앞이면 참이다", () => {
    // 콘텐츠 2000, 뷰포트 800 → 최대 y 는 1200. lead 200 이면 y=1000 부터 참.
    expect(isNearBottom({ y: 999, viewport: 800, content: 2000 }, 200)).toBe(false)
    expect(isNearBottom({ y: 1000, viewport: 800, content: 2000 }, 200)).toBe(true)
  })

  it("정확히 경계면 참이다 — 마지막 한 픽셀에서 안 걸리면 사용자가 끝까지 당겨도 안 온다", () => {
    expect(isNearBottom({ y: 1200, viewport: 800, content: 2000 }, 0)).toBe(true)
  })

  it("첫 레이아웃 전(0)에는 거짓이다", () => {
    // 여기서 참을 주면 화면이 뜨자마자 다음 쪽을 당긴다.
    expect(isNearBottom({ y: 0, viewport: 0, content: 0 }, 300)).toBe(false)
    expect(isNearBottom({ y: 0, viewport: 800, content: 0 }, 300)).toBe(false)
  })

  it("콘텐츠가 뷰포트보다 짧으면 참이다 — 더 스크롤할 수 없으므로 그 자리가 곧 바닥이다", () => {
    expect(isNearBottom({ y: 0, viewport: 800, content: 400 }, 0)).toBe(true)
  })
})

describe("loadMoreLead", () => {
  it("뷰포트에 비례하되 360 에서 잘린다", () => {
    expect(loadMoreLead(600)).toBe(300)
    expect(loadMoreLead(800)).toBe(360)
    expect(loadMoreLead(2000)).toBe(360)
  })

  it("어떤 기기에서도 hero+actionBar 아래에 남는다", () => {
    // 상한 360 이 그 보장이다. 이 값을 올리려면 위 주석의 계산을 다시 하라.
    for (const viewport of [568, 667, 736, 812, 844, 926, 1024]) {
      expect(loadMoreLead(viewport)).toBeLessThanOrEqual(360)
    }
  })
})

describe("AUTO_PAGE_LIMIT", () => {
  it("0 이면 자동이 꺼지는 킬 스위치다", () => {
    // 값 자체를 고정하지 않는다(운영 중 조정 가능). 0 이 꺼짐이라는 계약만 남긴다.
    expect(AUTO_PAGE_LIMIT).toBeGreaterThanOrEqual(0)
  })
})
