/**
 * **서버가 준 결과를 지도에 무엇으로 그릴 것인가** — 그리고 "받았는데 안 그렸다" 를
 * 감지하는 불변식.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 이 모듈이 생긴 이유 (실제로 난 사고)
 *
 * 2026-07-31 실측: `GET /restaurants/map` 이 `mode:"CLUSTER" · total:376 · clusters:3` 을
 * 정상 응답했는데 **지도에는 아무것도 없었다.** 화면 코드에 이런 줄이 있었기 때문이다.
 *
 *     const showMarkers = hasActiveFilter(filters)
 *     if (!showMarkers) { map.setMarkers([]); return }   // 필터가 없으면 빈 배열
 *
 * 목업·스펙에 근거가 있던 결정이지만(§"필터 미적용 → 지도 기본 POI만"), 필터는 기본값이
 * **비어 있다** — 즉 모든 사용자가 처음 보는 화면에서 지도가 텅 비었다. 그리고 이 실패는
 * 아무 신호도 내지 않았다: 요청은 200, 목록에는 376곳, 에러 로그 0건, 테스트 전부 통과.
 * "지도에 식당이 안 찍힌다" 는 **사람이 눈으로 보고** 발견했다.
 *
 * ■ 그래서 무엇을 바꾸나
 *
 *  1. **주입할 것을 고르는 판단을 순수 함수로 꺼낸다.** 화면의 `if` 안에 있으면 이 저장소의
 *     jest(node, RN 렌더 불가)가 검증할 수 없고, 조용히 되돌아가도 아무도 모른다.
 *  2. **`mode` 라벨만 믿고 데이터를 버리지 않는다.** 서버가 `CLUSTER` 라고 했는데 클러스터가
 *     비어 있고 마커가 차 있으면 **마커를 그린다.** 라벨과 실제가 어긋나는 날 지도가 비는
 *     쪽이 아니라 보이는 쪽으로 실패해야 한다(§`resolveMapInjection` 의 폴백).
 *  3. **"결과는 있는데 지도가 비었다" 를 코드가 스스로 알아챈다**(`isSilentlyEmptyMap`).
 *     이건 어떤 조합에서도 결함이므로, 화면이 이 값을 보고 개발 빌드에서 소리를 낸다.
 *
 * 세 번째가 이 파일의 핵심이다. 앞으로 누가 어떤 이유로 주입을 끊더라도 — 필터 게이트든,
 * 잘못된 mode 분기든, 빈 배열 초기화든 — **비었다는 사실 자체**가 잡힌다.
 */

import type { MapClusterDto, MapMarkerDto } from "../types"

export type MapInjection =
  | { kind: "clusters"; clusters: MapClusterDto[] }
  | { kind: "markers"; markers: MapMarkerDto[] }

export interface MapInjectionInput {
  /** 서버가 정한 모드. 라벨일 뿐이고, 실제 배열과 어긋나면 배열이 이긴다. */
  mode: "MARKER" | "CLUSTER"
  markers: readonly MapMarkerDto[]
  clusters: readonly MapClusterDto[]
}

/**
 * 지도에 밀어 넣을 것. **둘 중 하나만** 들어간다(웹 쪽이 서로를 지운다).
 *
 * 규칙은 "모드를 따르되, 그 모드의 배열이 비어 있고 반대쪽에 데이터가 있으면 반대쪽" 이다.
 * 정상 응답에서는 첫 줄에서 끝나고, 폴백은 서버·앱이 어긋난 날에만 돈다 — 그날 화면이
 * 비는 대신 조금 다르게 보이는 쪽을 고른다.
 */
export function resolveMapInjection(input: MapInjectionInput): MapInjection {
  const markers = [...input.markers]
  const clusters = [...input.clusters]

  if (input.mode === "CLUSTER") {
    if (clusters.length > 0) return { kind: "clusters", clusters }
    if (markers.length > 0) return { kind: "markers", markers }
    return { kind: "clusters", clusters }
  }

  if (markers.length > 0) return { kind: "markers", markers }
  if (clusters.length > 0) return { kind: "clusters", clusters }
  return { kind: "markers", markers }
}

/** 실제로 지도에 들어간 개수. 불변식과 로그가 같은 수를 본다. */
export function mapInjectionCount(injection: MapInjection): number {
  return injection.kind === "clusters"
    ? injection.clusters.length
    : injection.markers.length
}

/**
 * **서버는 결과를 줬는데 지도에는 아무것도 안 들어갔다.** 어떤 이유로든 결함이다.
 *
 * `total` 은 응답의 총계다(잘려서 온 페이지 길이가 아니다). 0 이면 그건 결함이 아니라
 * 빈 지역이므로 `false` — 그 경우의 안내는 `MapEmptyState` 가 따로 한다.
 */
export function isSilentlyEmptyMap(input: {
  total: number
  injection: MapInjection
}): boolean {
  return input.total > 0 && mapInjectionCount(input.injection) === 0
}
