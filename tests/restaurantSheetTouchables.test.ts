import { readFileSync } from "fs"
import { join } from "path"

/**
 * 식당 지도 시트 안의 눌리는 요소는 전부 react-native-gesture-handler 의 Pressable 이어야 한다.
 * RN 코어 Pressable(JS 리스폰더)은 gorhom 콘텐츠 팬(RNGH)과 중재되지 않아, 그 위에서 시작한
 * 세로 스와이프가 시트를 움직이지 못하거나 탭이 유령으로 남는다(2026-09-12 제보, 2026-08-17 규칙).
 */
const SHEET_TOUCHABLE_FILES = [
  "src/features/restaurant/components/SelectableChip.tsx",
  "src/features/restaurant/components/FilterChipRow.tsx",
  "src/features/restaurant/components/CategoryChipRail.tsx",
  "src/features/restaurant/components/MapResultsHeader.tsx",
  "src/features/restaurant/components/RestaurantCard.tsx",
  "src/features/restaurant/components/AddressBlock.tsx",
  "src/features/restaurant/components/MapEmptyState.tsx",
  "src/features/restaurant/components/MapUtilityFooter.tsx",
  "src/features/restaurant/components/RestaurantReportSection.tsx",
]

describe("restaurant sheet touchables live in the gesture-handler system", () => {
  it.each(SHEET_TOUCHABLE_FILES)("%s", (file) => {
    const src = readFileSync(join(__dirname, "..", file), "utf8")
    const rnImport =
      src.match(/import\s*\{([^}]*)\}\s*from\s*"react-native"/g) ?? []
    for (const line of rnImport) {
      expect(line).not.toMatch(
        /\bPressable\b|\bTouchableOpacity\b|\bTouchableWithoutFeedback\b/,
      )
    }
  })
  it("design-system button and list row used inside the sheet accept a gesture-handler touchable", () => {
    const button = readFileSync(
      join(__dirname, "../src/design-system-v2/components/V2Button.tsx"),
      "utf8",
    )
    const row = readFileSync(
      join(__dirname, "../src/design-system-v2/components/V2ListRow.tsx"),
      "utf8",
    )
    expect(button).toMatch(/from "react-native-gesture-handler"/)
    expect(row).toMatch(/from "react-native-gesture-handler"/)
  })
})
