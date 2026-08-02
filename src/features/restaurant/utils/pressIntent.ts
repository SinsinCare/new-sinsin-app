/**
 * "누른 것" 과 "누르지 않은 것" 을 가르는 규칙. 순수 함수만 있다.
 *
 * ## 왜 화면 밖에 이 규칙이 따로 있나 — 유령 내비게이션의 정체
 *
 * 지도 화면에서 **손가락이 닿지도 않은 카드의 상세가 열리는** 일이 실측됐다(2026-07-31).
 *
 * - 시트 목록을 세로로 **스크롤**했을 뿐인데(195,700 → 195,450) 상세가 밀려 들어왔다.
 *   그것도 손가락 아래 카드가 아니라 **목록 첫 카드**였다.
 * - 지도 **마커**를 한 번 눌렀는데 마커 선택과 **동시에** 첫 카드의 상세가 push 됐다.
 *   한 번의 터치로 화면이 두 장 쌓인 적도 있다.
 * - 정렬 시트의 **딤(backdrop)** 을 눌러 닫았을 뿐인데 그 뒤에 상세가 이미 쌓여 있었다.
 *
 * 세 경우의 공통점은 "그 터치는 카드에 닿지 않았다" 이다. 원인은 RN 의 **JS 리스폰더
 * 시스템**과 `@gorhom/bottom-sheet` 가 쓰는 **react-native-gesture-handler** 가 서로를
 * 모른다는 데 있다. 시트의 목록은 `Gesture.Native()` 로 감싸인 스크롤뷰이고, 그 네이티브
 * 제스처가 터치를 가져가는 순간 RN 쪽 리스폰더에는 **취소가 전달되지 않는다.** 그래서
 *
 * 1. 스크롤이 끝나며 올라온 touchend 가 그대로 `onResponderRelease` → `onPress` 가 된다
 *    (스크롤이 곧 탭이 된다), 그리고
 * 2. 리스폰더가 풀리지 않고 남으면 그 뒤의 **아무 터치**(WebView 위의 마커 탭, 모달 딤)
 *    까지 그 카드에게 배달되어 다시 `onPress` 가 된다.
 *
 * 즉 좌표가 아니라 **리스폰더**가 잘못돼 있으므로, 화면이 스스로 "이 press 는 press 가
 * 아니다" 를 판정할 수 있어야 한다. 그 판정을 컴포넌트 안에 흩어 두면 카드·칩·푸터마다
 * 다른 임계값이 생기므로 규칙을 여기 하나로 모은다. 전부 순수 함수라
 * `tests/restaurantPressIntent.test.ts` 가 기기 없이 못을 박는다.
 *
 * ## 임계값을 새로 발명하지 않는다
 *
 * 8px 과 400ms 는 `map/mapHtml.ts` 의 터치 shim 이 이미 쓰는 값이다(WebView 안에서
 * iOS 가 click 을 삼키는 문제를 같은 방식으로 판정한다). 같은 뜻의 숫자가 두 개 있으면
 * 하나만 고쳐지므로 값을 맞춰 둔다.
 */

/** 탭으로 인정하는 최대 이동. `mapHtml.ts` 의 `addTap` 과 같은 값이다. */
export const TAP_SLOP_PX = 8

/**
 * 지도가 방금 처리한 터치를 카드 press 로 읽지 않는 창.
 * `mapHtml.ts` 가 마커 탭 직후의 지도 click 을 버릴 때 쓰는 값과 같다.
 */
export const MAP_TOUCH_GUARD_MS = 400

/**
 * 손가락 스크롤이 끝난 뒤 press 를 다시 받기까지의 창.
 *
 * 짧게 잡는 이유: 사용자는 스크롤을 멈추고 곧바로 카드를 누른다. 길게 잡으면 그 정상적인
 * 탭이 사라져 "눌러도 안 열린다" 가 된다. 관성 스크롤 중의 탭은 iOS 가 원래 스크롤을
 * 멈추는 데 쓰므로 여기서 막아도 잃는 것이 없다.
 */
export const SCROLL_GUARD_MS = 250

export interface TapPoint {
  x: number
  y: number
}

/**
 * 누른 지점과 뗀 지점이 같은 자리인가. 좌표를 하나라도 모르면 **막지 않는다** —
 * 이 규칙은 유령을 거르기 위한 것이지, 정보가 없다고 사용자의 탭을 삼키기 위한 것이 아니다.
 */
export function isTapGesture(
  start: TapPoint | null | undefined,
  end: TapPoint | null | undefined,
  slop: number = TAP_SLOP_PX,
): boolean {
  if (!start || !end) return true
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y)) return true
  if (!Number.isFinite(end.x) || !Number.isFinite(end.y)) return true
  return Math.abs(end.x - start.x) <= slop && Math.abs(end.y - start.y) <= slop
}

/**
 * 지도가 방금 삼킨 터치의 메아리인가.
 *
 * 마커·클러스터 탭, 빈 지도 탭, 지도 드래그 시작 — 지도가 처리한 터치의 시각을 화면이
 * 적어 두고, 그 직후에 도착한 카드 press 를 이 함수가 버린다. **마커 탭이 상세를 밀어
 * 올리는 일은 이 한 줄로 불가능해진다.**
 *
 * 아직 지도를 한 번도 만지지 않았으면(`0`) 항상 `false` 다.
 */
export function isMapTouchEcho(
  now: number,
  lastMapTouchAt: number,
  windowMs: number = MAP_TOUCH_GUARD_MS,
): boolean {
  if (!Number.isFinite(lastMapTouchAt) || lastMapTouchAt <= 0) return false
  const elapsed = now - lastMapTouchAt
  return elapsed >= 0 && elapsed < windowMs
}

/**
 * 목록 스크롤의 메아리인가. **드래그 중이면 언제나 참이다** — 손가락이 아직 목록을 끌고
 * 있는 동안 올라온 press 는 어떤 경우에도 사용자의 탭이 아니다.
 *
 * `lastScrollEndAt` 은 **손가락 스크롤이 끝난 시각**만 담는다. 프로그램 스크롤
 * (마커 탭의 `scrollToTop`)까지 담으면 마커를 누른 직후의 정상적인 카드 탭이 막힌다.
 */
export function isScrollEcho(
  now: number,
  dragging: boolean,
  lastScrollEndAt: number,
  windowMs: number = SCROLL_GUARD_MS,
): boolean {
  if (dragging) return true
  if (!Number.isFinite(lastScrollEndAt) || lastScrollEndAt <= 0) return false
  const elapsed = now - lastScrollEndAt
  return elapsed >= 0 && elapsed < windowMs
}
