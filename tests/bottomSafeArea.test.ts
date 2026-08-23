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

  it("탭 레이아웃은 탭바 높이를 옮겨 적지 않고 가져다 쓴다", () => {
    /*
     * 예전에는 `app/(tabs)/_layout.tsx` 가 같은 수(49)를 **자기 상수로 또 적었고**,
     * 이 테스트는 두 숫자가 같은지만 봤다. 2026-08-18 에 탭바를 `V2TabBar` 로 바꾸며
     * 높이가 52 로 바뀌자 두 곳을 다 고쳐야 했다 — 그게 애초에 문제였다.
     *
     * 이제는 레이아웃이 **이 모듈에서 가져다 쓴다.** 숫자가 하나뿐이면 갈릴 수 없으므로,
     * 값이 같은지가 아니라 **자기 상수를 다시 만들지 않았는지**를 검사한다.
     */
    const layout = readFileSync(
      join(__dirname, "../app/(tabs)/_layout.tsx"),
      "utf8",
    )
    expect(layout).toContain("TAB_BAR_HEIGHT")
    expect(layout).toContain("@/src/shared/utils/bottomSafeArea")
    expect(layout).not.toMatch(/const\s+TAB_BAR_HEIGHT\s*=/)
  })

  it("탭바 높이는 V2TabBar 의 실제 치수와 맞는다", () => {
    // 상단 테두리 1 + 상단 패딩 8 + 아이템(패딩 1 + 아이콘 24 + 간격 3 + 라벨 14 + 패딩 1).
    // 컴포넌트 치수가 바뀌면 여기서 먼저 걸린다 — 안 그러면 플로팅 필이 바를 덮는다.
    const BORDER = 1
    const PADDING_TOP = 8
    const ITEM = 1 + 24 + 3 + 14 + 1
    expect(TAB_BAR_HEIGHT).toBe(BORDER + PADDING_TOP + ITEM)
  })
})
