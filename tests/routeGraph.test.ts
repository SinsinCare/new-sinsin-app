/**
 * 라우트 그래프가 **앱의 실제 화면 목록과 어긋나지 않는지** 검사한다.
 *
 * ## 왜 이 검사가 필요한가
 *
 * `src/shared/navigation/routeGraph.ts` 의 표는 "히스토리가 없을 때 이 화면에서 어디로
 * 나가는가" 를 화면마다 적어 둔 것이다. 표에 없는 화면은 런타임 안전망(구역 폴백)이
 * 받아 주긴 하지만, 그 값은 **누가 의도해서 고른 값이 아니다.**
 *
 * 그리고 표가 비는 것은 조용히 일어난다 — 새 화면을 `app/` 에 추가해도 tsc·eslint 는
 * 아무 말도 하지 않고, 그 화면은 딥링크로 들어왔을 때만 이상하게 나간다. 그 경로는
 * 사람이 손으로 재현하기 어려워서 리뷰에서 잡히지 않는다. 그래서 파일 트리를 직접
 * 훑어 대조한다.
 *
 * ## 라우트 키 규칙 (expo-router 의 `useSegments()` 와 같아야 한다)
 *
 *  - `(group)` 세그먼트는 **남는다**. URL 에서는 사라지지만 세그먼트에는 있다.
 *  - `[id]` 는 그 자리에 그대로 남는다.
 *  - **꼬리의 `index` 는 잘린다** (`global-state/routeInfo.js`). 그래서
 *    `app/recipe/[id]/index.tsx` 의 키는 `recipe/[id]` 이지 `recipe/[id]/index` 가 아니다.
 *  - `_layout`(껍데기)과 `+`(라우터 특수 파일)은 라우트가 아니다.
 *
 * 스캐너 자체는 `tests/helpers/appRouteKeys.ts` 에 있다 — 화면명 표(`events.ts`)도 같은
 * 키 규칙으로 검사받아야 하고, 규칙이 두 벌이면 한쪽만 헐거워진다.
 */
import {
  hasRouteParent,
  knownRouteKeys,
  resolveBackRoute,
} from "../src/shared/navigation/routeGraph"

import { collectRouteKeys } from "./helpers/appRouteKeys"

describe("route graph", () => {
  const fileKeys = collectRouteKeys()

  it("finds the app's routes at all (검사 자체가 비어 있지 않은지)", () => {
    expect(fileKeys.length).toBeGreaterThan(30)
  })

  it("has an entry for every screen in app/", () => {
    const missing = fileKeys.filter((key) => !hasRouteParent(key))
    expect(missing).toEqual([])
  })

  it("has no entry for a screen that no longer exists", () => {
    const files = new Set(fileKeys)
    const stale = knownRouteKeys().filter((key) => !files.has(key))
    expect(stale).toEqual([])
  })

  it("never sends a screen back to itself", () => {
    // 자기 자신으로 폴백하면 뒤로가기가 제자리를 반복한다 — 사용자 눈에는 먹통이다.
    const selfLoops = knownRouteKeys().filter((key) => {
      const parent = resolveBackRoute(key === "" ? [] : key.split("/"), {
        id: "1",
      })
      if (parent === null || typeof parent !== "string") return false
      // 표의 목적지는 URL(`/(tabs)/home`)이고 키는 세그먼트(`(tabs)/home`)다.
      return parent.replace(/^\//u, "") === key
    })
    expect(selfLoops).toEqual([])
  })

  it("resolves every screen to a route or to an explicit root", () => {
    for (const key of knownRouteKeys()) {
      const parent = resolveBackRoute(key === "" ? [] : key.split("/"), {
        id: "1",
      })
      expect(parent === null || typeof parent === "string").toBe(true)
      if (typeof parent === "string") expect(parent.startsWith("/")).toBe(true)
    }
  })

  it("keeps the id when it can restore a detail screen", () => {
    expect(
      resolveBackRoute(["restaurant", "[id]", "photos"], { id: "317" }),
    ).toBe("/restaurant/317")
    expect(resolveBackRoute(["(write)", "free", "[id]"], { id: "42" })).toBe(
      "/post/42",
    )
    expect(
      resolveBackRoute(["(write)", "recipe", "edit", "[id]"], { id: "7" }),
    ).toBe("/recipe/7")
  })

  it("falls back to the section root when the id is missing", () => {
    expect(resolveBackRoute(["restaurant", "[id]", "photos"], {})).toBe(
      "/(tabs)/restaurant",
    )
  })

  it("catches a screen that was added without a table entry", () => {
    // 표에 없는 키도 막다른 길이 되지는 않는다(구역 폴백). 안전망이 살아 있는지 본다.
    expect(resolveBackRoute(["restaurant", "brand-new-screen"])).toBe(
      "/(tabs)/restaurant",
    )
    expect(resolveBackRoute(["(settings)", "brand-new-screen"])).toBe(
      "/(tabs)/all",
    )
    expect(resolveBackRoute(["something-nobody-planned"])).toBe("/(tabs)/home")
  })

  it("treats the roots as roots", () => {
    // 이 넷에서 뒤로가기는 아무 일도 하지 않아야 한다.
    expect(resolveBackRoute(["(tabs)", "home"])).toBeNull()
    expect(resolveBackRoute(["(auth)", "login"])).toBeNull()
    expect(resolveBackRoute(["onboarding"])).toBeNull()
    expect(resolveBackRoute(["(settings)", "withdrawal-complete"])).toBeNull()
  })
})
