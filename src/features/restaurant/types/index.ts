export interface Restaurant {
  id: string
  name: string
  description: string
  imageUri: string | number
  tags: string[]
  address: string
}

export interface CurationSectionData {
  id: string
  title: string
  subtitle: string
  restaurants: Restaurant[]
}

export interface PlaceRestaurant {
  id: string
  name: string
  tags: string[]
  description: string
  rating?: number
  reviewCount?: number
  distance: string
  address: string
  latitude: number
  longitude: number
  images: (string | number)[]
  cuisineType?: string
  menuCount?: number
  safeMenuCount?: number
  cautionMenuCount?: number
  highRiskMenuCount?: number
}

export interface FilterState {
  region: string | null
  subRegions: string[]
  foodTypes: string[]
  nutrients: string[]
}

export type FilterTab = "region" | "foodType" | "nutrient"
