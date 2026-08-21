/**
 * 다크 베이스맵 위 컨트롤의 공통 chrome 계약.
 *
 * 라이트 타일 시절엔 흰 면 + 그림자만으로 충분했다. 다크 타일 이후 지도와
 * background.default가 같은 L이 되어 검색·칩·FAB 경계가 사라졌다. 지도 위 요소는
 * 다크에서 lower 한 단 + line.alternative hairline을 공유해야 한다.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { mapOverlayChrome } from "@/src/features/restaurant/components/mapFloating"

const ROOT = join(__dirname, "..")

const dark = {
  mode: "dark" as const,
  background: { default: "#1f1f21", lower: "#313135" },
  line: { alternative: "#70737c38" },
}
const light = {
  mode: "light" as const,
  background: { default: "#ffffff", lower: "#f7f7f7" },
  line: { alternative: "#70737c14" },
}

describe("map overlay chrome", () => {
  it("다크 지도 위에서는 default가 아니라 lower 면을 쓴다", () => {
    expect(mapOverlayChrome(dark)).toEqual({
      backgroundColor: dark.background.lower,
      borderWidth: 1,
      borderColor: dark.line.alternative,
    })
  })

  it("라이트에서는 기존 흰 면을 유지한다", () => {
    expect(mapOverlayChrome(light).backgroundColor).toBe(
      light.background.default,
    )
  })

  it("검색·카테고리·FAB·재검색 pill이 같은 chrome을 소비한다", () => {
    const files = [
      "MapSearchBar.tsx",
      // 카테고리 칩은 2026-08-21 에 해석된 표면을 순수 함수로 내렸다. chrome 을 소비하는
      // 쪽이 컴포넌트가 아니라 이 파일이다(`restaurantCategoryChip.test.ts` 가 값으로 검사).
      "categoryChipSurface.ts",
      "MapFabStack.tsx",
      "MapRefreshPill.tsx",
    ]
    for (const file of files) {
      const source = readFileSync(
        join(ROOT, "src/features/restaurant/components", file),
        "utf-8",
      )
      expect(source).toContain("mapOverlayChrome")
      expect(source).toContain("chrome")
    }
  })

  it("지도 바텀시트 상단 라운드도 얕은 경계와 다크 그림자를 가진다", () => {
    const source = readFileSync(
      join(ROOT, "src/features/restaurant/components/RestaurantListSheet.tsx"),
      "utf-8",
    )
    expect(source).toContain("borderTopColor: colors.line.alternative")
    expect(source).toContain('mode === "dark" ? 0.34 : 0.1')
  })
})
