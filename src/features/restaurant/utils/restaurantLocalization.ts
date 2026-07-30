import type { TFunction } from "i18next"

import type { Language } from "@/src/i18n"

const CATALOG_CUISINE_KEYS = {
  두부: "restaurant.catalogCuisine.tofu",
  죽: "restaurant.catalogCuisine.porridge",
  한식: "restaurant.cuisine.KOREAN",
  "샐러드/포케": "restaurant.catalogCuisine.saladPoke",
  일식: "restaurant.cuisine.JAPANESE",
  샤브: "restaurant.catalogCuisine.shabu",
  사찰: "restaurant.catalogCuisine.temple",
} as const

const CATALOG_RESTAURANT_NAMES_EN: Record<string, string> = {
  R001: "Daehan Sundubu",
  R002: "Maeum Juk — Shinsegae Gangnam",
  R003: "Seowon Juk — Myeongdong",
  R004: "Bonjuk — Seongsu Station",
  R005: "Gunseonsaeng — Gangnam",
  R006: "Godeungeo Sikdang",
  R007: "Bada Deungpureun Saengseon-gui — Nonhyeon",
  R008: "Slow Cali — Yeonnam",
  R009: "Balance Poke — Yeoksam",
  R010: "Fish Bucket — Hapjeong",
  R011: "It Sushi — Yeonnam",
  R012: "Omakase Osai Sushi — Hongdae",
  R013: "Shabu Garden — Jongno Tower",
  R014: "Deungchon Shabu Kalguksu — Jongno",
  R015: "Sanchon Temple Cuisine",
  R016: "Aseungji Temple Cuisine",
  R017: "Kongcheongdae — Mangwon",
}

const CATALOG_ADDRESSES_EN: Record<string, string> = {
  R001: "Lawyers’ Hall B1, 13 Saemunan-ro 5-gil, Jongno-gu, Seoul",
  R002: "Shinsegae Department Store Gangnam B1, 176 Sinbanpo-ro, Seocho-gu, Seoul",
  R003: "141 Toegye-ro, Jung-gu, Seoul",
  R004: "15 Achasan-ro 7-gil, Seongdong-gu, Seoul",
  R005: "1321-9 Seocho 2-dong, Seocho-gu, Seoul",
  R006: "Daewoo Dioville Plus B1, 33 Gangnam-daero 84-gil, Gangnam-gu, Seoul",
  R007: "66-35 Nonhyeon-dong, Gangnam-gu, Seoul",
  R008: "35 Donggyo-ro 38-gil, Mapo-gu, Seoul",
  R009: "75 Gangnam-daero 94-gil, Gangnam-gu, Seoul",
  R010: "373-3 Hapjeong-dong, Mapo-gu, Seoul",
  R011: "174-4 Donggyo-dong, Mapo-gu, Seoul",
  R012: "2F, 11 Yeonhui-ro 1-gil, Mapo-gu, Seoul",
  R013: "51 Jong-ro, Jongno-gu, Seoul",
  R014: "3 Samil-daero 15-gil, Jongno-gu, Seoul",
  R015: "30-13 Insadong-gil, Jongno-gu, Seoul",
  R016: "176 Singil-ro, Yeongdeungpo-gu, Seoul",
  R017: "29-1 Poeun-ro, Mapo-gu, Seoul",
}

