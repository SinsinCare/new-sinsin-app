import { useState, useMemo, useEffect, useCallback } from "react"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, View, Text, Spinner } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { RestaurantTabHeader } from "@/src/features/restaurant/components/RestaurantTabHeader"
import { RestaurantSearchInput } from "@/src/features/restaurant/components/RestaurantSearchInput"
import { KakaoMapWebView } from "@/src/features/restaurant/components/KakaoMapWebView"
import { CurationTab } from "@/src/features/restaurant/components/CurationTab"
import { PlaceSheet } from "@/src/features/restaurant/components/PlaceSheet"
import { RestaurantReportForm } from "@/src/features/restaurant/components/RestaurantReportForm"
import { MAP_CENTER } from "@/src/features/restaurant/data/curationData"
import { DEFAULT_FILTER_STATE } from "@/src/features/restaurant/data/filterData"
import {
  restaurantService,
  type NearbyRestaurantItem,
} from "@/src/services/data/restaurantService"
import type {
  FilterState,
  PlaceRestaurant,
} from "@/src/features/restaurant/types"
import { useMobilePolicy } from "@/src/features/mobilePolicy"
import { isRestaurantTabEnabled } from "@/src/features/mobilePolicy/services/mobilePolicyService"

const FOOD_TYPE_TO_API: Record<string, string> = {
  korean: "KOREAN",
  chinese: "CHINESE",
  japanese: "JAPANESE",
  american: "WESTERN",
  world: "ETC",
}

const NUTRIENT_TO_API: Record<string, string> = {
  "low-sugar": "LOW_SUGAR",
  "low-salt": "LOW_SODIUM",
  "low-potassium": "LOW_POTASSIUM",
  "low-phosphorus": "LOW_PHOSPHORUS",
}

const CUISINE_I18N_KEY = {
  KOREAN: "restaurant.cuisine.KOREAN",
  JAPANESE: "restaurant.cuisine.JAPANESE",
  CHINESE: "restaurant.cuisine.CHINESE",
  WESTERN: "restaurant.cuisine.WESTERN",
  ETC: "restaurant.cuisine.ETC",
} as const

const REGION_COORDS: Record<
  string,
  { latitude: number; longitude: number; zoomLevel: number }
> = {
  seoul: { latitude: 37.5665, longitude: 126.978, zoomLevel: 6 },
  gyeonggi: { latitude: 37.4138, longitude: 127.5183, zoomLevel: 7 },
  incheon: { latitude: 37.4563, longitude: 126.7052, zoomLevel: 6 },
  busan: { latitude: 35.1796, longitude: 129.0756, zoomLevel: 6 },
  jeju: { latitude: 33.4996, longitude: 126.5312, zoomLevel: 6 },
  ulsan: { latitude: 35.5384, longitude: 129.3114, zoomLevel: 6 },
  gyeongnam: { latitude: 35.4606, longitude: 128.2132, zoomLevel: 7 },
  daegu: { latitude: 35.8714, longitude: 128.6014, zoomLevel: 6 },
  gyeongbuk: { latitude: 36.4919, longitude: 128.8889, zoomLevel: 7 },
  gangwon: { latitude: 37.8228, longitude: 128.1555, zoomLevel: 7 },
  daejeon: { latitude: 36.3504, longitude: 127.3845, zoomLevel: 6 },
  chungnam: { latitude: 36.5184, longitude: 126.8, zoomLevel: 7 },
  chungbuk: { latitude: 36.6357, longitude: 127.4914, zoomLevel: 7 },
  sejong: { latitude: 36.48, longitude: 127.289, zoomLevel: 6 },
  jeonnam: { latitude: 34.8679, longitude: 126.991, zoomLevel: 7 },
  gwangju: { latitude: 35.1595, longitude: 126.8526, zoomLevel: 6 },
  jeonbuk: { latitude: 35.7175, longitude: 127.153, zoomLevel: 7 },
}

const SEOUL_SUBREGION_COORDS: Record<
  string,
  { latitude: number; longitude: number }
> = {
  gangnam: { latitude: 37.5172, longitude: 127.0473 },
  seocho: { latitude: 37.4837, longitude: 127.0324 },
  jamsil: { latitude: 37.5139, longitude: 127.1069 },
  yeongdeungpo: { latitude: 37.5283, longitude: 126.8993 },
  kondae: { latitude: 37.5408, longitude: 127.069 },
  jongno: { latitude: 37.573, longitude: 126.9797 },
  hongdae: { latitude: 37.5563, longitude: 126.9236 },
  yongsan: { latitude: 37.5326, longitude: 126.9958 },
  seongbuk: { latitude: 37.6099, longitude: 127.0539 },
  guro: { latitude: 37.4955, longitude: 126.9268 },
}

