/**
 * 지도 시트의 **스냅 값과 산수만** 담은 순수 모듈.
 *
 * 컴포넌트(`components/RestaurantListSheet.tsx`)에 두면 `react-native`·`@gorhom/bottom-sheet`
 * 를 함께 끌고 와 이 저장소의 jest(`testEnvironment: "node"`)가 파싱하지 못한다. 그러면
 * 아래 `predictSheetTop` 의 산수를 검증할 수 없고, 이건 **조용히 틀리는** 종류의 값이다
 * (틀려도 화면은 그려지고, 카메라만 두 번 움직인다).
 */

/** 시트 스냅 인덱스. `snapPoints` 배열의 순서와 1:1 이다. */
export const SHEET_SNAP = { COLLAPSED: 0, MID: 1, EXPANDED: 2 } as const

/**
 * `mid` 스냅이 차지하는 화면 비율(목업). **숫자를 여기 한 곳에만 둔다** — 시트는 이 값으로
 * `snapPoints` 를 만들고, 지도 화면은 같은 값으로 카메라 목표를 예측한다. 둘이 갈리면
 * 마커가 시트에 가려지거나 두 번 움직인다.
 */
export const SHEET_MID_RATIO = 0.55

/**
 * 스냅 비율 → **시트 윗변의 y**(컨테이너 좌표). `onChange` 가 주는 `position` 과 같은 뜻이다.
 *
 * ## 왜 예측이 필요한가 (사용자 보고: "배지가 아래로 내려갔다가 다시 중앙으로")
 *
 * 마커를 누르면 두 가지가 동시에 시작된다: 시트가 mid 로 올라오고, 카메라가 마커를
 * **보이는 영역**의 중앙에 놓는다. 그런데 카메라 계산이 그 순간의 시트 높이(=아직 접힘)를
 * 쓰면 "화면 전체의 중앙" 을 목표로 잡는다 — 시트가 올라오면 그 지점은 시트에 가려진
 * 아래쪽이다. 스냅이 끝난 뒤 보정이 한 번 더 돌면서 마커가 위로 다시 이동하고, 사용자
 * 눈에는 **두 번 움직이는 것**으로 보인다.
 *
 * `focusMarker` 가 멱등인 것과는 다른 문제다 — 멱등성은 **같은 입력**에 대해서만 성립하고,
 * 두 호출의 `padBottom` 이 서로 달랐다. 그래서 목표 좌표 자체가 둘이었다.
 *
 * 예측값을 쓰면 첫 명령이 곧 최종 위치이고, 스냅 후 보정은 같은 자리로 수렴해 보이지 않는다.
 */
export function predictSheetTop(
  containerHeight: number,
  ratio: number,
): number {
  if (!Number.isFinite(containerHeight) || containerHeight <= 0) return 0
  return Math.round(containerHeight * (1 - ratio))
}

/**
 * 스냅이 끝난 뒤 **카메라를 다시 맞춰야 하는가.**
 *
 * ## 왜 임계값이 필요한가 (사용자 보고 2차)
 *
 * 예측을 넣어 큰 점프는 사라졌지만 여전히 "**아주 조금** 떨어진 자리에서 멈췄다가 0.3초쯤
 * 뒤에 중앙으로" 움직였다. 0.3초는 시트 스냅 애니메이션이 끝나는 시점이고, 그때 도는
 * 보정이 **예측과 실제의 차이만큼** 카메라를 한 번 더 옮긴 것이다.
 *
 * 차이가 남는 이유는 예측이 근사이기 때문이다 — `"55%"` 는 **시트 컨테이너** 높이의
 * 비율인데 화면이 재는 `containerHeight` 는 지도 영역의 높이이고, 탭바·안전영역이
 * 끼어들면 둘이 몇 pt 어긋난다.
 *
 * 두 갈래로 없앤다:
 *  1. 화면이 **실제로 관측된 스냅 위치를 기억**해 두 번째 탭부터는 정확한 값을 쓴다.
 *  2. 그래도 남는 차이가 **눈에 보이지 않을 만큼 작으면 아예 다시 맞추지 않는다.**
 *     사람은 몇 pt 어긋난 정렬은 못 알아채지만, 멈췄다가 다시 움직이는 것은 즉시 알아챈다.
 *     정확성보다 **한 번에 끝나는 것**이 낫다.
 */
export const REFOCUS_TOLERANCE_PT = 8

export function shouldRefocusAfterSnap(
  usedTop: number,
  actualTop: number,
  tolerance: number = REFOCUS_TOLERANCE_PT,
): boolean {
  if (!Number.isFinite(usedTop) || !Number.isFinite(actualTop)) return false
  return Math.abs(actualTop - usedTop) > tolerance
}

/* ── 정확한 예측: 추정하지 말고 **역산한다** ───────────────────────────── */

/**
 * 시트가 실제로 쓰는 **컨테이너 높이**를 접힘 상태 한 번의 관측에서 되돌린다.
 *
 * ## 왜 필요한가 (보정 빈도를 0 에 가깝게)
 *
 * `mid`(`"55%"`)는 **시트 컨테이너** 높이의 비율인데, 화면이 `onLayout` 으로 재는 값은
 * 지도 영역의 높이다. 탭바·안전영역만큼 어긋나므로 예측이 몇 pt 빗나가고, 그 차이가
 * 스냅 직후 보정으로 나타난다("조금 떨어진 자리에 멈췄다가 다시 중앙으로").
 *
 * 그런데 **접힘 스냅은 픽셀 값**이다(핸들 블록 + sticky 헤더). 시트가 접힘에서 보고한
 * 위치는 정의상 `container - collapsedHeight` 이므로, 둘을 더하면 **시트가 쓰는 컨테이너
 * 높이 자체**가 나온다. 추정이 아니라 역산이다.
 *
 * 이 값은 마운트 직후(첫 `onChange`)에 이미 손에 들어온다 — 즉 **사용자가 아직 아무것도
 * 누르지 않은 시점**에 정확한 기준이 준비된다. 그래서 첫 탭부터 보정이 필요 없다.
 */
export function deriveSheetContainerHeight(
  collapsedPosition: number,
  collapsedHeight: number,
): number | null {
  if (
    !Number.isFinite(collapsedPosition) ||
    !Number.isFinite(collapsedHeight)
  ) {
    return null
  }
  if (collapsedPosition <= 0 || collapsedHeight <= 0) return null
  return collapsedPosition + collapsedHeight
}