const CATALOG_MENU_NAMES_EN: Record<string, string> = {
  M001: "Tofu Set Meal",
  M002: "Vegan Tofu Set Meal",
  M003: "Kongguksu (Chilled Soy Milk Noodles)",
  M004: "Plain Rice Porridge",
  M005: "Abalone Porridge (No Innards)",
  M006: "Sweet Pumpkin Porridge",
  M007: "Chicken Porridge",
  M008: "Abalone Porridge",
  M009: "Mushroom and Oyster Porridge",
  M010: "Vegetable Porridge (White Rice)",
  M011: "Bulgogi Brown Rice Porridge",
  M012: "Sweet Pumpkin Porridge",
  M013: "Grilled Mackerel Set",
  M014: "Grilled Salmon Set",
  M015: "Doenjang Stew Set",
  M016: "Grilled Mackerel, A La Carte",
  M017: "Braised Aged Mackerel",
  M018: "Bossam Set",
  M019: "Braised Mackerel",
  M020: "Bean Sprout Soup, Side",
  M021: "Build-Your-Own Bowl (White Rice, Light Salmon)",
  M022: "Chicken Bowl",
  M023: "Sweet Pumpkin Bowl",
  M024: "Salmon Poke (Half Rice)",
  M025: "Tofu Crouton Bowl",
  M026: "Pumpkin Soup Set",
  M027: "Yuzu Soy Salmon Poke",
  M028: "Spicy Mayo Poke",
  M029: "White Fish Sushi (Flounder and Sea Bream)",
  M030: "10-Piece Lunch Omakase",
  M031: "8-Piece Lunch Omakase",
  M032: "Grilled Mackerel Sushi, A La Carte",
  M033: "Vegetable Shabu, Clear Broth (Light Meat)",
  M034: "Mushroom and Burdock Assortment",
  M035: "Beef Shabu (Half Noodles)",
  M036: "Spicy Mushroom Kalguksu",
  M037: "Temple Cuisine Set Course",
  M038: "Temple Cuisine Lunch Course",
  M039: "Plain Sundubu (Sauce on the Side)",
  M040: "Kongbiji (Soy Pulp Stew)",
  M041: "Spicy Sundubu Stew",
}

const CATALOG_FEATURES_EN: Record<string, string> = {
  "양념 따로 요청": "Sauce available on the side",
  "비건 메뉴": "Vegan options",
  "예약 권장": "Reservations recommended",
  "흰쌀로 변경": "White-rice substitution available",
  "포장 가능": "Takeout available",
  "아침 메뉴": "Breakfast menu",
  "관광객 이용 편리": "Visitor-friendly location",
  "영양 정보 표시": "Nutrition information available",
  "반찬 선택 가능": "Choice of side dishes",
  "단품 주문 가능": "A la carte ordering",
  "간이 약한 편": "Ask about lighter seasoning",
  "재료 선택 가능": "Build-your-own ingredients",
  "드레싱 따로": "Dressing available on the side",
  "24시간": "Open 24 hours",
  "단백질 양 조절": "Protein portion can be adjusted",
  "두부 메뉴": "Tofu options",
  "1피스 단위 주문": "Order by the piece",
  "혼자 이용 가능": "Solo dining",
  "맑은 육수 선택": "Clear broth available",
  "국물 양 조절": "Broth amount can be adjusted",
  "1인 세트": "Individual sets",
  "오신채 없음": "No five pungent vegetables",
  "코스 요리": "Set course",
  "예약 필요": "Reservations required",
}

