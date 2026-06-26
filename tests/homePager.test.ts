import {
  getCommittedHomePagerValue,
  getReleasedHomePagerTab,
} from "../src/features/home/utils/homePager"

describe("home pager gesture settling", () => {
  it("maps the committed tab to the only allowed pager values", () => {
    expect(getCommittedHomePagerValue("record")).toBe(0)
    expect(getCommittedHomePagerValue("stats")).toBe(1)
  })

  it("returns to the committed tab when a release does not cross the threshold", () => {
    expect(
      getReleasedHomePagerTab({
        current: "record",
        dx: -40,
        vx: -0.1,
        width: 390,
      }),
    ).toBe("record")
    expect(
      getReleasedHomePagerTab({
        current: "stats",
        dx: 40,
        vx: 0.1,
        width: 390,
      }),
    ).toBe("stats")
  })

  it("moves to the adjacent tab when distance or velocity crosses the threshold", () => {
    expect(
      getReleasedHomePagerTab({
        current: "record",
        dx: -120,
        vx: -0.1,
        width: 390,
      }),
    ).toBe("stats")
    expect(
      getReleasedHomePagerTab({
        current: "record",
        dx: -20,
        vx: -0.6,
        width: 390,
      }),
    ).toBe("stats")
    expect(
      getReleasedHomePagerTab({
        current: "stats",
        dx: 120,
        vx: 0.1,
        width: 390,
      }),
    ).toBe("record")
    expect(
      getReleasedHomePagerTab({
        current: "stats",
        dx: 20,
        vx: 0.6,
        width: 390,
      }),
    ).toBe("record")
  })
})
