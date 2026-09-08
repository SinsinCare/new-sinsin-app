import {
  MEAL_LIST_COLLAPSED_COUNT,
  visibleMealEntries,
} from "../src/features/home/components/record/mealRecordListVisible"

describe("홈 식단 목록 — 세 줄까지, 넘치면 더 보기", () => {
  const four = ["a", "b", "c", "d"]

  it("접힌 상태에서는 앞의 세 줄만 보이고 토글이 붙는다", () => {
    expect(MEAL_LIST_COLLAPSED_COUNT).toBe(3)
    const { visible, canToggle } = visibleMealEntries(four, false)
    expect(visible).toEqual(["a", "b", "c"])
    expect(canToggle).toBe(true)
  })

  it("펼치면 전부 보이고, 접으면 다시 세 줄이다", () => {
    expect(visibleMealEntries(four, true).visible).toEqual(four)
    expect(visibleMealEntries(four, false).visible).toHaveLength(3)
  })

  it("세 줄 이하면 토글이 없고 그대로 다 보인다", () => {
    for (const n of [0, 1, 2, 3]) {
      const entries = four.slice(0, n)
      const { visible, canToggle } = visibleMealEntries(entries, false)
      expect(visible).toEqual(entries)
      expect(canToggle).toBe(false)
      // 펼침 상태가 남아 있어도 결과는 같다 — 상태와 무관하게 안전하다.
      expect(visibleMealEntries(entries, true).visible).toEqual(entries)
    }
  })

  it("입력 배열을 바꾸지 않는다", () => {
    const copy = [...four]
    visibleMealEntries(four, false)
    visibleMealEntries(four, true)
    expect(four).toEqual(copy)
  })
})
