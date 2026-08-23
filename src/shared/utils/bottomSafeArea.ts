/**
 * 화면 **아래쪽**에 무언가를 붙일 때 쓰는 규칙 한 벌.
 *
 * ## 왜 규칙이 필요한가
 *
 * 안드로이드의 하단 시스템 바는 기기·설정에 따라 높이가 크게 다르다. 제스처 내비게이션은
 * 대략 16~24dp 인데 3버튼 내비게이션은 **48dp** 다(실측: 에뮬레이터 API 36). 그래서
 * 제스처 기기에서 맞춰 둔 여백은 3버튼 기기에서 그대로 가려진다 — QA 가 "기기에 따라
 * 하단이 안드로이드 내비게이션 바에 크게 가린다" 고 한 것이 이것이다.
 *
 * 그런데 이 저장소에는 `insets.bottom + 40`, `+ 16`, `+ 100`, `+ spacing[24]` 처럼
 * **손으로 고른 상수**가 89곳에 흩어져 있었다. 값이 제각각이면 화면마다 하단 여백이
 * 다르게 보이고(사용자는 그걸 "어떤 화면은 잘리고 어떤 화면은 뜬다" 로 읽는다),
 * 무엇보다 다음 사람이 어떤 값을 골라야 하는지 알 수 없다.
 *
 * ## 규칙
 *
 * - **바닥에 붙는 것**(CTA 바, 시트 푸터, 플로팅 버튼)은 `bottomBarSpace()`.
 *   시스템 바를 피하고, 시스템 바가 0 인 기기(구형 안드로이드·일부 태블릿)에서도
 *   손가락이 화면 모서리에 닿지 않게 최소 여백을 보장한다.
 * - **스크롤 콘텐츠의 마지막 여백**은 `scrollBottomSpace()`. 위 값에 콘텐츠가 바에
 *   딱 붙지 않을 만큼의 숨 쉴 공간을 더한다.
 * - 탭바 위에 겹쳐 뜨는 것은 `TAB_BAR_HEIGHT` 를 **함께** 더한다(`aboveTabBarSpace`).
 *
 * 순수 함수로 둔 이유는 이 저장소의 관용구 그대로다 — RN 을 들여오는 모듈은 jest(node)가
 * 파싱하지 못해서, 규칙을 컴포넌트 안에 두면 검증할 방법이 사라진다.
 */

/**
 * 시스템 바가 없을 때도 남겨 두는 최소 하단 여백(pt).
 *
 * 0 으로 두면 버튼이 화면 맨 아래 모서리에 붙는다. 물리적으로는 누를 수 있지만 손가락이
 * 베젤에 걸려 오조작이 늘고, 무엇보다 "잘린 것처럼" 보인다.
 */
export const MIN_BOTTOM_GAP = 16

/**
 * 하단 탭 바의 **시스템 바 위 높이**(safe-area 여백은 뺀 값).
 *
 * `V2TabBar`(Figma node 61:5948)의 치수를 더한 값이다 —
 * 상단 테두리 1 + 상단 패딩 8 + 아이템(패딩 1 + 아이콘 24 + 간격 3 + 라벨 14 + 패딩 1) = **52**.
 *
 * v2 의 `barHeight.tabBar`(62)와 다른 수를 쓰는 이유: 그 토큰은 safe-area 가 없는 기기에서
 * 바가 차지하는 **전체** 높이(위 52 + 하단 패딩 11 ≈ 62)다. 여기서 필요한 것은
 * `bottomBarSpace()` 가 이미 시스템 바 몫을 더한 뒤에 **추가로** 올려야 할 높이라,
 * 하단 패딩을 뺀 쪽이 맞다. (safe-area 기기: 34 + 52 ≈ `barHeight.tabBarSafe` 84)
 *
 * 예전 값 49 는 react-navigation 기본 바의 높이였다. 2026-08-17 에 탭 바를 정본
 * 컴포넌트로 바꾸면서 3pt 높아졌다. 이 값이 틀리면 탭바 위에 뜨는 것들
 * (AI 상담 필·토스트)이 바에 겹치거나 뜬다.
 */
export const TAB_BAR_HEIGHT = 52

/** 콘텐츠가 하단 바에 닿지 않도록 두는 숨 쉴 공간(pt). */
export const CONTENT_BREATHING_ROOM = 24

/**
 * 바닥에 붙는 요소의 하단 여백. 시스템 바를 피하되 최소 여백은 보장한다.
 *
 * **더하지 않고 `max` 를 쓴다.** 시스템 바가 48dp 인 기기에서 `48 + 16 = 64` 는 너무
 * 멀고, 그만큼 본문이 좁아진다. 시스템 바는 이미 손이 닿지 않는 영역이므로 그보다 큰
 * 여백을 또 둘 이유가 없다.
 */
export function bottomBarSpace(bottomInset: number): number {
  return Math.max(bottomInset, MIN_BOTTOM_GAP)
}

/** 스크롤 콘텐츠의 마지막 여백. 바닥 여백 + 숨 쉴 공간. */
export function scrollBottomSpace(bottomInset: number): number {
  return bottomBarSpace(bottomInset) + CONTENT_BREATHING_ROOM
}

/**
 * 탭바 **위에** 떠 있는 요소(플로팅 버튼 등)의 하단 오프셋.
 * 탭바 자체가 이미 시스템 바를 피하고 있으므로 그 높이를 더한다.
 */
export function aboveTabBarSpace(
  bottomInset: number,
  gap = MIN_BOTTOM_GAP,
): number {
  return bottomBarSpace(bottomInset) + TAB_BAR_HEIGHT + gap
}
