import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  CONTENT_BREATHING_ROOM,
  MIN_BOTTOM_GAP,
  TAB_BAR_HEIGHT,
  aboveTabBarSpace,
  bottomBarSpace,
  scrollBottomSpace,
} from "@/src/shared/utils/bottomSafeArea"

/**
 * 실측값(에뮬레이터 API 36): 제스처 내비게이션 하단 인셋 ≈ 24, 3버튼 ≈ 48.
 * iOS 홈 인디케이터 ≈ 34, 홈 버튼 기기 = 0.
 */
const GESTURE_NAV = 24
const THREE_BUTTON_NAV = 48
const IOS_HOME_INDICATOR = 34
const NO_SYSTEM_BAR = 0

describe("하단 안전영역 규칙", () => {
  it("시스템 바가 없어도 화면 모서리에 붙지 않는다", () => {
    // 0 을 그대로 쓰면 버튼이 베젤에 붙어 오조작이 늘고 잘린 것처럼 보인다.
    expect(bottomBarSpace(NO_SYSTEM_BAR)).toBe(MIN_BOTTOM_GAP)
  })

  it("시스템 바가 크면 그만큼만 피한다 — 더하지 않는다", () => {
    // 48 + 16 = 64 로 두면 3버튼 기기에서 본문이 그만큼 좁아진다.
    expect(bottomBarSpace(THREE_BUTTON_NAV)).toBe(THREE_BUTTON_NAV)
    expect(bottomBarSpace(GESTURE_NAV)).toBe(GESTURE_NAV)
    expect(bottomBarSpace(IOS_HOME_INDICATOR)).toBe(IOS_HOME_INDICATOR)
  })

  it("3버튼 기기가 제스처 기기보다 항상 더 피한다", () => {
    // QA 가 본 "기기에 따라 하단이 크게 가린다" 는 이 단조성이 깨질 때 생긴다.
    expect(bottomBarSpace(THREE_BUTTON_NAV)).toBeGreaterThan(
      bottomBarSpace(GESTURE_NAV),
    )
  })

  it("스크롤 마지막 여백은 바닥 여백보다 항상 넉넉하다", () => {
    for (const inset of [NO_SYSTEM_BAR, GESTURE_NAV, THREE_BUTTON_NAV]) {
      expect(scrollBottomSpace(inset)).toBe(
        bottomBarSpace(inset) + CONTENT_BREATHING_ROOM,
      )
      expect(scrollBottomSpace(inset)).toBeGreaterThan(bottomBarSpace(inset))
    }
  })

  it("탭바 위에 뜨는 요소는 탭바 높이를 함께 피한다", () => {
    expect(aboveTabBarSpace(THREE_BUTTON_NAV)).toBe(
      THREE_BUTTON_NAV + TAB_BAR_HEIGHT + MIN_BOTTOM_GAP,
    )
    expect(aboveTabBarSpace(NO_SYSTEM_BAR, 0)).toBe(
      MIN_BOTTOM_GAP + TAB_BAR_HEIGHT,
    )
  })

  it("탭바 높이는 탭 레이아웃과 같은 값이다", () => {
    // 두 곳이 갈리면 플로팅 필이 탭바를 덮거나 뜬다. 값을 옮겨 적지 말 것.
    const layout = readFileSync(
      join(__dirname, "../app/(tabs)/_layout.tsx"),
      "utf8",
    )
    expect(layout).toContain(`const TAB_BAR_HEIGHT = ${TAB_BAR_HEIGHT}`)
  })
})
