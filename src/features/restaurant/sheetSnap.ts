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

/* ── 지도의 "루트 상태" ─────────────────────────────────────────────── */

/**
 * **지도 탭을 다시 눌렀을 때 되돌릴 것이 남았는가.**
 *
 * 다른 네 탭의 루트 상태는 "목록 맨 위" 지만 지도에는 그런 축이 없다. 지도의 루트는
 * **내 위치 + 기본(접힘) 스냅**이다 — 카카오맵·네이버지도가 같은 자리에서 하는 일이고,
 * 이 화면의 진입 상태이기도 하다.
 *
 * 화면의 `if` 로 두지 않는 이유는 이 파일 머리말 그대로다: 렌더러 없는 이 저장소의
 * jest 가 화면 안의 조건은 못 보고, 이건 **조용히 틀리는** 종류의 판정이다(틀려도
 * 화면은 멀쩡하고, 탭만 영영 새로고침에 도달하지 못한다).
 *
 * 위치를 모르면(권한 거부 · 커버리지 밖) **카메라 축은 아예 없는 것으로 친다.**
 * 그러지 않으면 되돌릴 수 없는 조건을 영원히 만족하지 못해, 그 사용자의 지도 탭은
 * 재탭할 때마다 시트만 접고 4번(다시 받기)에 절대 도달하지 못한다.
 */
export function isMapAtRootState(state: {
  /** 지금 시트 스냅 인덱스. */
  sheetIndex: number
  /** 되돌릴 좌표를 갖고 있는가(`useMyLocation` 이 커버리지까지 판정한 뒤의 값). */
  hasMyLocation: boolean
  /** 카메라가 마지막으로 그 좌표에 놓였고 그 뒤로 옮겨지지 않았는가. */
  atMyLocation: boolean
}): boolean {
  if (state.sheetIndex !== SHEET_SNAP.COLLAPSED) return false
  if (!state.hasMyLocation) return true
  return state.atMyLocation
}

/* ── 손을 뗐을 때 **어느 스냅으로 갈 것인가** ─────────────────────────── */

/**
 * "튕겼다"(flick) 고 인정하는 최소 속도(pt/s).
 *
 * 손가락 플릭은 보통 1,000–4,000pt/s 이고, 천천히 끌어다 놓는 동작은 200pt/s 아래에서
 * 끝난다. 300 은 그 사이의 값이다.
 *
 * **이동 거리로는 방향을 만들지 않는다.** 한때 "24pt 넘게 끌었으면 한 칸 옮긴다" 는
 * 규칙도 같이 뒀는데, 그러면 천천히 96pt 만 끌어 올려도 시트가 화면 전체로 올라간다 —
 * 고치려던 "너무 올라간다" 를 다른 얼굴로 되살리는 것이다(테스트가 먼저 잡았다).
 * 천천히 끄는 동작의 뜻은 "여기에 놓겠다" 이므로 **놓은 자리**가 답이고, 던지는 동작의
 * 뜻은 "다음 칸으로 보내겠다" 이므로 그때만 한 칸을 준다.
 */
export const DETENT_FLICK_VELOCITY_PT_PER_SEC = 300

export interface DetentDecision {
  /** 스냅 위치 배열. **인덱스 0 이 가장 낮은 시트**(= y 가 가장 큼)다. */
  detents: readonly number[]
  /** 제스처가 시작될 때의 시트 윗변 y. */
  startPosition: number
  /** 손을 뗀 순간의 시트 윗변 y. */
  releasePosition: number
  /** 세로 속도. **양수가 아래로**(제스처 핸들러의 부호 그대로). */
  velocityY: number
  flickVelocity?: number
}

