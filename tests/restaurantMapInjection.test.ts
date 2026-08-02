/**
 * 지도 주입 규칙과 **"받았는데 안 그렸다" 불변식**.
 *
 * 이 스위트가 지키는 것은 한 문장이다: **서버가 결과를 줬으면 지도에 무언가 들어간다.**
 *
 * 왜 이 문장을 테스트로 박아 두는가 — 2026-07-31 에 정확히 그 반대가 일어났고 아무 신호도
 * 없었다. `mode:"CLUSTER" · total:376 · clusters:3` 을 200 으로 받은 화면이
 * `map.setMarkers([])` 를 불러 지도를 비웠다(필터 게이트). 요청 성공, 목록 정상, 에러 0건,
 * 테스트 전부 통과 — 사람이 눈으로 봐야만 발견되는 실패였다.
 */

import {
  isSilentlyEmptyMap,
  mapInjectionCount,
  resolveMapInjection,
} from "../src/features/restaurant/utils/mapInjection"
import type {
  MapClusterDto,
  MapMarkerDto,
} from "../src/features/restaurant/types"

const marker = (id: number): MapMarkerDto =>
  ({
    restaurantId: id,
    lat: 37.5,
    lng: 127.03,
    name: `가게 ${id}`,
  }) as unknown as MapMarkerDto

const cluster = (count: number): MapClusterDto =>
  ({
    key: `0.012:37.5:127.03:${count}`,
    lat: 37.5,
    lng: 127.03,
    count,
  }) as unknown as MapClusterDto

describe("resolveMapInjection", () => {
  it("CLUSTER 모드면 클러스터를 넣는다", () => {
    const injection = resolveMapInjection({
      mode: "CLUSTER",
      markers: [],
      clusters: [cluster(310), cluster(48)],
    })
    expect(injection.kind).toBe("clusters")
    expect(mapInjectionCount(injection)).toBe(2)
  })

  it("MARKER 모드면 마커를 넣는다", () => {
    const injection = resolveMapInjection({
      mode: "MARKER",
      markers: [marker(1), marker(2), marker(3)],
      clusters: [],
    })
    expect(injection.kind).toBe("markers")
    expect(mapInjectionCount(injection)).toBe(3)
  })

  it("**모드 라벨과 실제 배열이 어긋나면 데이터가 이긴다** (지도가 비는 쪽으로 실패하지 않는다)", () => {
    // 서버가 CLUSTER 라고 했는데 클러스터가 비고 마커가 왔다 → 마커를 그린다.
    const asCluster = resolveMapInjection({
      mode: "CLUSTER",
      markers: [marker(1)],
      clusters: [],
    })
    expect(asCluster.kind).toBe("markers")

    // 반대 방향도 같다.
    const asMarker = resolveMapInjection({
      mode: "MARKER",
      markers: [],
      clusters: [cluster(12)],
    })
    expect(asMarker.kind).toBe("clusters")
  })

  it("둘 다 비면 빈 주입이다 (없는 것을 지어내지 않는다)", () => {
    expect(
      mapInjectionCount(
        resolveMapInjection({ mode: "CLUSTER", markers: [], clusters: [] }),
      ),
    ).toBe(0)
  })
})

describe("isSilentlyEmptyMap — 조용한 빈 지도 탐지", () => {
  it("결과가 있는데 주입이 0이면 **결함이다**", () => {
    // 2026-07-31 의 실제 상황: total 376, 그런데 지도에 들어간 것 0.
    expect(
      isSilentlyEmptyMap({
        total: 376,
        injection: { kind: "markers", markers: [] },
      }),
    ).toBe(true)
    expect(
      isSilentlyEmptyMap({
        total: 376,
        injection: { kind: "clusters", clusters: [] },
      }),
    ).toBe(true)
  })

  it("결과가 0이면 결함이 아니다 — 그건 빈 지역이고 빈 상태 안내가 따로 있다", () => {
    expect(
      isSilentlyEmptyMap({
        total: 0,
        injection: { kind: "markers", markers: [] },
      }),
    ).toBe(false)
  })

  it("정상적으로 그려졌으면 조용하다", () => {
    expect(
      isSilentlyEmptyMap({
        total: 376,
        injection: { kind: "clusters", clusters: [cluster(310)] },
      }),
    ).toBe(false)
  })
})
