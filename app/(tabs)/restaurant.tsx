import { useState, useMemo, useEffect, useCallback } from "react"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, View, Text, Spinner } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
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

const TABS = [
  { key: "place", label: "장소" },
  { key: "curation", label: "식당 큐레이션" },
]

const CUISINE_TYPE_MAP: Record<string, string> = {
  KOREAN: "한식",
  JAPANESE: "일식",
  CHINESE: "중식",
  WESTERN: "양식",
  ETC: "세계음식",
}

const REGION_COORDS: Record<
  string,
  { latitude: number; longitude: number; zoomLevel: number }
> = {
  서울: { latitude: 37.5665, longitude: 126.978, zoomLevel: 6 },
  경기: { latitude: 37.4138, longitude: 127.5183, zoomLevel: 7 },
  인천: { latitude: 37.4563, longitude: 126.7052, zoomLevel: 6 },
  부산: { latitude: 35.1796, longitude: 129.0756, zoomLevel: 6 },
  제주: { latitude: 33.4996, longitude: 126.5312, zoomLevel: 6 },
  울산: { latitude: 35.5384, longitude: 129.3114, zoomLevel: 6 },
  경남: { latitude: 35.4606, longitude: 128.2132, zoomLevel: 7 },
  대구: { latitude: 35.8714, longitude: 128.6014, zoomLevel: 6 },
  경북: { latitude: 36.4919, longitude: 128.8889, zoomLevel: 7 },
  강원: { latitude: 37.8228, longitude: 128.1555, zoomLevel: 7 },
  대전: { latitude: 36.3504, longitude: 127.3845, zoomLevel: 6 },
  충남: { latitude: 36.5184, longitude: 126.8, zoomLevel: 7 },
  충북: { latitude: 36.6357, longitude: 127.4914, zoomLevel: 7 },
  세종: { latitude: 36.48, longitude: 127.289, zoomLevel: 6 },
  전남: { latitude: 34.8679, longitude: 126.991, zoomLevel: 7 },
  광주: { latitude: 35.1595, longitude: 126.8526, zoomLevel: 6 },
  전북: { latitude: 35.7175, longitude: 127.153, zoomLevel: 7 },
}

const SEOUL_SUBREGION_COORDS: Record<
  string,
  { latitude: number; longitude: number }
> = {
  강남: { latitude: 37.5172, longitude: 127.0473 },
  서초: { latitude: 37.4837, longitude: 127.0324 },
  "잠실/송파/강동": { latitude: 37.5139, longitude: 127.1069 },
  "영등포/여의도/강서": { latitude: 37.5283, longitude: 126.8993 },
  "건대/성수/왕십리": { latitude: 37.5408, longitude: 127.069 },
  "종로/중구": { latitude: 37.573, longitude: 126.9797 },
  "홍대/합정/마포": { latitude: 37.5563, longitude: 126.9236 },
  "용산/이태원/한남": { latitude: 37.5326, longitude: 126.9958 },
  "성북/노원/중랑": { latitude: 37.6099, longitude: 127.0539 },
  "구로/관악/동작": { latitude: 37.4955, longitude: 126.9268 },
}

function toPlaceRestaurant(item: NearbyRestaurantItem): PlaceRestaurant {
  const cuisineTag = CUISINE_TYPE_MAP[item.cuisineType] || "기타"
  const tags = [cuisineTag]
  if (item.safeMenuCount > 0) tags.push("저염")
  if (item.highRiskMenuCount === 0 && item.menuCount > 0) tags.push("안심")

  const distStr =
    item.distanceKm < 1
      ? `${Math.round(item.distanceKm * 1000)}m`
      : `${item.distanceKm}km`

  const parts: string[] = []
  if (item.menuCount > 0) parts.push(`메뉴 ${item.menuCount}개`)
  if (item.safeMenuCount > 0) parts.push(`안심 메뉴 ${item.safeMenuCount}개`)
  const description = parts.length > 0 ? parts.join(" · ") : cuisineTag

  return {
    id: String(item.restaurantId),
    name: item.name,
    tags,
    description,
    distance: distStr,
    address: item.address || "",
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
  const insets = useSafeAreaInsets()
  const isDarkMode = useAppColorScheme() === "dark"
  const { policy } = useMobilePolicy()
  const restaurantTabEnabled = isRestaurantTabEnabled(policy)
  const [activeTab, setActiveTab] = useState("place")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE)
  const [restaurants, setRestaurants] = useState<PlaceRestaurant[]>([])
  const [loading, setLoading] = useState(false)

  const mapCenter = useMemo(() => {
    if (filters.subRegions.length > 0) {
      const specific = filters.subRegions.find((r) => r !== "서울 전체")
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
    try {
      const foodTypeToApi: Record<string, string> = {
        한식: "KOREAN",
        중식: "CHINESE",
        일식: "JAPANESE",
        양식: "WESTERN",
        세계음식: "ETC",
      }
      const cuisineType =
        filters.foodTypes.length === 1
          ? foodTypeToApi[filters.foodTypes[0]]
          : undefined

      const data = await restaurantService.fetchNearby(
        mapCenter.latitude,
        mapCenter.longitude,
        3000,
        cuisineType,
      )
      setRestaurants(data.map(toPlaceRestaurant))
    } catch {
      setRestaurants([])
    } finally {
      setLoading(false)
    }
  }, [mapCenter.latitude, mapCenter.longitude, filters.foodTypes])

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
        !filters.foodTypes.some((t) => r.tags.includes(t))
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
        tabs={TABS}
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
                  주변 식당을 검색하고 있어요
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
