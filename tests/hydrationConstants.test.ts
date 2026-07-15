import {
  QUICK_ADD_LABELS,
  QUICK_ADD_OPTIONS,
} from "../src/features/home/data/hydrationConstants"

describe("hydration quick add options", () => {
  it("labels the 200ml option as one cup without changing its stored amount", () => {
    expect(QUICK_ADD_OPTIONS).toContain(200)
    expect(QUICK_ADD_LABELS[200]).toBe("1컵(200ml)")
  })
})
