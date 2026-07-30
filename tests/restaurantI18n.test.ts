import i18n from "../src/i18n"
import enCommon from "../src/i18n/locales/en/common.json"
import koCommon from "../src/i18n/locales/ko/common.json"
import { api } from "../src/services/core"
import { restaurantService } from "../src/services/data/restaurantService"
import restaurantsJson from "../src/features/restaurant/data/restaurantsData.json"
import type { RestaurantsData } from "../src/features/restaurant/data/restaurantDataTypes"
import {
  getCatalogAddress,
  getCatalogFeatureLabels,
  getCatalogMenuName,
  getCatalogRestaurantName,
  getLocalizedDescription,
} from "../src/features/restaurant/utils/restaurantLocalization"

jest.mock("../src/services/core", () => ({
  api: {
    get: jest.fn(),
  },
}))

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe("restaurant translations", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("keeps Korean and English restaurant keys in sync", () => {
    expect(leafKeys(enCommon.restaurant).sort()).toEqual(
      leafKeys(koCommon.restaurant).sort(),
    )
  })

  it("switches filters and restaurant report copy without restarting", async () => {
    await i18n.changeLanguage("en")
    expect(i18n.t("restaurant.filter.regions.gyeongnam")).toBe(
      "South Gyeongsang",
    )
    expect(i18n.t("restaurant.report.submit")).toBe("Send restaurant details")

    await i18n.changeLanguage("ko")
    expect(i18n.t("restaurant.filter.regions.gyeongnam")).toBe("경남")
    expect(i18n.t("restaurant.report.submit")).toBe("식당 정보 보내기")
  })

  it("sends canonical cuisine and nutrient filters to the backend", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({
      data: { result: [] },
    })

    await restaurantService.fetchNearby(
      37.5,
      127.0,
      3000,
      ["KOREAN", "JAPANESE"],
      ["LOW_SODIUM", "LOW_POTASSIUM"],
    )

    expect(api.get).toHaveBeenCalledWith("/restaurants/nearby", {
      params: {
        lat: 37.5,
        lng: 127.0,
        radius: 3000,
        cuisineTypes: "KOREAN,JAPANESE",
        nutritionTags: "LOW_SODIUM,LOW_POTASSIUM",
      },
    })
  })

  it("has English presentation copy for every bundled restaurant and menu", () => {
    const t = i18n.getFixedT("en", "common")
    const catalog = restaurantsJson as RestaurantsData

    for (const restaurant of catalog.restaurants) {
      const description = getLocalizedDescription(
        restaurant.description,
        t,
        "en",
      )
      const features = getCatalogFeatureLabels(restaurant.features, "en")
      expect(description).not.toBe(
        t("restaurant.detail.descriptionUnavailable"),
      )
      expect(features).toHaveLength(restaurant.features.length)

      const visibleCopy = [
        getCatalogRestaurantName(restaurant.id, restaurant.name, "en"),
        getCatalogAddress(restaurant.id, restaurant.address, "en"),
        description,
        ...features,
        ...restaurant.menus.map((menu) =>
          getCatalogMenuName(menu.id, menu.name, "en"),
        ),
      ].join(" ")

      expect(visibleCopy).not.toMatch(/[가-힣]/)
    }
  })
})
