/**
 * **탭에서 뒤로가면 어디로 가는가.**
 *
 * 실측된 결함(2026-08-24): `인기글`(커뮤니티 안의 화면, `href: null`)에서 뒤로가면
 * 커뮤니티가 아니라 **앱 홈**으로 떨어졌다. `routeGraph` 에 부모가 커뮤니티라고
 * 적혀 있었지만 그 표는 읽히지도 않았다 — 표는 `useGoBack` 이 **히스토리가 없을
 * 때만** 보는데(딥링크·푸시 진입), 탭 라우터가 GO_BACK 을 먼저 처리해 버려
 * `canGoBack()` 이 항상 참이었기 때문이다.
 *
 * ■ 왜 라우터를 직접 돌려 보지 않나
 *
 * `@react-navigation/routers` 는 ESM 만 배포하고 이 저장소의 jest 는 node_modules 를
 * 변환하지 않는다(`jest.config.ts` 의 transform 은 tsx·svg 뿐). 그 벽을 넘으려고
 * 전역 transform 을 열면 249개 스위트의 로딩 비용이 같이 바뀐다 — 이 한 가지
 * 사실을 확인하자고 낼 값이 아니다.
 *
 * 그래서 **설치된 라이브러리의 소스**를 검사한다. 확인하는 것은 두 가지고, 둘 다
 * 업그레이드로 조용히 바뀔 수 있는 종류다:
 *   - 기본값이 여전히 `firstRoute` 인가 (= 이 수정이 여전히 필요한가)
 *   - `history` 갈래가 여전히 존재하는가 (= 이 수정이 여전히 유효한가)
 * 둘 중 하나라도 바뀌면 여기서 깨지고, 사람이 다시 읽게 된다.
 */
import fs from "node:fs"
import path from "node:path"

import { resolveBackRoute } from "@/src/shared/navigation/routeGraph"

const ROOT = path.join(__dirname, "..")
const LAYOUT = path.join(ROOT, "app", "(tabs)", "_layout.tsx")
const TAB_ROUTER = path.join(
  ROOT,
  "node_modules",
  "@react-navigation",
  "routers",
  "lib",
  "module",
  "TabRouter.js",
)

describe("탭 뒤로가기", () => {
  test("레이아웃이 backBehavior='history' 를 넘긴다", () => {
    expect(fs.readFileSync(LAYOUT, "utf8")).toMatch(/backBehavior="history"/u)
  })

  test("라이브러리 기본값은 여전히 firstRoute 다 (= 고칠 이유가 남아 있다)", () => {
    const source = fs.readFileSync(TAB_ROUTER, "utf8")
    expect(source).toMatch(/backBehavior\s*=\s*'firstRoute'/u)
  })

  test("라이브러리에 history 갈래가 여전히 있다 (= 고친 방법이 유효하다)", () => {
    const source = fs.readFileSync(TAB_ROUTER, "utf8")
    expect(source).toMatch(/'history'/u)
  })

  /*
    두 기구가 같은 답을 말해야 한다. 히스토리가 있으면 탭 라우터가, 없으면(딥링크·
    푸시) 이 표가 목적지를 정한다 — 둘이 다르면 같은 버튼이 진입 경로에 따라 다른
    곳으로 간다.
  */
  test("폴백 표도 인기글의 부모를 커뮤니티로 본다", () => {
    expect(resolveBackRoute(["(tabs)", "community-popular"])).toBe(
      "/(tabs)/community",
    )
  })
})
