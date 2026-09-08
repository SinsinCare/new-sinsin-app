import { api } from "../src/services/core"
import { restaurantService } from "../src/services/data/restaurantService"
import fixture from "./fixtures/restaurant/map.marker.json"

jest.mock("../src/services/core", () => ({ api: { get: jest.fn() } }))

it("requests actual places at both close and wide zooms without changing viewport or filters", async () => {
  const bounds = { swLat: 37.49, swLng: 127.02, neLat: 37.51, neLng: 127.04 }
  for (const zoom of [2, 5, 9]) {
    ;(api.get as jest.Mock).mockResolvedValue({
      data: { result: { ...fixture, zoom } },
    })
    const result = await restaurantService.fetchMap({
      ...bounds,
      zoom,
      cuisineTypes: ["KOREAN"],
      sort: "RATING",
    })
    expect(api.get).toHaveBeenLastCalledWith(
      "/restaurants/map",
      expect.objectContaining({
        params: expect.objectContaining({
          ...bounds,
          zoom,
          display: "places",
          cuisineTypes: "KOREAN",
          sort: "RATING",
        }),
      }),
    )
    expect(result.markers).toEqual(fixture.markers)
  }
})