const CATALOG_DESCRIPTIONS_EN: Record<string, string> = {
  "두부 소반과 비건 메뉴가 있고, 간이 비교적 약한 편이에요.":
    "Offers tofu set meals and vegan options. Ask for sauce or seasoning on the side.",
  "백화점 식품관에 있는 죽 전문점으로, 흰죽 메뉴를 고를 수 있어요.":
    "A porridge shop in the Shinsegae Gangnam food hall with plain rice porridge available.",
  "40년 동안 운영한 죽 전문점으로, 새벽부터 점심까지 문을 열어요.":
    "A long-running porridge shop open from early morning through lunch.",
  "영양 정보를 확인할 수 있는 프랜차이즈 죽 전문점이에요.":
    "A porridge chain that publishes nutrition information for its menu.",
  "고등어·연어 구이 정식과 직접 고르는 반찬 코너가 있어요.":
    "Offers grilled mackerel and salmon sets with a choice of side dishes.",
  "숙성 고등어 구이와 조림을 단품으로 주문할 수 있어요.":
    "Offers grilled and braised aged mackerel as a la carte dishes.",
  "양념이 비교적 약한 생선조림 메뉴가 많아요.":
    "Serves several braised-fish dishes. Ask about sauce and seasoning when ordering.",
  "재료를 직접 골라 단백질과 드레싱 양을 조절할 수 있어요.":
    "Build your own bowl and choose the protein and dressing amounts.",
  "24시간 운영하며, 단백질 양을 조절할 수 있어요.":
    "Open 24 hours, with adjustable protein portions.",
  "현미밥을 흰쌀밥으로 바꿀 수 있어요.":
    "White rice is available as a substitute for brown rice.",
  "점심 오마카세는 13,900원이며, 초밥을 1피스 단위로 조절할 수 있어요.":
    "The lunch omakase is KRW 13,900, and sushi can be ordered by the piece.",
  "점심 오마카세를 초밥 1피스 단위로 주문할 수 있어요.":
    "Lunch omakase sushi can be ordered by the piece.",
  "맑은 육수를 고를 수 있고, 채소를 데쳐 칼륨을 줄일 수 있어요.":
    "Clear broth is available. Ask the restaurant how the vegetables are prepared.",
  "1인 샤브 세트가 있고, 국물 양을 조절할 수 있어요.":
    "Offers individual shabu sets with an adjustable amount of broth.",
  "마늘과 양파를 넣지 않은 사찰음식 정식 코스예요.":
    "A temple-cuisine set course made without garlic or onion.",
  "예약제로 운영하는 사찰음식 코스이며, 점심은 30,000원이에요.":
    "A reservation-only temple-cuisine course; lunch is KRW 30,000.",
  "흰순두부를 단품으로 주문하고 양념을 따로 받을 수 있어요.":
    "Plain sundubu is available a la carte with sauce on the side.",
}

export function getCatalogRestaurantName(
  id: string,
  value: string,
  language: Language,
): string {
  return language === "en" ? (CATALOG_RESTAURANT_NAMES_EN[id] ?? value) : value
}

export function getCatalogAddress(
  id: string,
  value: string,
  language: Language,
): string {
  return language === "en" ? (CATALOG_ADDRESSES_EN[id] ?? value) : value
}

export function getCatalogMenuName(
  id: string,
  value: string,
  language: Language,
): string {
  return language === "en" ? (CATALOG_MENU_NAMES_EN[id] ?? value) : value
}

export function getCatalogCuisineLabel(
  value: string,
  t: TFunction<"common">,
  language: Language,
): string {
  const key = CATALOG_CUISINE_KEYS[value as keyof typeof CATALOG_CUISINE_KEYS]
  if (key) return t(key)
  return language === "ko" ? value : t("restaurant.cuisine.OTHER")
}

export function getCatalogFeatureLabels(
  features: string[],
  language: Language,
): string[] {
  if (language === "ko") return features
  return features.flatMap((feature) => {
    const translated = CATALOG_FEATURES_EN[feature]
    return translated ? [translated] : []
  })
}

export function getLocalizedDescription(
  value: string,
  t: TFunction<"common">,
  language: Language,
): string {
  if (language !== "en" || !/[가-힣]/.test(value)) return value
  return (
    CATALOG_DESCRIPTIONS_EN[value] ??
    t("restaurant.detail.descriptionUnavailable")
  )
}

export function getLocalizedCategoryTags(
  values: string[],
  language: Language,
): string[] {
  return language === "en"
    ? values.filter((value) => !/[가-힣]/.test(value))
    : values
}

export function getCatalogHours(
  value: string | undefined,
  t: TFunction<"common">,
  language: Language,
): string {
  if (!value) return t("restaurant.detail.hoursUnknown")
  if (value === "휴무" || value.toLowerCase() === "closed") {
    return t("restaurant.detail.closed")
  }
  if (language === "en" && /[가-힣]/.test(value)) {
    return t("restaurant.detail.hoursUnknown")
  }
  return value
}
