/**
 * 위치 권한 3상태 + 좌표. `BUILD_CONTRACT §3.5` 그대로.
 *
 * ## 첫 진입에서 한 번 묻는다 (2026-09-01 개정)
 *
 * 처음 설계는 진입 시 묻지 않고 `내 위치` FAB 에서만 물었다 — 맥락 없는 팝업은 거부로
 * 끝나기 쉽고 iOS 는 한 번 거부하면 다시 못 묻기 때문이다. 제품 결정으로 뒤집었다:
 * **지도는 켜자마자 내 위치여야 한다.** 그래서 `undetermined` 이면 진입 직후 시스템
 * 팝업을 한 번 띄운다. 그 뒤로는 시스템이 기억한다 — 허용이면 매번 조용히 좌표를
 * 채우고, 거부면 폴백(강남)으로 열며 다시 묻지 않는다(`내 위치` 를 눌렀을 때만
 * `request()` 가 한 번 더 시도한다). 안드로이드의 "이번만" 거부도 `undetermined` 로
 * 돌아오지 않으므로 진입 팝업은 설치당 한 번이다.
 *
 * ## `resolved` — 지도가 기다릴 신호
 *
 * 화면은 지도를 **위치가 정해진 뒤에** 띄운다(`initialCenter` 는 마운트 전용이라
 * 나중에 온 좌표로는 바꿀 수 없다 — 강남에서 떴다가 점프하는 것이 옛 증상). 권한
 * 거부·첫 좌표 도착·조회 실패 중 무엇이든 한 번 결론이 나면 `resolved` 가 참이 된다.
 * 화면은 여기에 상한 시간을 따로 건다(GPS 가 영영 안 오면 지도도 영영 안 뜬다).
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as Location from "expo-location"

import type {
  DistanceSortDisabledReason,
  LatLng,
  MyLocationState,
} from "../types"
import { isWithinKakaoCoverage } from "../utils/kakaoCoverage"

export interface UseMyLocationResult extends MyLocationState {
  /**
   * 커버리지 안의 진짜 위치만. **커버리지 밖(해외)은 `null` 이다**(파일 머리말) —
   * 거리 계산·사용자 마커·질의 기준점은 전부 이 값을 쓴다. 지도 중심이 필요한 화면은
   * `coords ?? FALLBACK_CENTER` 로 직접 접는다 — 폴백을 사용자 위치처럼 내주면
   * "여기서 2.6km" 가 거짓말이 되므로 이 훅은 폴백을 섞지 않는다.
   */
  coords: LatLng | null
  /**
   * `내 위치` FAB 에서 호출. 필요하면 권한을 요청하고 좌표를 갱신한다.
   * 반환값은 **커버리지를 거르지 않은 원시 좌표**다 — 호출부가 "서비스 지역 밖" 안내를
   * 띄울 근거이므로 여기서 접으면 버튼이 아무 반응 없는 것처럼 보인다.
   */
  request: () => Promise<LatLng | null>
  /** `거리순` 을 쓸 수 없는 이유. `null` 이면 쓸 수 있다. 문구 분기는 `FilterSheet`. */
  distanceSortDisabledReason: DistanceSortDisabledReason | null
  /** 진입 시 권한·첫 좌표의 결론이 났는가(파일 머리말 §resolved). */
  resolved: boolean
}

/* ───────────────────── 좌표 조회에 상한을 건다 ───────────────────── */

/**
 * 정확한 픽스를 기다리는 상한(ms). 콜드 GPS 는 1~3초, 실내·터널에서는 영영 안 온다.
 *
 * `getCurrentPositionAsync` 는 자체 타임아웃이 없다. 그대로 기다리면 (1) `request()` 가
 * `isRequesting` 을 영영 못 내려 `내 위치` FAB 이 세션 내내 비활성으로 남고(실측 결함),
 * (2) 진입 절차의 `resolved` 가 안 와서 화면의 상한 타이머만이 지도를 띄운다.
 * 10초는 "이 정도면 안 오는 것" 이라는 판정이지 정확도 튜닝값이 아니다.
 */
export const POSITION_FIX_TIMEOUT_MS = 10_000

/** 상한 폴백으로 받아들일 마지막 좌표의 최대 나이. 5분이면 걸어서 수백 m — 시작점으로 충분하다. */
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000

/** 상한 안에 답이 없을 때 던진다. 호출부는 이 타입일 때만 폴백으로 내려간다. */
export class PositionFixTimeoutError extends Error {
  constructor() {
    super("position fix timed out")
    this.name = "PositionFixTimeoutError"
  }
}

/** `promise` 가 `ms` 안에 끝나지 않으면 거부한다. 원래 약속은 취소할 수 없으므로 결과만 버린다. */
export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PositionFixTimeoutError()), ms)
  })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
}

