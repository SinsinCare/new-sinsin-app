/**
 * 지도가 멎었을 때의 판단 — 팬은 버튼, 줌은 자동 재검색.
 *
 * 이 규칙은 **조용히 틀린다.** 팬에서 자동이 켜지면 미는 동안 요청이 계속 나가고 목록이
 * 손가락 아래에서 갈리며, 줌에서 자동이 꺼지면 확대했는데 화면 밖 가게가 목록에 남아
 * "지도가 안 따라온다" 가 된다. 둘 다 화면에서만 드러나므로 여기서 값으로 못 박는다.
 */

import {
  CLUSTER_ZOOM_STEP,
  nextClusterZoom,
  resolveViewportAction,
} from "../src/features/restaurant/utils/viewportAction"

const HERE = { bboxKey: "37.49,127.02,37.51,127.04", zoom: 6 }

describe("resolveViewportAction", () => {
  it("첫 뷰포트는 바로 찾는다 — 지도를 열자마자 빈 목록을 주지 않는다", () => {
    expect(resolveViewportAction(null, HERE)).toBe("search")
  })

  it("**줌이 바뀌면 자동으로 다시 찾는다** (확대·축소 둘 다)", () => {
    expect(resolveViewportAction(HERE, { ...HERE, zoom: 7 })).toBe("search")
    expect(resolveViewportAction(HERE, { ...HERE, zoom: 5 })).toBe("search")
  })

  it("줌이 바뀌면 위치가 함께 바뀌어도 자동이다 (핀치는 보통 살짝 밀린다)", () => {
    expect(
      resolveViewportAction(HERE, {
        bboxKey: "37.50,127.03,37.52,127.05",
        zoom: 7,
      }),
    ).toBe("search")
  })

  it("**위치만 바뀌면 버튼을 띄운다** — 미는 동안 목록이 갈리지 않는다", () => {
    expect(
      resolveViewportAction(HERE, {
        bboxKey: "37.50,127.03,37.52,127.05",
        zoom: 6,
      }),
    ).toBe("prompt")
  })

  it("같은 화면이면 아무것도 하지 않는다 (되돌아온 팬에 pill 이 남지 않는다)", () => {
    expect(resolveViewportAction(HERE, { ...HERE })).toBe("idle")
  })
})

/**
 * 클러스터 파고들기 — **확대되어야 한다.**
 *
 * 사용자 보고: "숫자 노드를 누르면 조금씩 축소되다가 더 이상 축소될 수 없을 때 다시 한
 * 단계씩 줌된다." 원인은 `fitBounds` 였다 — 상자는 **전체 뷰포트**에서 1/4 로 뽑고,
 * 맞추는 곳은 시트·상단 오버레이를 뺀 **보이는 영역**(화면의 ~24%)이라 두 축소가 상쇄되고
 * 반올림 방향에 따라 한 단계 축소되기도 했다.
 *
 * 지금은 확대량을 **레벨**로 말한다(카카오는 한 단계가 2배 → −2 가 정확히 4배).
 */
describe("nextClusterZoom", () => {
  it("**항상 확대된다** — 레벨이 작아진다(카카오는 작을수록 확대)", () => {
    expect(nextClusterZoom(6, 1)).toBe(4)
    expect(nextClusterZoom(4, 1)).toBe(2)
  })

  it("두 단계 = 4배. 종전 `fitBounds` 가 노렸던 배율과 같다", () => {
    expect(6 - nextClusterZoom(6, 1)).toBe(CLUSTER_ZOOM_STEP)
    expect(CLUSTER_ZOOM_STEP).toBe(2)
  })

  it("하한 아래로 내려가지 않는다 (최대 확대에서 더 눌러도 그대로)", () => {
    expect(nextClusterZoom(2, 1)).toBe(1)
    expect(nextClusterZoom(1, 1)).toBe(1)
  })

  it("소수 줌이 들어와도 정수 레벨로 떨어진다", () => {
    expect(nextClusterZoom(5.4, 1)).toBe(3)
  })

  it("값이 이상하면 하한으로 — 축소로 새지 않는다", () => {
    expect(nextClusterZoom(Number.NaN, 1)).toBe(1)
  })
})
