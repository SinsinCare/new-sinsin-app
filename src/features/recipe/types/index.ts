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
  /** 투표 질문(선택). */
  title?: string | null
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
  /** 투표 질문(선택). */
  title: string | null
  allowMultiple: boolean
  options: CommunityPostVoteOption[]
  totalCount: number
  myVote: number[] | null
}

export interface CommunityCommentApi {
  id: string | number
  postId: string | number
  parentCommentId?: string | number | null
  authorId?: number | null
  authorName: string
  content: string
  mentions?: string[] | null
  likes: number
  liked: boolean
  isDeleted: boolean
  createdAt: string | number | Date
  updatedAt?: string | number | Date
  replies?: CommunityCommentApi[]
}

export interface CommunityComment {
  id: string
  postId: string
  parentCommentId: string | null
  authorId?: number | null
  authorName: string
  content: string
  /** 본문의 '@닉네임' 중 서버가 실제 참여자로 확인한 것만. */
  mentions: string[]
  likes: number
  liked: boolean
  isDeleted: boolean
  createdAt: Date
  updatedAt?: Date
  replies: CommunityComment[]
}

/** Backend / API payload before mapping to {@link CommunityMealPost}. */
export interface CommunityMealPostApi {
  id: string | number
  authorId?: number | null
  authorName: string
  authorRole: string
  category: string
  imageUri?: string | null
  imageUris?: string[] | null
  imageObjectPaths?: string[] | null
  title: string
  description: string
  likes: number
  liked: boolean
  comments: number
  bookmarked: boolean
  createdAt: string | number | Date
  updatedAt?: string | number | Date
  tags?: string[] | null
  vote?: CommunityPostVote | null
}

export interface CommunityMealPost {
  id: string
  authorId?: number | null
  authorName: string
  authorRole: string
  category: string
  /** 첫 이미지(하위호환). 렌더는 imageUris 를 쓴다. */
  imageUri: string | null
  imageUris: string[]
  /** 수정 시 이미지 세트를 되돌려 보내기 위한 저장 경로. */
  imageObjectPaths: string[]
  title: string
  description: string
  likes: number
  liked: boolean
  comments: number
  bookmarked: boolean
  createdAt: Date
  updatedAt?: Date
  tags: string[]
  vote: CommunityPostVote | null
}

export type CreateCommunityPostInput = Omit<
  CommunityMealPost,
  | "id"
  | "likes"
  | "liked"
  | "comments"
  | "bookmarked"
  | "createdAt"
  | "tags"
  | "vote"
  | "imageUris"
  | "imageObjectPaths"
> & {
  imageObjectPath?: string | null
  imageObjectPaths?: string[]
  tags?: string[]
  vote?: CommunityPostVoteCreate | null
}

export interface ICommunityPostService {
  getPosts(params?: { tag?: string | null }): Promise<CommunityMealPost[]>
  getPost(id: string): Promise<CommunityMealPost | undefined>
  createPost(post: CreateCommunityPostInput): Promise<CommunityMealPost>
  updatePost(
    id: string,
    post: {
      category?: string
      title?: string
      description?: string
      imageUri?: string | null
      imageObjectPaths?: string[]
      tags?: string[]
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
  getComments(postId: string): Promise<CommunityComment[]>
  createComment(
    postId: string,
    content: string,
    parentCommentId?: string | null,
    mentions?: string[],
  ): Promise<CommunityComment>
  updateComment(
    postId: string,
    commentId: string,
    content: string,
    mentions?: string[],
  ): Promise<CommunityComment>
  deleteComment(postId: string, commentId: string): Promise<void>
  toggleCommentLike(postId: string, commentId: string): Promise<void>
  reportComment(
    postId: string,
    commentId: string,
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
