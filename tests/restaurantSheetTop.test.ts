/**
 * 시트 윗변 예측 — **마커를 눌렀을 때 카메라가 두 번 움직이지 않게** 하는 값.
 *
 * 사용자 보고: "지도에서 식당을 누르면 배지가 아래로 한 번 내려갔다가 다시 중앙으로
 * 온다." 원인은 카메라가 **그 순간의(접힌) 시트 높이**로 목표를 잡았다가, 시트가 mid 로
 * 올라온 뒤 보정이 한 번 더 돌았기 때문이다. `focusMarker` 가 멱등이라는 사실은 이 문제를
 * 막지 못한다 — 멱등성은 같은 입력에 대해서만 성립하고, 두 호출의 `padBottom` 이 달랐다.
 *
 * 그래서 탭 시점에 **스냅 후 높이를 예측**한다. 그 산수를 여기서 못 박는다.
 */

import {
  REFOCUS_TOLERANCE_PT,
  SHEET_MID_RATIO,
  deriveSheetContainerHeight,
  predictSheetTop,
  shouldRefocusAfterSnap,
} from "../src/features/restaurant/sheetSnap"

describe("predictSheetTop", () => {
  it("비율만큼 아래에서 올라온 시트의 윗변을 준다", () => {
    // 화면 800, mid 55% → 시트가 440 을 덮고 윗변은 360.
    expect(predictSheetTop(800, 0.55)).toBe(360)
    expect(predictSheetTop(1000, 0.5)).toBe(500)
  })

  it("mid 비율은 시트와 화면이 **같은 상수**를 본다", () => {
    // 숫자를 화면 쪽에 다시 적으면 시트의 스냅과 카메라의 예측이 조용히 갈린다.
    expect(SHEET_MID_RATIO).toBeGreaterThan(0)
    expect(SHEET_MID_RATIO).toBeLessThan(1)
    expect(predictSheetTop(1000, SHEET_MID_RATIO)).toBe(
      Math.round(1000 * (1 - SHEET_MID_RATIO)),
    )
  })

  it("컨테이너 높이를 아직 모르면 0 — 카메라는 패딩 없이 계산한다", () => {
    expect(predictSheetTop(0, 0.55)).toBe(0)
    expect(predictSheetTop(-10, 0.55)).toBe(0)
    expect(predictSheetTop(Number.NaN, 0.55)).toBe(0)
  })

  it("정수로 떨어진다 — 소수 좌표가 카메라 명령마다 미세하게 달라지지 않는다", () => {
    expect(Number.isInteger(predictSheetTop(812, SHEET_MID_RATIO))).toBe(true)
  })
})

/**
 * 스냅 후 재정렬 — **눈에 보일 때만** 한다.
 *
 * 예측을 넣어 큰 점프는 사라졌지만 사용자는 여전히 "아주 조금 떨어진 자리에서 멈췄다가
 * 0.3초쯤 뒤에 중앙으로" 를 봤다. 0.3초는 시트 스냅 애니메이션이 끝나는 시점이고, 그때
 * 도는 보정이 예측과 실제의 몇 pt 차이만큼 카메라를 한 번 더 옮긴 것이다.
 */
describe("shouldRefocusAfterSnap", () => {
  it("몇 pt 차이는 **다시 맞추지 않는다** — 멈췄다 다시 가는 것으로 보인다", () => {
    expect(shouldRefocusAfterSnap(360, 362)).toBe(false)
    expect(shouldRefocusAfterSnap(360, 360)).toBe(false)
    expect(shouldRefocusAfterSnap(360, 360 - REFOCUS_TOLERANCE_PT)).toBe(false)
  })

  it("예측이 크게 빗나갔으면 맞춘다 — 마커가 시트에 가리는 것이 더 나쁘다", () => {
    expect(shouldRefocusAfterSnap(360, 500)).toBe(true)
    expect(shouldRefocusAfterSnap(360, 200)).toBe(true)
  })

  it("값이 없거나 이상하면 움직이지 않는다", () => {
    expect(shouldRefocusAfterSnap(Number.NaN, 360)).toBe(false)
    expect(shouldRefocusAfterSnap(360, Number.NaN)).toBe(false)
  })
})

/**
 * 컨테이너 높이 **역산** — 예측 정확도를 올려 보정 자체를 없애는 쪽.
 *
 * `mid`(55%)는 시트 컨테이너 높이의 비율인데 화면이 재는 값은 지도 영역 높이라 탭바·
 * 안전영역만큼 어긋난다. 그런데 **접힘 스냅은 픽셀**이므로 접힘 위치와 더하면 시트가 쓰는
 * 컨테이너 높이가 그대로 나온다 — 추정이 아니라 역산이고, 마운트 직후 첫 `onChange` 에서
 * 이미 손에 들어온다(사용자가 아무것도 누르기 전).
 */
describe("deriveSheetContainerHeight", () => {
  it("접힘 위치 + 접힘 높이 = 컨테이너 높이", () => {
    // 컨테이너 812, 접힘 높이 132 → 접힘 위치는 680.
    expect(deriveSheetContainerHeight(680, 132)).toBe(812)
  })

  it("역산한 높이로 계산한 mid 는 화면 높이로 근사한 것과 다르다 (이 차이가 보정의 정체다)", () => {
    const derived = deriveSheetContainerHeight(680, 132)! // 812
    const screenApprox = 760 // 지도 영역만 잰 값
    expect(predictSheetTop(derived, SHEET_MID_RATIO)).not.toBe(
      predictSheetTop(screenApprox, SHEET_MID_RATIO),
    )
    // 그리고 그 차이는 임계값을 넘길 만큼 크다 — 그래서 눈에 보였다.
    expect(
      Math.abs(
        predictSheetTop(derived, SHEET_MID_RATIO) -
          predictSheetTop(screenApprox, SHEET_MID_RATIO),
      ),
    ).toBeGreaterThan(REFOCUS_TOLERANCE_PT)
  })

  it("아직 잴 수 없으면 null — 그때만 화면 높이로 근사한다", () => {
    expect(deriveSheetContainerHeight(0, 132)).toBeNull()
    expect(deriveSheetContainerHeight(680, 0)).toBeNull()
    expect(deriveSheetContainerHeight(Number.NaN, 132)).toBeNull()
  })
})
