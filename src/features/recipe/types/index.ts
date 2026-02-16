export interface FoodNutrients {
  name: string
  energy: number
  water: number
  protein: number
  fat: number
  ash: number
  carbohydrate: number
  sugar: number | null
  fiber: number | null
  calcium: number | null
  iron: number | null
  magnesium: number | null
  phosphorus: number | null
  potassium: number | null
  sodium: number | null
  vitaminD: number | null
  totalAminoAcid: number | null
  essentialAminoAcid: number | null
}

export interface NutrientBreakdown {
  phosphorus: number
  potassium: number
  sodium: number
  protein: number
}

export interface BenefitBreakdown {
  water: number
  magnesium: number
  calcium: number
  vitaminD: number
}

export interface KidneyRecommendedFood {
  food: FoodNutrients
  score: number
  penaltyBreakdown: NutrientBreakdown
  benefitBreakdown: BenefitBreakdown
  tags: string[]
}

export interface CommunityMealPost {
  id: string
  authorName: string
  authorRole: string
  imageUri: string | null
  title: string
  description: string
  likes: number
  liked: boolean
  comments: number
  bookmarked: boolean
  createdAt: Date
}

export interface ICommunityPostService {
  getPosts(): CommunityMealPost[]
  getPost(id: string): CommunityMealPost | undefined
  createPost(
    post: Omit<
      CommunityMealPost,
      "id" | "likes" | "liked" | "comments" | "bookmarked" | "createdAt"
    >,
  ): CommunityMealPost
  toggleLike(postId: string): void
  toggleBookmark(postId: string): void
}
