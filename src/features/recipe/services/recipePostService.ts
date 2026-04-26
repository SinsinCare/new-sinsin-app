import type {
  RecipePost,
  RecipePostFilters,
  CreateRecipeRequest,
  IRecipePostService,
  ContentBlock,
} from "../types"

let nextId = 1

function makeId(): string {
  return `recipe_${nextId++}`
}

function extractTextFromBlocks(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is { type: "text"; content: string } => b.type === "text")
    .map((b) => b.content)
    .join(" ")
}

const SEED_RECIPES: RecipePost[] = [
  {
    id: makeId(),
    authorName: "김민지",
    authorInfo: "CKD 3기",
    title: "저염 된장찌개",
    summary: "나트륨을 줄인 된장찌개로 건강한 한 끼를 즐겨보세요.",
    imageUri: "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=2671&auto=format&fit=crop",
    nutritionTags: ["저염"],
    stageTags: ["CKD 3기"],
    cuisineTags: ["한식"],
    description: [
      {
        type: "text",
        content:
          "일반 된장찌개 대비 나트륨 50% 감소 레시피입니다. 된장 양을 줄이고 다시마 육수로 감칠맛을 보완했어요.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "된장 1큰술\n두부 1/2모\n애호박 1/3개\n양파 1/4개\n대파 1대\n다시마 육수 400ml\n고추 1개",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 다시마 육수를 끓입니다.\n2. 된장 1큰술을 풀어줍니다.\n3. 두부, 애호박, 양파를 넣고 끓입니다.\n4. 대파와 고추를 넣고 2분 더 끓입니다.",
      },
    ],
    likes: 245,
    liked: false,
    comments: 18,
    bookmarked: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "이수현",
    authorInfo: "임상영양사",
    title: "저단백 계란찜",
    summary: "단백질 섭취를 조절하면서도 맛있게 먹을 수 있는 계란찜.",
    imageUri: "https://images.unsplash.com/photo-1621213176339-d7202cl69968?q=80&w=2576&auto=format&fit=crop",
    nutritionTags: ["저단백"],
    stageTags: ["CKD 4기"],
    cuisineTags: ["한식"],
    description: [
      {
        type: "text",
        content:
          "계란 1개만 사용하고 두부와 채소를 넣어 볼륨감을 살린 저단백 계란찜입니다. CKD 4기 이상 환자분들께 추천합니다.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "계란 1개\n연두부 50g\n당근 약간\n대파 약간\n물 100ml\n참기름 약간",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 계란 1개를 풀어줍니다.\n2. 연두부를 으깨서 섞습니다.\n3. 물 100ml를 넣고 잘 저어줍니다.\n4. 다진 당근과 대파를 넣습니다.\n5. 중불에서 10분간 쪄줍니다.",
      },
    ],
    likes: 189,
    liked: true,
    comments: 22,
    bookmarked: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "박준호",
    authorInfo: "요리전문가",
    title: "저칼륨 닭가슴살 샐러드",
    summary: "칼륨을 줄인 가벼운 샐러드로 점심 한 끼를 해결하세요.",
    imageUri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2680&auto=format&fit=crop",
    nutritionTags: ["저칼륨"],
    stageTags: ["CKD 3기", "CKD 4기"],
    cuisineTags: ["샐러드"],
    description: [
      {
        type: "text",
        content:
          "칼륨이 낮은 채소 위주로 구성한 닭가슴살 샐러드입니다. 상추, 양배추 등 저칼륨 채소를 활용했어요.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "닭가슴살 80g\n양상추 한 줌\n양배추 30g\n당근 약간\n올리브유 1큰술\n레몬즙 1작은술",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 닭가슴살을 삶아서 찢어줍니다.\n2. 양상추, 양배추를 씻어 한입 크기로 자릅니다.\n3. 당근을 채 썰어줍니다.\n4. 올리브유와 레몬즙으로 드레싱을 만들어 뿌려줍니다.",
      },
    ],
    likes: 312,
    liked: false,
    comments: 15,
    bookmarked: false,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "최예진",
    authorInfo: "CKD 5기 투석중",
    title: "저인 두부스테이크",
    summary: "인 함량을 줄인 두부스테이크로 든든한 저녁식사를.",
    imageUri: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=2574&auto=format&fit=crop",
    nutritionTags: ["저인"],
    stageTags: ["CKD 5기"],
    cuisineTags: ["한식"],
    description: [
      {
        type: "text",
        content:
          "인 함량이 높은 치즈 대신 허브로 풍미를 낸 두부스테이크입니다. 투석 중인 분들도 안심하고 드실 수 있어요.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "두부 1모\n올리브유 2큰술\n마늘 2쪽\n로즈마리 약간\n후추 약간\n간장 1작은술(저염)",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 두부를 두껍게 썰어 물기를 빼줍니다.\n2. 올리브유에 마늘과 로즈마리를 넣고 향을 냅니다.\n3. 두부를 앞뒤로 노릇하게 구워줍니다.\n4. 저염 간장으로 살짝 간합니다.",
      },
    ],
    likes: 167,
    liked: false,
    comments: 9,
    bookmarked: false,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "한지원",
    authorInfo: "CKD 3기, 당뇨동반",
    title: "고열량 저단백 볶음밥",
    summary: "열량은 높이고 단백질은 줄인 특별한 볶음밥 레시피.",
    imageUri: "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=2672&auto=format&fit=crop",
    nutritionTags: ["고열량", "저단백"],
    stageTags: ["CKD 3기", "당뇨동반"],
    cuisineTags: ["중식"],
    description: [
      {
        type: "text",
        content:
          "단백질 대신 기름과 채소로 열량을 보충한 볶음밥입니다. 당뇨를 동반한 CKD 환자분들의 열량 보충에 도움이 됩니다.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "밥 1공기\n식용유 2큰술\n당근 1/4개\n양배추 30g\n대파 1대\n참기름 1작은술\n저염 간장 1작은술",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 채소를 잘게 다져줍니다.\n2. 팬에 기름을 넉넉히 두르고 채소를 볶습니다.\n3. 밥을 넣고 센불에서 볶아줍니다.\n4. 저염 간장과 참기름으로 간합니다.",
      },
    ],
    likes: 98,
    liked: false,
    comments: 7,
    bookmarked: false,
    createdAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "정수영",
    authorInfo: "CKD 4기",
    title: "저염 미소시루",
    summary: "나트륨을 줄인 일본식 미소시루로 따뜻한 한 끼를.",
    imageUri: "https://images.unsplash.com/photo-1582819509237-45b754223abd?q=80&w=2574&auto=format&fit=crop",
    nutritionTags: ["저염"],
    stageTags: ["CKD 4기"],
    cuisineTags: ["일식"],
    description: [
      {
        type: "text",
        content:
          "미소(된장) 양을 줄이고 가쓰오부시 육수로 깊은 맛을 낸 미소시루입니다. 일반 대비 나트륨 40% 감소.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "미소 1작은술\n두부 50g\n미역 약간\n가쓰오부시 5g\n물 300ml\n대파 약간",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 물에 가쓰오부시를 넣어 육수를 우려냅니다.\n2. 두부를 작게 깍둑썰기합니다.\n3. 육수에 두부와 미역을 넣고 끓입니다.\n4. 불을 끄고 미소를 풀어줍니다.\n5. 대파를 올려 완성합니다.",
      },
    ],
    likes: 134,
    liked: false,
    comments: 11,
    bookmarked: true,
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "오민석",
    authorInfo: "CKD 3기, 고혈압동반",
    title: "저염 파스타 아라비아타",
    summary: "소금 없이 토마토와 허브로 맛을 낸 건강 파스타.",
    imageUri: "https://images.unsplash.com/photo-1563379091339-03b21ef4a4f8?q=80&w=2574&auto=format&fit=crop",
    nutritionTags: ["저염", "저칼륨"],
    stageTags: ["CKD 3기", "고혈압동반"],
    cuisineTags: ["양식"],
    description: [
      {
        type: "text",
        content:
          "소금 대신 마늘, 바질, 올리브유로 풍미를 살린 아라비아타 파스타입니다. 고혈압을 동반한 CKD 환자분들께 추천합니다.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "파스타면 80g\n토마토 소스 100ml (무염)\n마늘 3쪽\n올리브유 2큰술\n바질 약간\n페퍼론치노 1개",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 파스타면을 소금 없이 삶아줍니다.\n2. 올리브유에 마늘과 페퍼론치노를 볶습니다.\n3. 무염 토마토소스를 넣고 끓입니다.\n4. 삶은 면을 넣고 볶아줍니다.\n5. 바질을 올려 완성합니다.",
      },
    ],
    likes: 276,
    liked: false,
    comments: 20,
    bookmarked: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "윤하은",
    authorInfo: "임상영양사",
    title: "저인 과일 디저트",
    summary: "인 함량이 낮은 과일로 만든 가벼운 디저트.",
    imageUri: "https://images.unsplash.com/photo-1490818387583-1baba5e6382b?q=80&w=2574&auto=format&fit=crop",
    nutritionTags: ["저인"],
    stageTags: ["CKD 4기", "CKD 5기"],
    cuisineTags: ["디저트"],
    description: [
      {
        type: "text",
        content:
          "인 함량이 낮은 사과, 배, 포도를 활용한 과일 디저트입니다. 유제품 없이 만들어 인 부담을 줄였어요.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "사과 1/2개\n배 1/4개\n포도 10알\n꿀 1작은술\n레몬즙 약간\n민트잎 약간",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 과일을 깨끗이 씻어 한입 크기로 자릅니다.\n2. 꿀과 레몬즙을 섞어 드레싱을 만듭니다.\n3. 과일에 드레싱을 뿌려줍니다.\n4. 민트잎으로 장식합니다.",
      },
    ],
    likes: 89,
    liked: false,
    comments: 5,
    bookmarked: false,
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "강서연",
    authorInfo: "CKD 3기",
    title: "저칼륨 허브티 레시피",
    summary: "칼륨이 낮은 허브로 만든 건강 음료.",
    imageUri: "https://images.unsplash.com/photo-1594631252845-29fc4586d517?q=80&w=2574&auto=format&fit=crop",
    nutritionTags: ["저칼륨"],
    stageTags: ["CKD 3기"],
    cuisineTags: ["음료"],
    description: [
      {
        type: "text",
        content:
          "칼륨이 높은 녹차 대신, 칼륨이 낮은 페퍼민트와 캐모마일을 블렌딩한 허브티입니다.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "페퍼민트 티백 1개\n캐모마일 티백 1개\n뜨거운 물 300ml\n꿀 1작은술 (선택)",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 컵에 티백 2개를 넣습니다.\n2. 뜨거운 물을 부어줍니다.\n3. 3-5분간 우려냅니다.\n4. 기호에 따라 꿀을 넣어줍니다.",
      },
    ],
    likes: 67,
    liked: false,
    comments: 3,
    bookmarked: false,
    createdAt: new Date(Date.now() - 32 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "박소미",
    authorInfo: "CKD 4기, 당뇨동반",
    title: "저염 저단백 일본식 우동",
    summary: "나트륨과 단백질을 줄인 건강한 우동 레시피.",
    imageUri: "https://images.unsplash.com/photo-1558985250-27a406d64cb3?q=80&w=2670&auto=format&fit=crop",
    nutritionTags: ["저염", "저단백"],
    stageTags: ["CKD 4기", "당뇨동반"],
    cuisineTags: ["일식"],
    description: [
      {
        type: "text",
        content:
          "저단백 우동면을 사용하고 소금 없이 다시마·멸치 육수로 맛을 낸 우동입니다. 당뇨를 동반한 CKD 4기 환자분들의 식단에 적합합니다.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "저단백 우동면 1인분\n다시마 5cm\n멸치 5마리\n무 50g\n대파 1대\n저염 간장 1작은술\n물 500ml",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 다시마와 멸치로 육수를 만듭니다.\n2. 무를 얇게 썰어 육수에 넣고 끓입니다.\n3. 저단백 우동면을 따로 삶아줍니다.\n4. 육수에 면을 넣고 대파를 올립니다.\n5. 저염 간장으로 살짝 간합니다.",
      },
    ],
    likes: 156,
    liked: false,
    comments: 13,
    bookmarked: false,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "이도현",
    authorInfo: "CKD 5기",
    title: "고열량 저칼륨 떡볶이",
    summary: "칼륨을 줄이고 열량을 높인 특별한 떡볶이.",
    imageUri: "https://images.unsplash.com/photo-1493770348161-369560ae357d?q=80&w=2670&auto=format&fit=crop",
    nutritionTags: ["고열량", "저칼륨"],
    stageTags: ["CKD 5기"],
    cuisineTags: ["한식"],
    description: [
      {
        type: "text",
        content:
          "고추장 대신 설탕과 물엿으로 맛을 낸 떡볶이입니다. 칼륨이 높은 고추장을 최소화하고 열량을 보충했어요.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "떡 150g\n어묵 50g\n양배추 30g\n물엿 2큰술\n설탕 1큰술\n고추장 1/2작은술\n물 200ml",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 물에 물엿, 설탕, 고추장을 넣고 끓입니다.\n2. 떡을 넣고 부드러워질 때까지 끓입니다.\n3. 어묵과 양배추를 넣고 2분 더 끓입니다.\n4. 불을 줄이고 소스가 걸쭉해지면 완성입니다.",
      },
    ],
    likes: 203,
    liked: true,
    comments: 16,
    bookmarked: false,
    createdAt: new Date(Date.now() - 40 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "김태호",
    authorInfo: "CKD 3기, 고혈압동반",
    title: "무염 감자 크로켓",
    summary: "소금 없이 만든 바삭한 감자 크로켓.",
    imageUri: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=2670&auto=format&fit=crop",
    nutritionTags: ["저염"],
    stageTags: ["CKD 3기", "고혈압동반"],
    cuisineTags: ["양식"],
    description: [
      {
        type: "text",
        content:
          "감자를 물에 충분히 담가 칼륨을 제거한 뒤, 소금 없이 허브와 후추로만 맛을 낸 크로켓입니다.",
      },
    ],
    ingredients: [
      {
        type: "text",
        content:
          "감자 2개 (물에 2시간 담금)\n양파 1/4개\n후추 약간\n파슬리 약간\n빵가루 적당량\n계란 1개\n식용유 적당량",
      },
    ],
    cookingSteps: [
      {
        type: "text",
        content:
          "1. 감자를 껍질 벗기고 얇게 썰어 2시간 물에 담급니다.\n2. 감자를 삶아 으깹니다.\n3. 다진 양파, 후추, 파슬리를 섞어줍니다.\n4. 동그랗게 빚어 계란물, 빵가루 순으로 입힙니다.\n5. 170도 기름에 노릇하게 튀겨냅니다.",
      },
    ],
    likes: 178,
    liked: false,
    comments: 14,
    bookmarked: true,
    createdAt: new Date(Date.now() - 44 * 60 * 60 * 1000),
  },
]

class RecipePostService implements IRecipePostService {
  private posts: RecipePost[] = [...SEED_RECIPES]

  getPosts(): RecipePost[] {
    return [...this.posts].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }

  getPost(id: string): RecipePost | undefined {
    return this.posts.find((p) => p.id === id)
  }

  createPost(req: CreateRecipeRequest): RecipePost {
    const firstImage = [
      ...req.description,
      ...req.ingredients,
      ...req.cookingSteps,
    ].find((b) => b.type === "image")

    const newPost: RecipePost = {
      id: makeId(),
      authorName: "나",
      authorInfo: req.authorInfo,
      title: req.title,
      summary: req.summary,
      imageUri:
        firstImage && firstImage.type === "image" ? firstImage.localUri : null,
      nutritionTags: req.nutritionTags,
      stageTags: req.stageTags,
      cuisineTags: req.cuisineTags,
      description: req.description,
      ingredients: req.ingredients,
      cookingSteps: req.cookingSteps,
      likes: 0,
      liked: false,
      comments: 0,
      bookmarked: false,
      createdAt: new Date(),
    }
    this.posts.push(newPost)
    return newPost
  }

  toggleLike(postId: string): void {
    const post = this.posts.find((p) => p.id === postId)
    if (post) {
      post.liked = !post.liked
      post.likes += post.liked ? 1 : -1
    }
  }

  toggleBookmark(postId: string): void {
    const post = this.posts.find((p) => p.id === postId)
    if (post) {
      post.bookmarked = !post.bookmarked
    }
  }

  searchPosts(query: string): RecipePost[] {
    if (!query.trim()) return this.getPosts()

    const q = query.toLowerCase()
    return this.getPosts().filter((post) => {
      if (post.title.toLowerCase().includes(q)) return true
      if (post.summary.toLowerCase().includes(q)) return true

      const allTags = [
        ...post.nutritionTags,
        ...post.stageTags,
        ...post.cuisineTags,
      ]
      if (allTags.some((tag) => tag.toLowerCase().includes(q))) return true

      const descText = extractTextFromBlocks(post.description)
      const ingredText = extractTextFromBlocks(post.ingredients)
      const stepsText = extractTextFromBlocks(post.cookingSteps)
      const allText = `${descText} ${ingredText} ${stepsText}`.toLowerCase()
      if (allText.includes(q)) return true

      return false
    })
  }

  filterPosts(filters: RecipePostFilters): RecipePost[] {
    return this.getPosts().filter((post) => {
      if (
        filters.nutritionTags?.length &&
        !filters.nutritionTags.some((t) => post.nutritionTags.includes(t))
      )
        return false
      if (
        filters.stageTags?.length &&
        !filters.stageTags.some((t) => post.stageTags.includes(t))
      )
        return false
      if (
        filters.cuisineTags?.length &&
        !filters.cuisineTags.some((t) => post.cuisineTags.includes(t))
      )
        return false
      return true
    })
  }
}

export const recipePostService = new RecipePostService()