/**
 * 손을 뗐을 때 갈 스냅의 **인덱스**.
 *
 * ## 왜 라이브러리 기본값을 쓰지 않는가 (실측 2026-08-17)
 *
 * gorhom 의 기본 규칙은 redash 의 `snapPoint` 하나다 — `놓은 위치 + 0.2 × 속도` 에서
 * **가장 가까운** 스냅. 이 규칙은 마우스로는 멀쩡하고 손가락에서 무너진다:
 *
 * - 시뮬레이터에서 마우스로 끌면 속도가 ~280pt/s 라 `0.2 × v` 가 56pt 뿐이다.
 *   그래서 개발 중에는 늘 한 칸씩 얌전히 움직였다.
 * - 실제 손가락 플릭은 3,000pt/s 가 예사다. 그러면 투영이 **600pt** — 화면의 3분의 2를
 *   손가락이 가지도 않은 곳으로 건너뛴다. 실측: 전체(펼침)에서 180pt 만 튕겨 내렸는데
 *   중간을 지나쳐 **접힘까지** 내려갔다.
 * - 반대쪽 실패도 같은 뿌리다. 스냅 간격이 ~370pt 라 **185pt 넘게 끌지 않으면**
 *   제자리로 되돌아온다 — 짧게 튕겨 올리면 "아무 일도 안 일어난다".
 *
 * 두 증상이 합쳐진 것이 사용자가 말한 "너무 올렸다 내렸다" 다: 조금 끌면 안 가고,
 * 튕기면 끝까지 간다. 그래서 매번 다시 맞춰야 한다.
 *
 * ## 새 규칙 — 두 가지 동작을 **다르게** 읽는다
 *
 * - **천천히 끌어다 놓았다**(속도 < 임계값): 뜻은 "여기에 놓겠다" 이므로
 *   **놓은 자리에서 가장 가까운 스냅**으로 간다. 속도로 투영하지 않는다.
 *   그래서 화면 끝까지 끌면 두 칸도 가고(손가락이 실제로 갔으니까), 조금만 끌면
 *   제자리로 돌아온다(손가락이 안 갔으니까). 둘 다 눈에 보이는 대로다.
 * - **튕겼다**(속도 ≥ 임계값): 뜻은 "다음 칸으로 보내겠다" 이므로 그 방향으로
 *   **딱 한 칸**. 손가락이 이미 더 갔으면 그쪽을 존중한다(둘 중 더 먼 쪽).
 *
 * 한 문장으로: **시트는 손가락이 간 곳보다 더 가지 않는다 — 튕겼을 때 한 칸만 예외다.**
 *
 * 이러면 (a) 30pt 짜리 짧은 플릭도 반드시 한 칸 움직이고(종전에는 185pt 를 넘겨야 했다),
 * (b) 아무리 빠르게 튕겨도 스냅을 건너뛰지 않는다.
 *
 * 순수 함수라 기기 없이 검증된다(`tests/restaurantSheetDetent.test.ts`).
 *
 * ## 이 함수가 **자기완결적**이어야 하는 이유 (실측 2026-08-17)
 *
 * 제스처 핸들러(UI 스레드 워클릿)에서 불린다. 그래서 `"worklet"` 지시자가 필요하고,
 * 더 중요하게는 **모듈 안의 다른 함수를 부르면 안 된다.** 처음에는 `nearestDetentIndex`,
 * `clampIndex` 를 모듈 상단에 따로 두었는데, jest 는 전부 통과했고 기기에서는 첫 제스처에
 * `nearestDetentIndex is not a function (it is undefined)` 로 죽었다 — 워클릿 런타임에는
 * 그 모듈 바인딩이 없다. 헬퍼로 쪼개고 싶어지면 **그 유혹이 이 주석의 대상**이다.
 */
export function resolveDetentIndex({
  detents,
  startPosition,
  releasePosition,
  velocityY,
  flickVelocity = DETENT_FLICK_VELOCITY_PT_PER_SEC,
}: DetentDecision): number {
  "worklet"
  const last = detents.length - 1
  if (last < 0) return 0

  // 놓은 자리에서 가장 가까운 스냅.
  let posIdx = 0
  let posBest = Number.POSITIVE_INFINITY
  for (let index = 0; index <= last; index += 1) {
    const distance = Math.abs(detents[index] - releasePosition)
    if (distance < posBest) {
      posBest = distance
      posIdx = index
    }
  }

  const flicked =
    Number.isFinite(velocityY) && Math.abs(velocityY) >= flickVelocity
  if (!flicked) return posIdx

  /*
    인덱스가 커질수록 시트는 **높아진다**(y 가 작아진다). 그래서 위로 튕기는 것(velocityY < 0)이
    +1 이다. 방향을 이동량이 아니라 속도로 읽는 이유: 아래로 끌다가 마지막에 위로 튕겨
    놓는 동작의 뜻은 "올린다" 인데, 이동량만 보면 정반대로 읽는다.
  */
  const direction = velocityY < 0 ? 1 : -1

  // 제스처가 시작된 스냅.
  let startIdx = 0
  let startBest = Number.POSITIVE_INFINITY
  for (let index = 0; index <= last; index += 1) {
    const distance = Math.abs(detents[index] - startPosition)
    if (distance < startBest) {
      startBest = distance
      startIdx = index
    }
  }

  // 손가락이 간 곳과 한 칸 중, 튕긴 **방향으로 더 먼 쪽**.
  const stepIdx = startIdx + direction
  const candidate =
    direction > 0 ? Math.max(posIdx, stepIdx) : Math.min(posIdx, stepIdx)
  if (candidate < 0) return 0
  if (candidate > last) return last
  return candidate
}
