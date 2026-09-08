/**
 * 화면명 표가 **앱의 실제 라우트 목록과 어긋나지 않는지** 검사한다.
 *
 * ## 왜 이 검사가 이 작업의 핵심 산출물인가
 *
 * `getAnalyticsScreenName` 은 표에 없는 라우트를 `other` 로 보낸다. 그 사고는 **완전히
 * 조용하다** — tsc·eslint 는 아무 말도 하지 않고, 앱도 정상 동작하며, 몇 주 뒤 대시보드에서
 * "그 화면 숫자가 왜 없지" 로 발견된다. 그리고 그때는 이미 늦다: 행에 남는 것은
 * `screen_name` 문자열 하나뿐이라 **소급 분해가 불가능하다**(라우트 경로는 어디에도
 * 저장되지 않는다).
 *
 * 종전 구현은 그룹 폴백(`(settings)` → `profile`)으로 이 구멍을 덮었는데, 그건 더 나쁘다 —
 * 새 화면이 `other` 가 아니라 **틀린 이름**으로 들어가 다른 화면의 숫자를 오염시킨다.
 * 폴백을 없앤 대신 CI 가 이름을 요구한다.
 */
import fs from "fs"
import path from "path"

import {
  getAnalyticsScreenName,
  knownAnalyticsRouteKeys,
} from "@/src/features/analytics/events"

import { APP_DIR, collectRouteKeys } from "./helpers/appRouteKeys"

/** 라우트 키를 `useSegments()` 모양으로. 루트(`""`)는 빈 배열이다. */
function toSegments(key: string): string[] {
  return key === "" ? [] : key.split("/")
}

