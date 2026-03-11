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
