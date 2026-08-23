/**
 * **지도 탭의 "루트 상태"** — `식당` 탭을 다시 눌렀을 때 되돌릴 것이 남았는가.
 * 대상: `src/features/restaurant/sheetSnap.ts` 의 `isMapAtRootState`.
 *
 * 다른 네 탭의 루트는 "목록 맨 위" 지만 지도에는 그런 축이 없다. 카카오맵·네이버지도가
 * 하는 것과 같은 정의를 쓴다 — **내 위치 + 기본(접힘) 스냅**. 이 판정이 틀려도 화면은
 * 멀쩡해 보이고, 탭만 조용히 고장 난다(영원히 재중심만 하거나, 되돌릴 것이 있는데
 * 새로고침으로 건너뛰거나). 그래서 화면의 `if` 가 아니라 순수 함수로 둔다.
 */
import fs from "fs"
import path from "path"

import {
  isMapAtRootState,
  SHEET_SNAP,
} from "@/src/features/restaurant/sheetSnap"

const state = (over: Partial<Parameters<typeof isMapAtRootState>[0]> = {}) => ({
  sheetIndex: SHEET_SNAP.COLLAPSED,
  hasMyLocation: true,
  atMyLocation: true,
  ...over,
})

describe("시트 축", () => {
  it("접힘 + 내 위치면 루트다 — 그제서야 다시 받는다", () => {
    expect(isMapAtRootState(state())).toBe(true)
  })

  it("시트를 중간까지 올려 뒀으면 루트가 아니다", () => {
    expect(isMapAtRootState(state({ sheetIndex: SHEET_SNAP.MID }))).toBe(false)
  })

  it("시트를 전체로 올려 뒀으면 루트가 아니다", () => {
    expect(isMapAtRootState(state({ sheetIndex: SHEET_SNAP.EXPANDED }))).toBe(
      false,
    )
  })

  it("카메라가 내 위치에 있어도 시트가 올라가 있으면 되돌릴 것이 남았다", () => {
    expect(
      isMapAtRootState({
        sheetIndex: SHEET_SNAP.MID,
        hasMyLocation: true,
        atMyLocation: true,
      }),
    ).toBe(false)
  })
})

describe("카메라 축", () => {
  it("지도를 옮겨 뒀으면 루트가 아니다 — 접혀 있어도", () => {
    expect(isMapAtRootState(state({ atMyLocation: false }))).toBe(false)
  })

  it("**위치를 모르면 카메라 축은 없는 것으로 친다**", () => {
    /*
      권한을 거부했거나 커버리지 밖이면 되돌릴 좌표가 없다. 그 축을 그대로 두면
      그 사용자의 지도 탭은 재탭할 때마다 시트만 접고 **4번(다시 받기)에 영영 도달하지
      못한다** — 눌러도 아무 일이 없는 탭이 된다.
    */
    expect(
      isMapAtRootState({
        sheetIndex: SHEET_SNAP.COLLAPSED,
        hasMyLocation: false,
        atMyLocation: false,
      }),
    ).toBe(true)
  })

  it("위치를 몰라도 시트가 올라가 있으면 여전히 되돌릴 것이 있다", () => {
    expect(
      isMapAtRootState({
        sheetIndex: SHEET_SNAP.MID,
        hasMyLocation: false,
        atMyLocation: false,
      }),
    ).toBe(false)
  })
})

/* ══ 4번(복구)은 죽은 지도에서만 산다 — 2026-08-21 ═══════════════════════ */

/**
 * 이 화면은 렌더러 없이 부를 수 없다(지도 WebView·시트·쿼리 여섯 개가 붙어 있다).
 * 그래서 등록식 **그 자체**를 소스에서 읽어 못 박는다. 약한 검사인 것은 알지만,
 * 뒤집히면 안 되는 것이 조건식 한 줄이라 그 한 줄을 그대로 본다.
 */
const MAP_SCREEN = path.join(
  __dirname,
  "..",
  "src",
  "features",
  "restaurant",
  "views",
  "RestaurantMapScreen.tsx",
)

/** 주석은 뺀다 — 위 결정의 **이유**가 옛 코드를 인용하고 있다. */
const mapScreenSource = fs
  .readFileSync(MAP_SCREEN, "utf8")
  .replace(/\/\*[\s\S]*?\*\//gu, "")
  .replace(/^\s*\/\/.*$/gmu, "")
  .replace(/\s+/gu, " ")

describe("식당 탭의 4번", () => {
  it("지도가 죽었을 때만 등록된다 — 멀쩡하면 `undefined` 다", () => {
    /*
      예전에는 `mapError === null ? handleRetry : retryMap` 이었다. 멀쩡한 지도에서도
      재탭이 지도와 목록을 다시 받았고, 그것이 사용자가 신고한 "재탭했더니 새로고침"
      의 식당 판이다. 탭 탭은 이동 제스처다(`tabReset.ts` §4번).
    */
    const bound = /recover: ([^,]+),/u.exec(mapScreenSource)?.[1]
    expect(bound).toBe("mapError === null ? undefined : retryMap")
  })

  it("복구는 화면의 `다시 시도`(`retryMap`)와 **같은 일**이다", () => {
    // 지도가 죽으면 화면에 남는 것은 오류면뿐이라 두 경로가 같은 곳으로 가야 한다.
    expect(mapScreenSource).toMatch(/onRetry=\{retryMap\}/u)
  })

  it("`handleRetry` 는 사다리로 들어오지 않는다", () => {
    /*
      `handleRetry` 는 `enabled` 가드를 우회하는 `refetch()` 두 개다 — 뷰포트가
      확정되기 전에 눌리면 전국 조회와 `viewport not committed` 를 만든다
      (`tests/restaurantRetryGuard.test.ts`). 화면의 버튼에만 남긴다.
    */
    expect(mapScreenSource).not.toMatch(/recover: [^,]*handleRetry/u)
  })
})
