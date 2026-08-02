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
 */

import { useCallback, useEffect, useRef, useState } from "react"
import * as Location from "expo-location"

import type { LatLng, MyLocationState } from "../types"
import { FALLBACK_CENTER } from "../map/mapBridge"

export interface UseMyLocationResult extends MyLocationState {
  /**
   * 지도 중심으로 쓸 좌표. 권한이 없으면 폴백(강남역)이다.
   * **`coords` 와 구분해서 쓸 것** — 거리 계산·사용자 마커에는 `coords`(진짜 위치)만 쓴다.
   * 폴백을 사용자 위치처럼 쓰면 "여기서 2.6km" 가 거짓말이 된다.
   */
  center: LatLng
  /** `내 위치` FAB 에서 호출. 필요하면 권한을 요청하고 좌표를 갱신한다. */
  request: () => Promise<LatLng | null>
  /** 권한이 없어 `거리순` 정렬을 쓸 수 없다. */
  isDistanceSortDisabled: boolean
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

  return {
    ...state,
    center: state.coords ?? FALLBACK_CENTER,
    request,
    isDistanceSortDisabled: state.coords === null,
  }
}
