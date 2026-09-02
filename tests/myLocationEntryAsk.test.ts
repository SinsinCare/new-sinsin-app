/**
 * 지도 진입 시 위치 절차 (`settleLocationOnEntry`).
 *
 * 제품 결정(2026-09-01): 첫 진입이면 권한을 **한 번 묻고**, 허용이면 지도가 처음부터
 * 내 위치로 뜨게 좌표를 먼저 채운 뒤 결론(`settle`)을 내며, 거부면 다시 묻지 않고
 * 폴백으로 결론 낸다.
 */
/* eslint-disable import/first -- jest.mock 은 호이스팅되므로 import 보다 위에 적는다. */
// `useMyLocation.ts` 가 `expo-location`(ESM·네이티브)을 들여온다. 여기서 검증하는 절차는
// 포트를 주입받으므로 실제 모듈은 필요 없다 — 로드만 막는다.
jest.mock("expo-location", () => ({}))

import {
  settleLocationOnEntry,
  type EntryLocationPorts,
  type EntryLocationSink,
  type EntryPermission,
} from "../src/features/restaurant/hooks/useMyLocation"
import type { MyLocationState } from "../src/features/restaurant/types"

const SEOUL = { coords: { latitude: 37.5665, longitude: 126.978 } }
const SEOUL_PRECISE = { coords: { latitude: 37.5651, longitude: 126.9895 } }

function sink() {
  let state: MyLocationState = {
    status: "undetermined",
    coords: null,
    blockedForever: false,
    isRequesting: false,
  }
  let settled = 0
  let stale = false
  const api: EntryLocationSink = {
    setState: (updater) => {
      state = updater(state)
    },
    settle: () => {
      settled += 1
    },
    isStale: () => stale,
  }
  return {
    api,
    state: () => state,
    settled: () => settled,
    markStale: () => {
      stale = true
    },
  }
}

type Ports = EntryLocationPorts & {
  requestPermission: jest.Mock<Promise<EntryPermission>, []>
}

function ports(overrides: Partial<EntryLocationPorts> = {}): Ports {
  const base: Ports = {
    getPermission: async () => ({ status: "granted" }),
    requestPermission: jest.fn<Promise<EntryPermission>, []>(async () => ({
      status: "granted",
    })),
    getLastKnown: async () => SEOUL,
    getCurrent: async () => SEOUL_PRECISE,
  }
  return { ...base, ...overrides } as Ports
}

describe("지도 진입 시 위치 절차", () => {
  test("첫 진입(undetermined)이면 권한을 한 번 묻고, 허용이면 좌표를 채운 뒤 결론 낸다", async () => {
    const s = sink()
    const p = ports({ getPermission: async () => ({ status: "undetermined" }) })
    await settleLocationOnEntry(p, s.api)

    expect(p.requestPermission).toHaveBeenCalledTimes(1)
    expect(s.state().status).toBe("granted")
    // 마지막 좌표로 먼저 결론(지도가 뜬다) → 정확한 픽스로 덮어쓴 뒤 다시 결론.
    expect(s.state().coords).toEqual({ lat: 37.5651, lng: 126.9895 })
    expect(s.settled()).toBe(2)
  })

  test("이미 허용이면 묻지 않고 조용히 좌표를 채운다", async () => {
    const s = sink()
    const p = ports({})
    await settleLocationOnEntry(p, s.api)
    expect(p.requestPermission).not.toHaveBeenCalled()
    expect(s.state().status).toBe("granted")
    expect(s.settled()).toBeGreaterThan(0)
  })

  test("물었는데 거부하면 denied 로 기록하고 좌표 없이 결론 낸다 — 다시 묻지 않는다", async () => {
    const s = sink()
    const p = ports({
      getPermission: async () => ({ status: "undetermined" }),
      requestPermission: jest.fn<Promise<EntryPermission>, []>(async () => ({
        status: "denied",
        canAskAgain: false,
      })),
    })
    await settleLocationOnEntry(p, s.api)
    expect(p.requestPermission).toHaveBeenCalledTimes(1)
    expect(s.state()).toMatchObject({
      status: "denied",
      coords: null,
      blockedForever: true,
    })
    expect(s.settled()).toBe(1)
  })

  test("예전에 거부해 둔 상태면 팝업 없이 denied 로 결론 낸다", async () => {
    const s = sink()
    const p = ports({
      getPermission: async () => ({ status: "denied", canAskAgain: true }),
    })
    await settleLocationOnEntry(p, s.api)
    expect(p.requestPermission).not.toHaveBeenCalled()
    expect(s.state()).toMatchObject({ status: "denied", blockedForever: false })
    expect(s.settled()).toBe(1)
  })

  test("마지막 좌표가 없어도 정확한 픽스가 오면 결론 낸다", async () => {
    const s = sink()
    const p = ports({ getLastKnown: async () => null })
    await settleLocationOnEntry(p, s.api)
    expect(s.state().coords).toEqual({ lat: 37.5651, lng: 126.9895 })
    expect(s.settled()).toBe(1)
  })

  test("좌표 조회가 실패해도 결론은 난다 — 지도가 영영 안 뜨면 안 된다", async () => {
    const s = sink()
    const p = ports({
      getLastKnown: async () => {
        throw new Error("gps off")
      },
    })
    await settleLocationOnEntry(p, s.api)
    expect(s.state().coords).toBeNull()
    expect(s.settled()).toBe(1)
  })

  test("언마운트되면 어떤 결론도 쓰지 않는다", async () => {
    const s = sink()
    let release: () => void = () => {}
    const p = ports({
      getPermission: () =>
        new Promise((resolve) => {
          release = () => resolve({ status: "granted" })
        }),
    })
    const run = settleLocationOnEntry(p, s.api)
    s.markStale()
    release()
    await run
    expect(s.state().status).toBe("undetermined")
    expect(s.settled()).toBe(0)
  })
})
