/**
 * 전역 `AI 상담` 플로팅 필의 **좌표 상수만** 담은 순수 모듈.
 *
 * ## 왜 컴포넌트에서 뽑아냈나
 *
 * 이 두 값은 원래 `FloatingAiButton.tsx` 안에 있었다. 그런데 이 필은 **모든 탭 화면의
 * 오른쪽 아래를 영구히 점유**하므로, 각 화면은 "목록 맨 아래 카드가 필에 가리지 않도록"
 * 자기 바닥 여백을 이 값에서 계산해야 한다. 그 계산은 순수 산술이고 jest 로 못 박아야
 * 하는데 — `FloatingAiButton.tsx` 는 `react-native`·`react-native-reanimated` 를 들여오고
 * 이 저장소의 jest 는 `testEnvironment: "node"` 라 그 파일을 **파싱조차 못 한다.**
 *
 * 값을 순수 모듈로 내리면 화면도 테스트도 **같은 심볼을 import** 한다. 숫자를 박아 넣은
 * 코드는 컴파일은 되지만 이 상수를 참조하지 않으므로, 필을 옮기는 날 따라오지 않는다는
 * 사실이 테스트에서 드러난다.
 *
 * `FloatingAiButton.tsx` 는 이 파일을 re-export 한다 — 기존 import 경로
 * (`from "@/src/shared/components/FloatingAiButton"`)를 그대로 두기 위해서다.
 * 두 곳에 값을 적지 않는다.
 */

import { TAB_BAR_HEIGHT } from "../utils/bottomSafeArea"

/** 탭바 위 여백. 화면 쪽 콘텐츠는 이 아래로 내려가면 안 된다. */
export const FLOATING_AI_BUTTON_BOTTOM = 16

/** 필의 높이. 지름이자 라디우스의 두 배다. */
export const FLOATING_AI_BUTTON_HEIGHT = 48

/**
 * 탭바 위를 원점으로 본 **필이 덮는 구간의 위쪽 끝**.
 *
 * ⚠️ 탭 화면의 스크롤 여백에 이 값을 **그대로 쓰면 부족하다.** 아래
 * `floatingAiButtonScrollInset()` 를 쓸 것.
 */
export const FLOATING_AI_BUTTON_COVERAGE =
  FLOATING_AI_BUTTON_BOTTOM + FLOATING_AI_BUTTON_HEIGHT

/**
 * **탭 화면의 스크롤 콘텐츠**가 필을 피하려면 비워야 하는 바닥 여백.
 *
 * ## 🔴 왜 COVERAGE 만으로는 부족한가 (2026-08-19 실측)
 *
 * `app/(tabs)/_layout.tsx` 가 `tabBarStyle: { position: "absolute" }` 를 쓴다.
 * 탭바가 절대 위치면 레이아웃 공간을 차지하지 않으므로 **탭 화면의 콘텐츠는 화면
 * 맨 아래까지 내려온다.** 즉 스크롤 끝은 탭바 위가 아니라 화면 바닥이다.
 *
 * 필은 화면 바닥에서 `insets.bottom + TAB_BAR_HEIGHT + 16` 위에 떠서 그 위로
 * 48pt 를 덮는다(iPhone 17 Pro: 102 ~ 150). 그러므로 마지막 타일이 가리지
 * 않으려면 콘텐츠 끝에서 **150pt** 를 비워야 하는데, `COVERAGE` 는 64 뿐이다.
 *
 * 홈 탭의 "붓기" 카드 설명이 필에 가린 것이 정확히 이것이다.
 *
 * @param safeAreaBottom `useSafeAreaInsets().bottom`
 * @param gap 필과 마지막 콘텐츠 사이에 더 둘 숨통(기본 16)
 */
export function floatingAiButtonScrollInset(
  safeAreaBottom: number,
  gap = 16,
): number {
  return safeAreaBottom + TAB_BAR_HEIGHT + FLOATING_AI_BUTTON_COVERAGE + gap
}

/**
 * **화면 좌표계**에서 본 필의 `bottom` 값을 구한다.
 *
 * ## 🔴 상쇄되지 않는다 (2026-08-19 정정)
 *
 * 이 파일은 예전에 "탭바는 레이아웃 공간을 차지하므로 `_layout.tsx` 가 더해 주는
 * `insets.bottom + TAB_BAR_HEIGHT` 항은 화면 안에서 상쇄된다" 고 적어 두었다.
 * **그 전제가 틀렸다.** `app/(tabs)/_layout.tsx` 는
 *
 *     tabBarStyle: { position: "absolute" }
 *
 * 를 쓴다. 탭바가 절대 위치면 레이아웃 공간을 차지하지 않으므로 **탭 화면의 바닥은
 * 화면 맨 아래까지 내려온다.** 즉 두 좌표계의 원점이 다르고, 그 차이는 정확히
 * `insets.bottom + TAB_BAR_HEIGHT` 다.
 *
 * 그래서 화면이 `bottom: FLOATING_AI_BUTTON_BOTTOM + …` 처럼 필과 같은 산술을 쓰면
 * 필보다 그만큼 **아래에 깔려 겹친다** — 커뮤니티 탭의 `글쓰기` 버튼이 그랬다.
 *
 * ## 쓰는 쪽
 *
 *     const insets = useSafeAreaInsets()
 *     // AI 상담 필과 같은 높이
 *     bottom: floatingAiButtonBottomInScreen(insets.bottom)
 *     // 필 위로 한 칸 쌓기
 *     bottom: floatingAiButtonBottomInScreen(insets.bottom)
 *             + FLOATING_AI_BUTTON_HEIGHT + 12
 *
 * 스크롤 여백에는 쓰지 않는다. 그쪽은 `FLOATING_AI_BUTTON_COVERAGE` 다 —
 * `contentContainerStyle` 은 탭바 위에서 끝나는 좌표계이기 때문이다.
 */
export function floatingAiButtonBottomInScreen(safeAreaBottom: number): number {
  return safeAreaBottom + TAB_BAR_HEIGHT + FLOATING_AI_BUTTON_BOTTOM
}
