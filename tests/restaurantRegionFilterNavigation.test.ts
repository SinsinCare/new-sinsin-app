import { regionFilterDestination } from "../src/features/restaurant/utils/regionFilterNavigation"
import { splitAiRegionKeys } from "../src/features/restaurant/hooks/useRestaurantFilters"
import { centerFor } from "../src/features/restaurant/data/regionCatalog"

describe("restaurant region filter navigation", () => {
  const seoul = { regionGroups: ["seoul-gangnam"], regionSidos: [] }

  test("moves an AI city selection out of the old map bounds just like manual selection", () => {
    const ai = splitAiRegionKeys(["busan-all"])
    const manual = { regionGroups: [], regionSidos: ["busan"] }
    expect(ai).toEqual(manual)
    expect(regionFilterDestination(seoul, ai)).toEqual(centerFor("busan"))
    expect(regionFilterDestination(seoul, ai)).toEqual(
      regionFilterDestination(seoul, manual),
    )
    expect(regionFilterDestination(seoul, ai)).not.toBeNull()
  })

  test("a district takes precedence over a broad city", () => {
    const next = { regionGroups: ["seoul-gangnam"], regionSidos: ["busan"] }
    expect(
      regionFilterDestination({ regionGroups: [], regionSidos: [] }, next),
    ).toEqual(centerFor("seoul-gangnam"))
  })

  test("reordering equivalent multi-selections never recenters a manually panned map", () => {
    expect(
      regionFilterDestination(
        {
          regionGroups: ["seoul-gangnam", "seoul-seocho"],
          regionSidos: ["busan", "seoul"],
        },
        {
          regionGroups: ["seoul-seocho", "seoul-gangnam", "seoul-gangnam"],
          regionSidos: ["seoul", "busan"],
        },
      ),
    ).toBeNull()
  })

  test("clearing regions and unknown AI keys do not invent a camera destination", () => {
    expect(
      regionFilterDestination(
        seoul,
        splitAiRegionKeys(["busan-typo-all", "unknown"]),
      ),
    ).toBeNull()
    expect(
      regionFilterDestination(seoul, { regionGroups: [], regionSidos: [] }),
    ).toBeNull()
  })
})