function toPlaceRestaurant(
  item: NearbyRestaurantItem,
  translate: TFunction<"common">,
): PlaceRestaurant {
  const cuisineKey =
    CUISINE_I18N_KEY[item.cuisineType as keyof typeof CUISINE_I18N_KEY] ??
    "restaurant.cuisine.OTHER"
  const cuisineTag = translate(cuisineKey)
  const tags = [cuisineTag]

  const distStr =
    item.distanceKm < 1
      ? `${Math.round(item.distanceKm * 1000)}m`
      : `${item.distanceKm}km`

  const parts: string[] = []
  if (item.menuCount > 0) {
    parts.push(translate("restaurant.menuCount", { count: item.menuCount }))
  }
  const description = parts.length > 0 ? parts.join(" · ") : cuisineTag

  return {
    id: String(item.restaurantId),
    name: item.name,
    tags,
    description,
    distance: distStr,
    address: item.shortAddress ?? item.address ?? "",
    latitude: item.lat,
    longitude: item.lng,
    images: [],
    cuisineType: item.cuisineType,
    menuCount: item.menuCount,
    safeMenuCount: item.safeMenuCount,
    cautionMenuCount: item.cautionMenuCount,
    highRiskMenuCount: item.highRiskMenuCount,
  }
}

export default function RestaurantScreen() {
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const isDarkMode = useAppColorScheme() === "dark"
  const { policy } = useMobilePolicy()
  const restaurantTabEnabled = isRestaurantTabEnabled(policy)
  const [activeTab, setActiveTab] = useState("place")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE)
  const [restaurants, setRestaurants] = useState<PlaceRestaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const tabs = useMemo(
    () => [
      { key: "place", label: t("restaurant.nearby") },
      { key: "curation", label: t("restaurant.menuInfo") },
    ],
    [t],
  )

  const mapCenter = useMemo(() => {
    if (filters.subRegions.length > 0) {
      const specific = filters.subRegions.find((r) => r !== "seoul-all")
      if (specific) {
        const coords = SEOUL_SUBREGION_COORDS[specific]
        if (coords) return { ...coords, zoomLevel: 5 }
      }
      return { latitude: 37.5665, longitude: 126.978, zoomLevel: 6 }
    }
    if (filters.region) {
      const coords = REGION_COORDS[filters.region]
      if (coords) return coords
    }
    return {
      latitude: MAP_CENTER.latitude,
      longitude: MAP_CENTER.longitude,
      zoomLevel: 5,
    }
  }, [filters.region, filters.subRegions])

  const fetchRestaurants = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const cuisineTypes = filters.foodTypes
        .map((foodType) => FOOD_TYPE_TO_API[foodType])
        .filter((value): value is string => Boolean(value))
      const nutritionTags = filters.nutrients
        .map((nutrient) => NUTRIENT_TO_API[nutrient])
        .filter((value): value is string => Boolean(value))

      const data = await restaurantService.fetchNearby(
        mapCenter.latitude,
        mapCenter.longitude,
        3000,
        cuisineTypes,
        nutritionTags,
      )
      setRestaurants(data.map((item) => toPlaceRestaurant(item, t)))
    } catch {
      setRestaurants([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [
    mapCenter.latitude,
    mapCenter.longitude,
    filters.foodTypes,
    filters.nutrients,
    t,
  ])

  useEffect(() => {
    if (restaurantTabEnabled && activeTab === "place") {
      fetchRestaurants()
    }
  }, [activeTab, fetchRestaurants, restaurantTabEnabled])

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matches =
          r.name.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.description.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (
        filters.foodTypes.length > 0 &&
        !filters.foodTypes.some(
          (foodType) => FOOD_TYPE_TO_API[foodType] === r.cuisineType,
        )
      )
        return false
      return true
    })
  }, [search, restaurants, filters.foodTypes])

  if (!restaurantTabEnabled) {
    return <RestaurantReportForm paddingTop={insets.top} />
  }

  return (
    <YStack
      flex={1}
      backgroundColor={isDarkMode ? "#1F1F21" : "#FCFCFC"}
      paddingTop={insets.top}
    >
      <RestaurantTabHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {activeTab === "place" && (
        <>
          <YStack paddingHorizontal={16}>
            <RestaurantSearchInput value={search} onChangeText={setSearch} />
          </YStack>
          <View flex={1} marginTop={12}>
            {loading ? (
              <YStack flex={1} alignItems="center" justifyContent="center">
                <Spinner size="large" color="$primary" />
                <Text fontSize={14} color="$colorSubtle" marginTop={8}>
                  {t("restaurant.loadingNearby")}
                </Text>
              </YStack>
            ) : (
              <KakaoMapWebView
                latitude={mapCenter.latitude}
                longitude={mapCenter.longitude}
                zoomLevel={mapCenter.zoomLevel}
                restaurants={filteredRestaurants}
              />
            )}
          </View>
          <PlaceSheet
            restaurants={filteredRestaurants}
            filters={filters}
            onFiltersChange={setFilters}
            isError={loadError}
            onRetry={fetchRestaurants}
          />
        </>
      )}
      {activeTab === "curation" && (
        <View flex={1}>
          <CurationTab />
        </View>
      )}
    </YStack>
  )
}
