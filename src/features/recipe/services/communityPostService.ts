import { CommunityMealPost, ICommunityPostService } from "../types"

let nextId = 1

function makeId(): string {
  return `post_${nextId++}`
}

const SEED_POSTS: CommunityMealPost[] = [
  {
    id: makeId(),
    authorName: "김민지",
    authorRole: "홈셰프",
    category: "diet",
    imageUri: null,
    title: "신장 친화 호박죽",
    description:
      "칼륨이 적은 호박으로 만든 따뜻한 죽입니다. 크림 대신 물을 넣어서 인 부담도 줄였어요.",
    likes: 432,
    liked: false,
    comments: 12,
    bookmarked: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "이수현",
    authorRole: "임상영양사",
    category: "diet",
    imageUri: null,
    title: "감자 칼륨 줄이는 팁",
    description:
      "감자를 좋아하지만 칼륨이 걱정된다면, 껍질을 벗기고 얇게 썬 감자를 따뜻한 물에 2시간 이상 담가두세요. 칼륨을 최대 50%까지 줄일 수 있습니다!",
    likes: 856,
    liked: false,
    comments: 34,
    bookmarked: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "박준호",
    authorRole: "요리전문가",
    category: "diet",
    imageUri: null,
    title: "저염 콜리플라워 스테이크",
    description:
      "나트륨이 적은 저녁 대안이 필요할 때 딱 좋은 허브 콜리플라워 스테이크 레시피입니다.",
    likes: 1200,
    liked: true,
    comments: 48,
    bookmarked: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "최예진",
    authorRole: "CKD 환자",
    category: "numbers",
    imageUri: null,
    title: "칼륨 수치가 올라갔는데 어떤 음식 때문일까요?",
    description:
      "오늘 아침까지는 괜찮았는데 저녁 수치가 올라서 걱정이에요. 어떤 음식이 문제였을까요?",
    likes: 32,
    liked: false,
    comments: 24,
    bookmarked: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "한지원",
    authorRole: "CKD 환자",
    category: "numbers",
    imageUri: null,
    title: "전해질 수치 변화 경험 공유해요",
    description: "최근 혈액 검사에서 전해질 수치가 달라졌어요. 다들 어떤가요?",
    likes: 18,
    liked: false,
    comments: 9,
    bookmarked: false,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "정수영",
    authorRole: "CKD 환자",
    category: "symptoms",
    imageUri: null,
    title: "투석 후 어지러움, 괜찮나요?",
    description: "투석 받고난 뒤 어지럼증이 계속돼요. 비슷한 경험 있으신가요?",
    likes: 45,
    liked: false,
    comments: 18,
    bookmarked: true,
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "오민석",
    authorRole: "CKD 환자",
    category: "medicine",
    imageUri: null,
    title: "신장약 복용 시간",
    description:
      "신장약은 공복에 먹어야 하나요? 저녁에 먹으면 효과가 다르신 분 계신가요?",
    likes: 12,
    liked: false,
    comments: 5,
    bookmarked: false,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "윤하은",
    authorRole: "CKD 환자",
    category: "dining-out",
    imageUri: null,
    title: "외식할 때 추천 레스토랑 있어요?",
    description: "저염식 가능한 식당 추천 부탁드립니다!",
    likes: 19,
    liked: false,
    comments: 7,
    bookmarked: false,
    createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "강서연",
    authorRole: "CKD 환자",
    category: "daily",
    imageUri: null,
    title: "병원 갈 때마다 긴장돼요",
    description: "정기 검진 갈 때마다 떨리네요. 다들 공감하시나요?",
    likes: 27,
    liked: false,
    comments: 20,
    bookmarked: false,
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "박소미",
    authorRole: "홈셰프",
    category: "diet",
    imageUri: null,
    title: "저염 김치 직접 만들어봤어요",
    description: "집에서 저염 김치를 만들어 먹었는데 생각보다 쉽고 맛있어요!",
    likes: 25,
    liked: false,
    comments: 3,
    bookmarked: false,
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "이도현",
    authorRole: "CKD 환자",
    category: "numbers",
    imageUri: null,
    title: "단백질 수치 관리 비법 공유",
    description: "단백질 수치 어떻게 관리하시나요? 노하우 듣고 싶어요.",
    likes: 14,
    liked: false,
    comments: 10,
    bookmarked: false,
    createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "김태호",
    authorRole: "CKD 환자",
    category: "medicine",
    imageUri: null,
    title: "칼륨 조절 약 복용 팁",
    description: "칼륨 조절 약을 효과적으로 복용하는 방법 있을까요?",
    likes: 8,
    liked: false,
    comments: 2,
    bookmarked: false,
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "서유나",
    authorRole: "CKD 환자",
    category: "symptoms",
    imageUri: null,
    title: "몸이 자주 붓는데 어떡하죠?",
    description: "최근에 손발이 부어 고민이에요. 이유 아시는 분?",
    likes: 33,
    liked: false,
    comments: 15,
    bookmarked: false,
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "장민우",
    authorRole: "CKD 환자",
    category: "dining-out",
    imageUri: null,
    title: "샐러드바 최고의 메뉴 추천",
    description: "샐러드바에서 저염으로 먹는 메뉴 추천해요!",
    likes: 9,
    liked: false,
    comments: 1,
    bookmarked: false,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "문지영",
    authorRole: "CKD 환자",
    category: "daily",
    imageUri: null,
    title: "운동 꾸준히 하시나요?",
    description: "CKD에도 도움이 된다고 해서 운동을 시작했어요.",
    likes: 22,
    liked: false,
    comments: 8,
    bookmarked: false,
    createdAt: new Date(Date.now() - 40 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "배현수",
    authorRole: "CKD 환자",
    category: "medicine",
    imageUri: null,
    title: "약 부작용이 걱정돼요",
    description: "새 약을 먹고 나서 속이 좀 쓰려요. 이런 분 계신가요?",
    likes: 6,
    liked: false,
    comments: 2,
    bookmarked: false,
    createdAt: new Date(Date.now() - 44 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "임수빈",
    authorRole: "CKD 환자",
    category: "daily",
    imageUri: null,
    title: "오늘 하루도 화이팅입니다",
    description: "모두 건강관리 열심히 하고 계시죠? 힘냅시다!",
    likes: 40,
    liked: true,
    comments: 18,
    bookmarked: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "고은채",
    authorRole: "CKD 환자",
    category: "symptoms",
    imageUri: null,
    title: "밤에 잘 때 근육경련...",
    description: "자다가 종종 쥐가 나요. 어떻게 관리하시나요?",
    likes: 9,
    liked: false,
    comments: 6,
    bookmarked: false,
    createdAt: new Date(Date.now() - 52 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "신동혁",
    authorRole: "홈셰프",
    category: "diet",
    imageUri: null,
    title: "저칼륨 레시피 공유합니다",
    description: "칼륨 낮은 식재료로 만든 반찬 소개할게요.",
    likes: 16,
    liked: false,
    comments: 7,
    bookmarked: false,
    createdAt: new Date(Date.now() - 56 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "양미란",
    authorRole: "CKD 환자",
    category: "dining-out",
    imageUri: null,
    title: "뷔페에서 건강하게 먹는 방법",
    description: "뷔페에서도 건강관리 어떻게 하시나요?",
    likes: 10,
    liked: false,
    comments: 3,
    bookmarked: false,
    createdAt: new Date(Date.now() - 60 * 60 * 60 * 1000),
  },
]

class CommunityPostService implements ICommunityPostService {
  private posts: CommunityMealPost[] = [...SEED_POSTS]

  getPosts(): CommunityMealPost[] {
    return [...this.posts].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }

  getPost(id: string): CommunityMealPost | undefined {
    return this.posts.find((p) => p.id === id)
  }

  createPost(
    post: Omit<
      CommunityMealPost,
      "id" | "likes" | "liked" | "comments" | "bookmarked" | "createdAt"
    >,
  ): CommunityMealPost {
    const newPost: CommunityMealPost = {
      ...post,
      id: makeId(),
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
}

export const communityPostService = new CommunityPostService()