/**
 * 정확한 픽스를 상한과 함께 기다린다. 넘기면 OS 가 들고 있는 마지막 좌표로 내려간다 —
 * `maxAge` 로 너무 낡은 것(다른 도시)은 거른다. 그것도 없으면 상한 오류를 그대로 올린다.
 */
async function currentPositionWithDeadline(): Promise<EntryPosition> {
  try {
    return await withDeadline(
      Location.getCurrentPositionAsync({}),
      POSITION_FIX_TIMEOUT_MS,
    )
  } catch (error) {
    if (!(error instanceof PositionFixTimeoutError)) throw error
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
    })
    if (lastKnown === null) throw error
    return lastKnown
  }
}

/* ───────────────────── 진입 시 결론 내리기 (순수 절차) ───────────────────── */

/** `expo-location` 응답 중 이 절차가 보는 것만. 테스트가 가짜를 넣기 쉽게 좁힌다. */
export interface EntryPermission {
  readonly status: "granted" | "denied" | "undetermined"
  readonly canAskAgain?: boolean
}
export interface EntryPosition {
  readonly coords: { readonly latitude: number; readonly longitude: number }
}
export interface EntryLocationPorts {
  getPermission(): Promise<EntryPermission>
  requestPermission(): Promise<EntryPermission>
  getLastKnown(): Promise<EntryPosition | null>
  getCurrent(): Promise<EntryPosition>
}
export interface EntryLocationSink {
  setState(updater: (prev: MyLocationState) => MyLocationState): void
  /** 결론이 났다 — 지도가 떠도 된다. 여러 번 불려도 된다. */
  settle(): void
  /** 언마운트·재실행으로 이 절차의 결과를 버려야 하는가. 매 단계 뒤에 본다. */
  isStale(): boolean
}

function granted(position: EntryPosition): MyLocationState {
  return {
    status: "granted",
    coords: { lat: position.coords.latitude, lng: position.coords.longitude },
    blockedForever: false,
    isRequesting: false,
  }
}

/**
 * 진입 절차. 훅의 이펙트가 그대로 부르고, 테스트는 가짜 포트로 돌린다 — 이 파일의
 * 제품 규칙("첫 진입에서 한 번 묻는다", "거부는 실패가 아니다")이 여기 한 곳에 있다.
 *
 * 1. 권한을 **조회**한다(팝업 없음).
 * 2. `undetermined` 면 **요청**한다(팝업 한 번).
 * 3. 허용이 아니면 결론 — `denied` 만 기록하고 끝난다.
 * 4. 허용이면 마지막 좌표를 먼저 깔고(즉시) 결론을 낸 뒤, 정확한 픽스로 덮어쓴다.
 * 5. 어느 단계에서 실패해도 결론은 난다 — 지도는 폴백으로 뜨면 된다.
 */
export async function settleLocationOnEntry(
  ports: EntryLocationPorts,
  sink: EntryLocationSink,
): Promise<void> {
  try {
    let permission = await ports.getPermission()
    if (sink.isStale()) return
    if (permission.status === "undetermined") {
      permission = await ports.requestPermission()
      if (sink.isStale()) return
    }
    if (permission.status !== "granted") {
      /*
        물었는데 거부했거나(방금), 예전에 거부해 둔 상태다. 둘 다 `denied` 다 —
        팝업을 봤으니 `undetermined` 로 남길 이유가 없다. 응답이 아직
        `undetermined` 인 드문 경우(시스템이 팝업을 못 띄움)만 그대로 둔다.
      */
      if (permission.status === "denied") {
        const blockedForever = permission.canAskAgain === false
        sink.setState((prev) => ({ ...prev, status: "denied", blockedForever }))
      }
      sink.settle()
      return
    }
    /*
      콜드 GPS 픽스는 1~3초 — 그동안 지도는 폴백(강남)으로 뜨고, 좌표가 늦게
      도착하면 카메라 점프 + **두 번째 검색**이 돈다(타일·질의 이중 지불).
      OS 가 들고 있는 마지막 좌표(`getLastKnownPositionAsync`)는 즉시 반환이라
      먼저 깔아 두고, 정확한 픽스가 오면 덮어쓴다. 낡은 좌표(이사·여행)여도
      카메라 시작점 용도라 해가 없고, 커버리지 판정은 좌표를 **소비하는 쪽**
      (useMyLocation 반환값을 받는 화면의 isWithinKakaoCoverage 접기)이 하므로
      여기서 어느 좌표를 주든 규칙이 그대로 통과한다.
    */
    const lastKnown = await ports.getLastKnown()
    if (sink.isStale()) return
    if (lastKnown !== null) {
      sink.setState(() => granted(lastKnown))
      // 시작점으로는 충분하다 — 지도는 여기서 뜨고, 정확한 픽스는 덮어쓴다.
      sink.settle()
    }
    const position = await ports.getCurrent()
    if (sink.isStale()) return
    sink.setState(() => granted(position))
    sink.settle()
  } catch {
    // 위치 조회 실패는 권한 문제와 다르다(GPS 꺼짐 등). 상태를 건드리지 않고
    // 폴백 중심으로 계속 동작한다 — 사용자에게 알릴 만한 일이 아니다.
    if (!sink.isStale()) sink.settle()
  }
}

