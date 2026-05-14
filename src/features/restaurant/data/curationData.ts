import type { CurationSectionData, PlaceRestaurant } from "../types"
import type { RestaurantDataItem } from "./restaurantDataTypes"
import restaurantsJson from "./restaurantsData.json"

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

// Derive tags from menu filter_scores
function buildTags(item: RestaurantDataItem): string[] {
  const tags: string[] = [item.cuisine]
  if (item.menus.some((m) => m.filter_scores.low_sodium === "pass")) tags.push("저염")
  if (item.menus.some((m) => m.filter_scores.low_potassium === "pass")) tags.push("저칼륨")
  if (item.menus.some((m) => m.filter_scores.low_phosphorus === "pass")) tags.push("저인")
  if (item.menus.some((m) => m.filter_scores.low_protein === "pass")) tags.push("저단백")
  return tags
}

function toPlaceRestaurant(item: RestaurantDataItem): PlaceRestaurant {
  return {
    id: item.id,
    name: item.name,
    tags: buildTags(item),
    description: item.description,
    rating: item.rating,
    reviewCount: item.review_count,
    distance: "",
    address: item.address,
    latitude: item.lat,
    longitude: item.lng,
    images: [],
    menuCount: item.menus.length,
    safeMenuCount: item.menus.filter(
      (m) => Object.values(m.filter_scores).filter((v) => v === "pass").length >= 3,
    ).length,
  }
}

const allRestaurants = (restaurantsJson as { restaurants: RestaurantDataItem[] }).restaurants

const highlyRecommended = allRestaurants.filter((r) => r.safety_tier === "highly_recommended")
const partial = allRestaurants.filter((r) => r.safety_tier === "partial")
const limited = allRestaurants.filter((r) => r.safety_tier === "limited")

export const CURATED_RESTAURANTS: PlaceRestaurant[] = allRestaurants.map(toPlaceRestaurant)

export const MOCK_CURATION_SECTIONS: CurationSectionData[] = [
  {
    id: "section-highly-recommended",
    title: "신장 건강 추천 식당",
    subtitle: "신장 친화적인 메뉴 비율이 높은 안심 식당이에요.",
    restaurants: highlyRecommended.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUri: PLACEHOLDER_IMAGE,
      tags: buildTags(r),
      address: r.address,
    })),
  },
  {
    id: "section-partial",
    title: "이용 가능한 식당",
    subtitle: "메뉴 선택에 따라 안전하게 이용할 수 있어요.",
    restaurants: partial.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUri: PLACEHOLDER_IMAGE,
      tags: buildTags(r),
      address: r.address,
    })),
  },
  {
    id: "section-limited",
    title: "섭취량 조절이 필요한 식당",
    subtitle: "담당 의료진과 상의 후 소량만 이용하세요.",
    restaurants: limited.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUri: PLACEHOLDER_IMAGE,
      tags: buildTags(r),
      address: r.address,
    })),
  },
]

// Photo-backed place restaurants (curated with actual images)
export const MOCK_PLACE_RESTAURANTS: PlaceRestaurant[] = [
  {
    id: "p1",
    name: "오늘의 초록김밥",
    tags: ["한식", "저염"],
    description: "영업중 · 저염명란 통계란김밥이 인기인 건강 김밥 전문점",
    rating: 4.3,
    reviewCount: 198,
    distance: "0.5km",
    address: "서울 강남구 강남대로98길 14",
    latitude: 37.5007624,
    longitude: 127.0277757,
    images: CHOROK_GIMBAP,
  },
  {
    id: "p2",
    name: "송화",
    tags: ["한식", "저염"],
    description: "영업중 · 강된장과 불고기가 맛있는 신선한 한정식 전문점",
    rating: 4.5,
    reviewCount: 294,
    distance: "0.8km",
    address: "서울 강남구 강남대로94길 69",
    latitude: 37.5001365,
    longitude: 127.030754,
    images: SONGHWA,
  },
  {
    id: "p3",
    name: "맛있저염",
    tags: ["한식", "저염", "저당"],
    description: "영업중 · 맛있게 즐기는 저염식 건강 한식 전문점",
    rating: 4.4,
    reviewCount: 156,
    distance: "2.1km",
    address: "서울 강남구 선릉로93길 40",
    latitude: 37.5046606,
    longitude: 127.0462786,
    images: MASHITJEOYEOM,
  },
  {
    id: "p4",
    name: "소녀방앗간 서울고속터미널점",
    tags: ["한식", "저염", "저인"],
    description: "영업중 · 산나물밥과 건강 정식이 맛있는 자연식 전문점",
    rating: 4.3,
    reviewCount: 87,
    distance: "3.5km",
    address: "서울 서초구 신반포로 194",
    latitude: 37.5049285,
    longitude: 127.0055927,
    images: SONYEO_BANGATGAN,
  },
  {
    id: "p5",
    name: "정희 강남역점",
    tags: ["한식", "저염"],
    description: "영업중 · 고사리 크림 수제비와 지짐밥이 인기인 퓨전 한식",
    rating: 4.6,
    reviewCount: 312,
    distance: "0.3km",
    address: "서울 강남구 강남대로102길 15",
    latitude: 37.5025765,
    longitude: 127.0274505,
    images: JEONGHEE_GANGNAM,
  },
  {
    id: "p6",
    name: "최가네샤브샤브버섯칼국수 강남",
    tags: ["한식", "저염", "저칼륨"],
    description: "영업중 · 푸짐한 버섯 샤브샤브와 칼국수를 한 번에",
    rating: 4.4,
    reviewCount: 231,
    distance: "0.8km",
    address: "서울 강남구 강남대로94길 20",
    latitude: 37.5001365,
    longitude: 127.030754,
    images: CHOIGANE_SHABU,
  },
]