describe("analytics screen table", () => {
  const fileKeys = collectRouteKeys()

  it("finds the app's routes at all (검사 자체가 비어 있지 않은지)", () => {
    expect(fileKeys.length).toBeGreaterThan(30)
  })

  it("names every screen in app/ (새 화면이 other 로 떨어지는 것을 막는다)", () => {
    // **키 자체가 표에 있는지**를 본다. 결과가 `other` 인지만 보면 부족하다 —
    // `app/restaurant/nearby.tsx` 같은 새 정적 라우트는 `[id]` 정규화에 걸려
    // `restaurant_detail` 이라는 **그럴듯한 틀린 이름**을 받아 검사를 통과해 버린다.
    const table = new Set(knownAnalyticsRouteKeys())
    const missing = fileKeys.filter((key) => !table.has(key))
    expect(missing).toEqual([])

    const unnamed = fileKeys.filter(
      (key) => getAnalyticsScreenName(toSegments(key)) === "other",
    )
    expect(unnamed).toEqual([])
  })

  it("has no entry for a route that no longer exists", () => {
    const files = new Set(fileKeys)
    // `+not-found` 는 라우터 특수 파일이라 스캐너가 라우트로 세지 않는다. 그래도
    // 세그먼트로는 들어오므로 표에는 있어야 한다 — 파일 존재로 따로 확인한다.
    const stale = knownAnalyticsRouteKeys().filter(
      (key) => !files.has(key) && !key.startsWith("+"),
    )
    expect(stale).toEqual([])
    expect(fs.existsSync(path.join(APP_DIR, "+not-found.tsx"))).toBe(true)
  })

  it("gives the journey that used to be invisible three distinct names", () => {
    // `useAnalyticsLifecycle` 은 이름이 같으면 발화를 건너뛴다. 종전에는 이 셋이 전부
    // `profile` 이라 연달아 이동해도 screen_viewed 가 0건이었다.
    const journey = [
      ["(tabs)", "all"],
      ["(settings)", "checkup-list"],
      ["(settings)", "checkup-auth"],
      ["(settings)", "doctor-search"],
    ].map((segments) => getAnalyticsScreenName(segments))

    expect(journey).toEqual([
      "my_page",
      "checkup_list",
      "checkup_auth",
      "doctor_search",
    ])
    expect(new Set(journey).size).toBe(journey.length)
  })

  it("does not fall back per group (표에 없으면 other 다)", () => {
    // 그룹 폴백이 살아 있으면 이것들이 signup·profile·restaurant_map 으로 들어간다.
    expect(getAnalyticsScreenName(["(auth)", "brand-new-screen"])).toBe("other")
    expect(getAnalyticsScreenName(["(settings)", "brand-new-screen"])).toBe(
      "other",
    )
    expect(
      getAnalyticsScreenName(["restaurant", "brand-new-screen", "detail"]),
    ).toBe("other")
    expect(getAnalyticsScreenName(["something-nobody-planned"])).toBe("other")
    // 단, 한 칸짜리 미등록 라우트는 `[id]` 정규화가 상세로 흡수한다(expo-router 도
    // `/restaurant/nearby` 를 `restaurant/[id]` 로 라우팅한다). 그래서 새 정적 라우트의
    // 방어선은 이 테스트가 아니라 위의 **키 존재 검사**다.
    expect(getAnalyticsScreenName(["restaurant", "brand-new-screen"])).toBe(
      "restaurant_detail",
    )
  })

  it("keeps every screen name a short lower_snake token", () => {
    const names = knownAnalyticsRouteKeys().map((key) =>
      getAnalyticsScreenName(toSegments(key)),
    )
    for (const name of names) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/u)
      expect(name.length).toBeLessThanOrEqual(40)
    }
  })

  it("retires the tokens whose meaning changed", () => {
    // 뜻이 좁아지는 이름을 재사용하면 배포일에 숫자가 조용히 절반이 된다. 옛 이름이
    // 0으로 수렴하는 편이 눈에 보인다 — 그래서 이 여섯은 표에 없어야 한다.
    const retired = new Set([
      "profile",
      "health",
      "signup",
      "notifications",
      "community_write",
      "restaurant",
    ])
    const reused = knownAnalyticsRouteKeys()
      .map((key) => getAnalyticsScreenName(toSegments(key)))
      .filter((name) => retired.has(name))
    expect(reused).toEqual([])
  })

  it("collapses only the six leaf groups the design allows", () => {
    // 라우트(+ `+not-found`) → 이름. 접은 자리가 늘면 여기서 걸린다.
    // 99 = 92 + 약 등록 플로우 7(추가 방법·검색·사진·촬영·후보·설정·관리, 2026-09-08 — 전부 1:1 이름).
    // 92 = 91 + 약 복용 독립 페이지.
    // 91 = 89 + 혈당·붓기 독립 페이지.
    // 89 = 86 + 기록 페이지 셋(물·혈압·체중, 2026-09-05 — 셋 다 1:1 이름).
    // 86 = 84 + 식단 리포트 페이지(`meal-report`) + 푸드 카메라(`food-camera`)
    // (2026-09-04, 둘 다 1:1 이름). 84 = 83 + 구독 관리. 페이월은 시트라 라우트가 아니다.
    const names = new Set(
      knownAnalyticsRouteKeys().map((key) =>
        getAnalyticsScreenName(toSegments(key)),
      ),
    )
    expect(knownAnalyticsRouteKeys()).toHaveLength(99)
    expect(names.size).toBe(90)

    // 탈퇴 3화면은 그 자체가 퍼널이라 접지 않는다.
    expect(getAnalyticsScreenName(["(settings)", "withdrawal"])).toBe(
      "withdrawal",
    )
    expect(getAnalyticsScreenName(["(settings)", "withdrawal-terms"])).toBe(
      "withdrawal_terms",
    )
    expect(getAnalyticsScreenName(["(settings)", "withdrawal-complete"])).toBe(
      "withdrawal_complete",
    )
  })

  it("names the modal routes too (경계는 라우트 유무 하나다)", () => {
    expect(getAnalyticsScreenName(["restaurant", "[id]", "photos"])).toBe(
      "restaurant_photos",
    )
    expect(getAnalyticsScreenName(["restaurant", "[id]", "review"])).toBe(
      "restaurant_review_write",
    )
  })
})
