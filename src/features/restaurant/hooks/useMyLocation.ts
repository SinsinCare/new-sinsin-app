/**
 * 위치 권한 3상태 + 좌표. `BUILD_CONTRACT §3.5` 그대로.
 *
 * ## 진입 시 권한을 묻지 않는다
 *
 * 지도를 열자마자 시스템 권한 팝업을 띄우면 사용자는 앱이 뭘 하려는지 모른 채 거부를
 * 누른다. 그리고 iOS 는 한 번 거부하면 다시 못 묻는다 — 그 한 번이 영구 손실이다.
 * 그래서 `undetermined` 에서는 **아무 것도 하지 않고**, `내 위치` FAB 를 눌렀을 때만
 * `request()` 를 부른다. 그 시점에는 사용자가 무엇을 원하는지 스스로 말한 것이다.
 *
 * ## 거부는 실패가 아니다
 *
 * 거부 상태에서도 지도는 그대로 동작한다 — 폴백 중심(강남역)으로 열고, 거리 줄을 감추고,
 * `거리순` 정렬만 비활성한다. 시드 데이터가 강남 한 블록뿐이어서 폴백을 서울시청으로 두면
 * 첫 화면이 항상 0건이 된다(`FALLBACK_CENTER` 주석 참고).
 *
 * ## `canAskAgain` 을 구분한다
 *
 * `denied` 안에도 두 가지가 있다: 다시 물어볼 수 있는 거부와 시스템 설정에서만 풀 수 있는
 * 영구 거부. 후자에게 `허용하기` 버튼을 주면 눌러도 아무 일이 없어 앱이 고장 난 것처럼
 * 보인다. 그때는 `설정 열기` 를 띄운다.
 *
 * ## 커버리지 밖 좌표는 위치 없음이다
 *
 * 카카오 커버리지 밖(해외 — iOS 시뮬레이터 기본 모의 위치가 미국이라 즉시 재현된다)의
 * 좌표를 그대로 내보내면, 서버는 국내 식당까지의 거리를 성실히 계산해 카드에
 * `21885.5km` 가 찍히고(실측 2026-08-06) 거리순은 무의미한 순서가 된다. 그래서 이 훅은
 * 커버리지 밖 좌표를 **밖으로 내보내지 않는다** — `coords` 가 `null` 로 접혀 질의·정렬·
 * 거리 줄·마커·카메라 전부가 위치 없음과 동일하게 동작한다. 원시 좌표가 필요한 유일한
 * 소비자(`내 위치` 버튼의 "서비스 지역 밖" 토스트)는 `request()` 의 반환값을 쓴다 —
 * 그쪽은 사용자가 방금 누른 행동이라 이유를 말할 수 있다(조용한 폴백 금지).
 */

import { useCallback, useEffect, useRef, useState } from "react"
import * as Location from "expo-location"

import type {
  DistanceSortDisabledReason,
  LatLng,
  MyLocationState,
} from "../types"
import { FALLBACK_CENTER } from "../map/mapBridge"
import { isWithinKakaoCoverage } from "../utils/kakaoCoverage"

export interface UseMyLocationResult extends MyLocationState {
  /**
   * 커버리지 안의 진짜 위치만. **커버리지 밖(해외)은 `null` 이다**(파일 머리말) —
   * 거리 계산·사용자 마커·질의 기준점은 전부 이 값을 쓴다.
   */
  coords: LatLng | null
  /**
   * 지도 중심으로 쓸 좌표. 권한이 없으면 폴백(강남역)이다.
   * **`coords` 와 구분해서 쓸 것** — 거리 계산·사용자 마커에는 `coords`(진짜 위치)만 쓴다.
   * 폴백을 사용자 위치처럼 쓰면 "여기서 2.6km" 가 거짓말이 된다.
   */
  center: LatLng
  /**
   * `내 위치` FAB 에서 호출. 필요하면 권한을 요청하고 좌표를 갱신한다.
   * 반환값은 **커버리지를 거르지 않은 원시 좌표**다 — 호출부가 "서비스 지역 밖" 안내를
   * 띄울 근거이므로 여기서 접으면 버튼이 아무 반응 없는 것처럼 보인다.
   */
  request: () => Promise<LatLng | null>
  /** `거리순` 을 쓸 수 없는 이유. `null` 이면 쓸 수 있다. 문구 분기는 `SortSheet`. */
  distanceSortDisabledReason: DistanceSortDisabledReason | null
}

export function useMyLocation(): UseMyLocationResult {
  const [state, setState] = useState<MyLocationState>({
    status: "undetermined",
    coords: null,
    blockedForever: false,
    isRequesting: false,
  })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  /**
   * 이미 허용된 상태라면 묻지 않고 조용히 좌표를 채운다. `getForegroundPermissionsAsync`
   * 는 **요청이 아니라 조회**라서 팝업이 뜨지 않는다 — 진입 시 호출해도 안전한 유일한 API 다.
   */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync()
        if (cancelled || !mounted.current) return
        if (permission.status !== "granted") {
          // `undetermined` 를 `denied` 로 승격하지 않는다. 아직 아무 것도 묻지 않았다.
          if (permission.status === "denied") {
            setState((prev) => ({
              ...prev,
              status: "denied",
              blockedForever: permission.canAskAgain === false,
            }))
          }
          return
        }
        const position = await Location.getCurrentPositionAsync({})
        if (cancelled || !mounted.current) return
        setState({
          status: "granted",
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          blockedForever: false,
          isRequesting: false,
        })
      } catch {
        // 위치 조회 실패는 권한 문제와 다르다(GPS 꺼짐 등). 상태를 건드리지 않고
        // 폴백 중심으로 계속 동작한다 — 사용자에게 알릴 만한 일이 아니다.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const request = useCallback(async (): Promise<LatLng | null> => {
    setState((prev) => ({ ...prev, isRequesting: true }))
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== "granted") {
        if (mounted.current) {
          setState({
            status: "denied",
            coords: null,
            blockedForever: permission.canAskAgain === false,
            isRequesting: false,
          })
        }
        return null
      }
      const position = await Location.getCurrentPositionAsync({})
      const coords: LatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      if (mounted.current) {
        setState({
          status: "granted",
          coords,
          blockedForever: false,
          isRequesting: false,
        })
      }
      return coords
    } catch {
      if (mounted.current) {
        setState((prev) => ({ ...prev, isRequesting: false }))
      }
      return null
    }
  }, [])

  /* 커버리지 밖은 위치 없음으로 접는다(파일 머리말). `state.coords` 를 그대로 돌려주므로
     참조가 안정적이라 이 값을 이펙트 의존성으로 써도 렌더마다 다시 돌지 않는다. */
  const coordsInCoverage =
    state.coords && isWithinKakaoCoverage(state.coords.lat, state.coords.lng)
      ? state.coords
      : null

  return {
    ...state,
    coords: coordsInCoverage,
    center: coordsInCoverage ?? FALLBACK_CENTER,
    request,
    distanceSortDisabledReason:
      coordsInCoverage !== null
        ? null
        : state.coords !== null
          ? "OUTSIDE_COVERAGE"
          : "NO_LOCATION",
  }
}
