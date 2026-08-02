/**
 * 상세 화면은 **식당이 바뀌면 깨끗한 화면**이어야 한다.
 *
 * ## 실측된 결함 (2026-07-31, 시뮬레이터 재현)
 *
 * `/restaurant/24`(장호덕손만두) 를 열어 둔 채 `sinsin://restaurant/51`(산원 반주헌) 로
 * 들어가면 expo-router 는 **같은 route 의 파라미터만 갈아** 준다. 새 화면을 쌓지 않으므로
 * 컴포넌트 인스턴스가 살아남고, react-query 키에는 id 가 들어 있어 데이터만 51번으로
 * 바뀐다. 화면에는 이렇게 나왔다:
 *
 * - 탭이 `후기` 에 그대로(새 가게는 `홈` 부터여야 한다)
 * - 히어로 사진 표시가 `3/3` 인데 첫 장이 떠 있다(`photoIndex` 가 남았다)
 * - 스크롤이 맨 위인데 헤더에 상호명이 이미 떠 있다(`showTitle` 이 남았다)
 * - 후기 탭의 메뉴·키워드 필터가 이전 가게의 것으로 남았다
 *
 * 즉 **산원 반주헌이 장호덕손만두의 상태를 입고** 열렸다. 사용자가 "상태 관리가 망가진 것
 * 같다" 고 한 화면이 이것이다.
 *
 * ## 이 테스트가 검사하는 것
 *
 * 1. 키 함수 자체의 성질 — 같은 id 면 같고, 다른 id 면 반드시 다르다.
 * 2. 화면이 실제로 그 키를 **마운트 키로 쓰고 있는가**. 함수만 맞고 배선이 빠지면
 *    결함은 그대로다. 컴포넌트 렌더 테스트 하네스가 이 저장소에 없으므로
 *    `recipeRouteCollision.test.ts` 와 같은 방식으로 소스를 읽어 배선을 확인한다.
 *
 * 왜 상태를 하나씩 초기화하는 방식을 검사하지 않나: 초기화 대상 목록은 화면이 커질 때마다
 * 손으로 늘려야 하고(후기 탭·사진 탭이 각자 상태를 갖는다), 하나라도 빠지면 같은 결함이
 * 조용히 돌아온다. 규칙을 "id 가 다르면 다른 화면" 한 줄로 두는 편이 유지된다.
 */

import fs from "fs"
import path from "path"

import { restaurantDetailInstanceKey } from "@/src/features/restaurant/utils/detailInstanceKey"

const SCREEN_PATH = path.join(
  __dirname,
  "..",
  "src",
  "features",
  "restaurant",
  "views",
  "RestaurantDetailScreen.tsx",
)

function screenSource(): string {
  return fs.readFileSync(SCREEN_PATH, "utf8")
}

describe("restaurantDetailInstanceKey", () => {
  it("같은 식당이면 같은 키다 — 리렌더로 화면이 초기화되면 안 된다", () => {
    expect(restaurantDetailInstanceKey(51)).toBe(
      restaurantDetailInstanceKey(51),
    )
  })

  it("다른 식당이면 반드시 다른 키다", () => {
    const ids = [24, 51, 868, 0, 1, 999999]
    const keys = ids.map(restaurantDetailInstanceKey)
    expect(new Set(keys).size).toBe(ids.length)
  })

  it("파싱 실패(null)도 자기 자리를 갖는다", () => {
    expect(restaurantDetailInstanceKey(null)).toBe(
      restaurantDetailInstanceKey(null),
    )
    expect(restaurantDetailInstanceKey(null)).not.toBe(
      restaurantDetailInstanceKey(0),
    )
  })
})

describe("RestaurantDetailScreen 배선", () => {
  it("본체를 인스턴스 키와 함께 마운트한다", () => {
    const source = screenSource()
    expect(source).toContain("restaurantDetailInstanceKey")
    // 키가 **JSX 의 key** 로 쓰여야 한다. 다른 곳에 쓰면 리마운트가 일어나지 않는다.
    expect(source).toMatch(
      /key=\{restaurantDetailInstanceKey\(\s*props\.restaurantId\s*\)\}/u,
    )
  })

  it("상태를 들고 있는 본체는 키를 받는 쪽에 있다", () => {
    const source = screenSource()
    // 공개 컴포넌트는 껍데기이므로 `useState` 를 갖지 않는다. 갖는 순간 그 상태는
    // id 가 바뀌어도 살아남아 다시 남의 상태를 입은 화면이 된다.
    const publicComponent = source.slice(
      source.indexOf("export function RestaurantDetailScreen("),
      source.indexOf("function RestaurantDetailBody("),
    )
    expect(publicComponent.length).toBeGreaterThan(0)
    expect(publicComponent).not.toContain("useState")
    expect(publicComponent).not.toContain("useRef")
  })
})
