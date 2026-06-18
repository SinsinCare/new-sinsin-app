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

export interface CommunityPostVoteCreate {
  options: string[]
  allowMultiple: boolean
}

export interface CommunityPostVoteOption {
  id: number
  text: string
  count: number
}

export interface CommunityPostVote {
  id: number
  allowMultiple: boolean
  options: CommunityPostVoteOption[]
  totalCount: number
  myVote: number[] | null
}

/** Backend / API payload before mapping to {@link CommunityMealPost}. */
export interface CommunityMealPostApi {
  id: string | number
  authorId?: number
  authorName: string
  authorRole: string
  category: string
  imageUri?: string | null
  title: string
  description: string
  likes: number
  liked: boolean
  comments: number
  bookmarked: boolean
  createdAt: string | number | Date
  updatedAt?: string | number | Date
  vote?: CommunityPostVote | null
}

export interface CommunityMealPost {
  id: string
  authorId?: number
  authorName: string
  authorRole: string
  category: string
  imageUri: string | null
  title: string
  description: string
  likes: number
  liked: boolean
  comments: number
  bookmarked: boolean
  createdAt: Date
  updatedAt?: Date
  vote: CommunityPostVote | null
}

export type CreateCommunityPostInput = Omit<
  CommunityMealPost,
  "id" | "likes" | "liked" | "comments" | "bookmarked" | "createdAt" | "vote"
> & {
  vote?: CommunityPostVoteCreate | null
}

export interface ICommunityPostService {
  getPosts(): Promise<CommunityMealPost[]>
  getPost(id: string): Promise<CommunityMealPost | undefined>
  createPost(post: CreateCommunityPostInput): Promise<CommunityMealPost>
  updatePost(
    id: string,
    post: {
      category?: string
      title?: string
      description?: string
      imageUri?: string | null
    },
  ): Promise<CommunityMealPost>
  deletePost(id: string): Promise<void>
  toggleLike(postId: string): Promise<void>
  toggleBookmark(postId: string): Promise<void>
  castVote(postId: string, optionIds: number[]): Promise<CommunityPostVote>
  reportPost(
    postId: string,
    reason: string,
    description?: string,
  ): Promise<void>
}

export interface PostCategory {
  key: string
  label: string
}

// ── Block Editor Types ──

export type ContentBlock =
  | { type: "text"; content: string }
  | {
      type: "image"
      localUri: string
      imageUrl?: string
      isUploading?: boolean
      uploadFailed?: boolean
    }

export interface CreateRecipeRequest {
  title: string
  summary: string
  authorInfo?: string
  nutritionTags: string[]
  stageTags: string[]
  cuisineTags: string[]
  description: ContentBlock[]
  ingredients: ContentBlock[]
  cookingSteps: ContentBlock[]
}

// ── Recipe Post (in-memory) ──

export interface RecipePost {
  id: string
  authorName: string
  authorInfo?: string
  title: string
  summary: string
  imageUri: string | null
  nutritionTags: string[]
  stageTags: string[]
  cuisineTags: string[]
  description: ContentBlock[]
  ingredients: ContentBlock[]
  cookingSteps: ContentBlock[]
  likes: number
  liked: boolean
  comments: number
  bookmarked: boolean
  createdAt: Date
}

export interface RecipePostFilters {
  nutritionTags?: string[]
  stageTags?: string[]
  cuisineTags?: string[]
}

export interface IRecipePostService {
  getPosts(): RecipePost[]
  getPost(id: string): RecipePost | undefined
  createPost(req: CreateRecipeRequest): RecipePost
  toggleLike(postId: string): void
  toggleBookmark(postId: string): void
  searchPosts(query: string): RecipePost[]
  filterPosts(filters: RecipePostFilters): RecipePost[]
}
