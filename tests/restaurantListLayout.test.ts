import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(__dirname, "..")
const RAIL = readFileSync(
  join(ROOT, "src/features/restaurant/components/CategoryChipRail.tsx"),
  "utf-8",
)
const FILTER_ROW = readFileSync(
  join(ROOT, "src/features/restaurant/components/FilterChipRow.tsx"),
  "utf-8",
)

describe("restaurant list horizontal rails", () => {
  it("카테고리 레일이 세로 flex 공간을 먹지 않는다", () => {
    expect(RAIL).toMatch(/rail:\s*\{[^}]*flexGrow:\s*0/u)
  })

  it("필터 레일도 같은 세로 축 가드를 유지한다", () => {
    expect(FILTER_ROW).toMatch(/rail:\s*\{[^}]*flexGrow:\s*0/u)
  })

  it("일반 결과 목록은 FlashList의 chat용 위치 유지를 끈다", () => {
    const screen = readFileSync(
      join(ROOT, "src/features/restaurant/views/RestaurantListScreen.tsx"),
      "utf-8",
    )
    expect(screen).toContain(
      "maintainVisibleContentPosition={{ disabled: true }}",
    )
  })
})
