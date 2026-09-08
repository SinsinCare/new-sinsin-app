import { restaurantCardDestination } from "../src/features/restaurant/utils/restaurantCardNavigation"

describe("restaurant card action destinations", () => {
  it.each(["map", "list", "bookmark"] as const)(
    "preserves %s as the detail source while opening the requested tab",
    (source) => {
      expect(restaurantCardDestination(42, source)).toEqual({
        pathname: "/restaurant/[id]",
        params: { id: 42, from: source },
      })
      expect(restaurantCardDestination(42, source, { type: "menu" })).toEqual({
        pathname: "/restaurant/[id]",
        params: { id: 42, from: source, tab: "menu" },
      })
    },
  )

  it("hands off the selected photo within the exact preview set, including URL query data", () => {
    const urls = [
      "https://example.test/a.jpg?size=large",
      "https://example.test/b.jpg?crop=2&width=400",
    ]
    const route = restaurantCardDestination(42, "map", {
      type: "photos",
      urls,
      index: 1,
    })
    expect(route.pathname).toBe("/restaurant/[id]/photos")
    if (!("photos" in route.params)) throw new Error("Missing photo handoff")
    expect(route.params.index).toBe(1)
    expect(JSON.parse(route.params.photos!)).toEqual(
      urls.map((url) => ({ url, category: "OWNER" })),
    )
  })

  it.each([-1, 30, Number.NaN, 0.5])(
    "keeps invalid photo index %s within the displayed set",
    (index) => {
      const route = restaurantCardDestination(42, "list", {
        type: "photos",
        urls: ["https://example.test/a.jpg"],
        index,
      })
      expect(route.params).toMatchObject({ index: 0 })
    },
  )

  it("falls back to detail when no photo exists", () => {
    expect(
      restaurantCardDestination(42, "bookmark", {
        type: "photos",
        urls: [],
        index: 0,
      }),
    ).toEqual(restaurantCardDestination(42, "bookmark"))
  })
})
