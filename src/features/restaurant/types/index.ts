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
  rating: number
  reviewCount: number
  distance: string
  address: string
  images: (string | number)[]
}
