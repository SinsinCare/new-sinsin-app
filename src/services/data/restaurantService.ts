import { api } from "../core"

export interface NearbyRestaurantItem {
  restaurantId: number
  name: string
  address?: string | null
  shortAddress?: string | null
  lat: number
  lng: number
  phone: string | null
  cuisineType: string
  distanceKm: number
  menuCount: number
  safeMenuCount: number
  cautionMenuCount: number
  highRiskMenuCount: number
  avgRiskLevel: string
}

export interface RestaurantMenuItem {
  menuId: number
  name: string
  price: number | null
  calories: number | null
  protein: number | null
  sodium: number | null
  potassium: number | null
  phosphorus: number | null
  riskLevel: string
  riskNutrients: string[]
  confidence: string
}

export interface RestaurantMenusResult {
  restaurantId: number
  restaurantName: string
  address: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  cuisineType: string
  menus: RestaurantMenuItem[]
}

export const restaurantService = {
  async fetchNearby(
    lat: number,
    lng: number,
    radius = 2000,
    cuisineTypes: string[] = [],
    nutritionTags: string[] = [],
  ): Promise<NearbyRestaurantItem[]> {
    try {
      const response = await api.get("/restaurants/nearby", {
        params: {
          lat,
          lng,
          radius,
          cuisineTypes:
            cuisineTypes.length > 0 ? cuisineTypes.join(",") : undefined,
          nutritionTags:
            nutritionTags.length > 0 ? nutritionTags.join(",") : undefined,
        },
      })
      return response.data.result as NearbyRestaurantItem[]
    } catch (err) {
      throw err
    }
  },

  async fetchMenus(restaurantId: number): Promise<RestaurantMenusResult> {
    try {
      const response = await api.get(`/restaurants/${restaurantId}/menus`)
      return response.data.result as RestaurantMenusResult
    } catch (err) {
      throw err
    }
  },
}
