import type { CurationSectionData, PlaceRestaurant } from "../types"
import type { RestaurantDataItem } from "./restaurantDataTypes"
import restaurantsJson from "./restaurantsData.json"
import type { TFunction } from "i18next"
import type { Language } from "@/src/i18n"
import {
  getCatalogAddress,
  getCatalogCuisineLabel,
  getCatalogRestaurantName,
} from "../utils/restaurantLocalization"

const PLACEHOLDER_IMAGE = require("@/assets/images/SIn_2.png")

// Restaurant images (existing curated photos)
const CHOROK_GIMBAP = [
  require("@/assets/images/restaurant/chorok-gimbap-1.jpg"),
  require("@/assets/images/restaurant/chorok-gimbap-2.jpg"),
  require("@/assets/images/restaurant/chorok-gimbap-3.jpg"),
  require("@/assets/images/restaurant/chorok-gimbap-4.jpg"),
]
const SONGHWA = [
  require("@/assets/images/restaurant/songhwa-1.jpg"),
  require("@/assets/images/restaurant/songhwa-2.jpg"),
  require("@/assets/images/restaurant/songhwa-3.jpg"),
  require("@/assets/images/restaurant/songhwa-4.jpg"),
]
const MASHITJEOYEOM = [
  require("@/assets/images/restaurant/mashitjeoyeom-1.jpg"),
  require("@/assets/images/restaurant/mashitjeoyeom-2.jpg"),
  require("@/assets/images/restaurant/mashitjeoyeom-3.jpg"),
  require("@/assets/images/restaurant/mashitjeoyeom-4.jpg"),
]
const SONYEO_BANGATGAN = [
  require("@/assets/images/restaurant/sonyeo-bangatgan-1.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-2.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-3.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-4.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-5.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-6.jpg"),
]
const JEONGHEE_GANGNAM = [
  require("@/assets/images/restaurant/jeonghee-gangnam-1.jpg"),
  require("@/assets/images/restaurant/jeonghee-gangnam-2.jpg"),
  require("@/assets/images/restaurant/jeonghee-gangnam-3.jpg"),
  require("@/assets/images/restaurant/jeonghee-gangnam-4.jpg"),
]
const CHOIGANE_SHABU = [
  require("@/assets/images/restaurant/choigane-shabu-1.jpg"),
  require("@/assets/images/restaurant/choigane-shabu-2.jpg"),
  require("@/assets/images/restaurant/choigane-shabu-3.jpg"),
  require("@/assets/images/restaurant/choigane-shabu-4.jpg"),
  require("@/assets/images/restaurant/choigane-shabu-5.jpg"),
]

export const MAP_CENTER = {
  latitude: 37.5022,
  longitude: 127.0281,
}

const allRestaurants = (
  restaurantsJson as { restaurants: RestaurantDataItem[] }
).restaurants

export function getCurationSections(
  t: TFunction<"common">,
  language: Language,
): CurationSectionData[] {
  return [
    {
      id: "section-menu-estimates",
      title: t("restaurant.curation.title"),
      subtitle: t("restaurant.curation.subtitle"),
      restaurants: allRestaurants.map((restaurant) => ({
        id: restaurant.id,
        name: getCatalogRestaurantName(
          restaurant.id,
          restaurant.name,
          language,
        ),
        description: t("restaurant.curation.cardDescription", {
          count: restaurant.menus.length,
        }),
        imageUri: PLACEHOLDER_IMAGE,
        tags: [getCatalogCuisineLabel(restaurant.cuisine, t, language)],
        address: getCatalogAddress(restaurant.id, restaurant.address, language),
      })),
    },
  ]
}

// Photo-backed place restaurants (curated with actual images)
const MOCK_PLACE_RESTAURANTS: Omit<PlaceRestaurant, "tags" | "description">[] =
  [
    {
      id: "p1",
      name: "오늘의 초록김밥",
      rating: 4.3,
      reviewCount: 198,
      distance: "0.5km",
      address: "서울 강남구 강남대로98길 14",
      latitude: 37.5007624,
      longitude: 127.0277757,
      images: CHOROK_GIMBAP,
      cuisineType: "KOREAN",
    },
    {
      id: "p2",
      name: "송화",
      rating: 4.5,
      reviewCount: 294,
      distance: "0.8km",
      address: "서울 강남구 강남대로94길 69",
      latitude: 37.5001365,
      longitude: 127.030754,
      images: SONGHWA,
      cuisineType: "KOREAN",
    },
    {
      id: "p3",
      name: "맛있저염",
      rating: 4.4,
      reviewCount: 156,
      distance: "2.1km",
      address: "서울 강남구 선릉로93길 40",
      latitude: 37.5046606,
      longitude: 127.0462786,
      images: MASHITJEOYEOM,
      cuisineType: "KOREAN",
    },
    {
      id: "p4",
      name: "소녀방앗간 서울고속터미널점",
      rating: 4.3,
      reviewCount: 87,
      distance: "3.5km",
      address: "서울 서초구 신반포로 194",
      latitude: 37.5049285,
      longitude: 127.0055927,
      images: SONYEO_BANGATGAN,
      cuisineType: "KOREAN",
    },
    {
      id: "p5",
      name: "정희 강남역점",
      rating: 4.6,
      reviewCount: 312,
      distance: "0.3km",
      address: "서울 강남구 강남대로102길 15",
      latitude: 37.5025765,
      longitude: 127.0274505,
      images: JEONGHEE_GANGNAM,
      cuisineType: "KOREAN",
    },
    {
      id: "p6",
      name: "최가네샤브샤브버섯칼국수 강남",
      rating: 4.4,
      reviewCount: 231,
      distance: "0.8km",
      address: "서울 강남구 강남대로94길 20",
      latitude: 37.5001365,
      longitude: 127.030754,
      images: CHOIGANE_SHABU,
      cuisineType: "KOREAN",
    },
  ]

const MOCK_PLACE_EN: Record<
  string,
  Pick<PlaceRestaurant, "name" | "address">
> = {
  p1: {
    name: "Oneul-ui Chorok Gimbap",
    address: "14 Gangnam-daero 98-gil, Gangnam-gu, Seoul",
  },
  p2: {
    name: "Songhwa",
    address: "69 Gangnam-daero 94-gil, Gangnam-gu, Seoul",
  },
  p3: {
    name: "Masitjeoyeom",
    address: "40 Seolleung-ro 93-gil, Gangnam-gu, Seoul",
  },
  p4: {
    name: "Sonyeo Bangatgan — Seoul Express Bus Terminal",
    address: "194 Sinbanpo-ro, Seocho-gu, Seoul",
  },
  p5: {
    name: "Jeonghee — Gangnam Station",
    address: "15 Gangnam-daero 102-gil, Gangnam-gu, Seoul",
  },
  p6: {
    name: "Choigane Shabu-Shabu Mushroom Kalguksu — Gangnam",
    address: "20 Gangnam-daero 94-gil, Gangnam-gu, Seoul",
  },
}

export function getMockPlaceRestaurants(
  t: TFunction<"common">,
  language: Language,
): PlaceRestaurant[] {
  return MOCK_PLACE_RESTAURANTS.map((restaurant) => {
    const localized = language === "en" ? MOCK_PLACE_EN[restaurant.id] : null
    return {
      ...restaurant,
      ...(localized ?? {}),
      tags: [t("restaurant.cuisine.KOREAN")],
      description: t("restaurant.curation.mockDescription"),
    }
  })
}