export function useMyLocation(): UseMyLocationResult {
  const [state, setState] = useState<MyLocationState>({
    status: "undetermined",
    coords: null,
    blockedForever: false,
    isRequesting: false,
  })
  const [resolved, setResolved] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  /**
   * 진입 시: 이미 허용이면 조용히 좌표를 채우고, 아직 안 물었으면 **한 번 묻는다**
   * (파일 머리말). 절차 자체는 `settleLocationOnEntry` — 여기는 수명만 잇는다.
   */
  useEffect(() => {
    let cancelled = false
    void settleLocationOnEntry(
      {
        getPermission: () => Location.getForegroundPermissionsAsync(),
        requestPermission: () => Location.requestForegroundPermissionsAsync(),
        getLastKnown: () => Location.getLastKnownPositionAsync(),
        // 상한을 건다 — 픽스가 영영 안 오면 절차의 `catch` 가 결론을 내고, 마지막 좌표가
        // 이미 깔려 있으면 그 자리에서 지도가 뜬다(절차 4·5단계).
        getCurrent: currentPositionWithDeadline,
      },
      {
        setState,
        settle: () => setResolved(true),
        isStale: () => cancelled || !mounted.current,
      },
    )
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
      const position = await currentPositionWithDeadline()
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
      return null
    } finally {
      /* 어느 갈래로 나가든 `isRequesting` 은 반드시 내린다 — 이 플래그가 `내 위치` FAB 의
         `disabled` 라서, 한 번 걸리면 세션 내내 버튼이 죽는다. 위 갈래들이 이미 내렸으면
         같은 객체를 돌려줘 렌더를 만들지 않는다. */
      if (mounted.current) {
        setState((prev) =>
          prev.isRequesting ? { ...prev, isRequesting: false } : prev,
        )
      }
    }
  }, [])

  /* 커버리지 밖은 위치 없음으로 접는다(파일 머리말). `state.coords` 를 그대로 돌려주므로
     참조가 안정적이라 이 값을 이펙트 의존성으로 써도 렌더마다 다시 돌지 않는다. */
  const coordsInCoverage =
    state.coords && isWithinKakaoCoverage(state.coords.lat, state.coords.lng)
      ? state.coords
      : null

  /* 결과 객체도 안정적이어야 한다. 화면의 콜백들이 이 객체를 통째로 의존성에 두는데,
     렌더마다 새 리터럴이면 `handleMyLocation` 같은 콜백이 매번 새로 만들어져 지도
     WebView 의 `onMessage` 까지 갈아 끼운다. */
  return useMemo<UseMyLocationResult>(
    () => ({
      ...state,
      coords: coordsInCoverage,
      request,
      distanceSortDisabledReason:
        coordsInCoverage !== null
          ? null
          : state.coords !== null
            ? "OUTSIDE_COVERAGE"
            : "NO_LOCATION",
      resolved,
    }),
    [state, coordsInCoverage, request, resolved],
  )
}

/* ───────────────────── 화면이 기다릴 상한 ───────────────────── */

/**
 * 위치 결론(`resolved`)을 기다리는 상한(ms). 허용 상태의 마지막 좌표는 즉시 오고, 권한
 * 팝업은 사용자 손에 달렸으니 상한은 **팝업이 아니라 GPS** 를 위한 것이다 — 팝업이 떠
 * 있는 동안은 `resolved` 가 안 오지만 그때 화면이 뒤에서 폴백으로 떠도 해는 없다.
 */
export const LOCATION_GATE_TIMEOUT_MS = 2500

/**
 * "위치 결론이 났거나, 기다릴 만큼 기다렸다" — 지도를 띄우고 목록 질의를 여는 문.
 *
 * 한 번 열리면 닫히지 않는다. 지도의 `initialCenter` 는 마운트 전용이라 늦게 온 좌표로
 * 되돌릴 수 없고, 목록은 이미 나간 질의를 무를 수 없다. 두 화면(지도·목록)이 같은 문을
 * 쓰는 이유는 첫 질의를 **위치가 정해진 뒤 한 번만** 내보내기 위해서다 — 좌표 없이
 * 먼저 묻고 좌표가 오면 다시 묻는 이중 지불이 두 화면 모두의 옛 증상이었다.
 */
export function useLocationGate(
  resolved: boolean,
  timeoutMs: number = LOCATION_GATE_TIMEOUT_MS,
): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (open) return
    if (resolved) {
      setOpen(true)
      return
    }
    const timer = setTimeout(() => setOpen(true), timeoutMs)
    return () => clearTimeout(timer)
  }, [open, resolved, timeoutMs])
  return open
}
