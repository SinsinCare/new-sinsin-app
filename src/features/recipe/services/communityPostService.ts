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
    imageUri: null,
    title: "신장 친화 호박죽",
    description:
      "칼륨이 적은 호박으로 만든 따뜻한 죽입니다. 크림 대신 물을 넣어서 인 부담도 줄였어요.",
    likes: 432,
    comments: 12,
    bookmarked: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "이수현",
    authorRole: "임상영양사",
    imageUri: null,
    title: "감자 칼륨 줄이는 팁",
    description:
      "감자를 좋아하지만 칼륨이 걱정된다면, 껍질을 벗기고 얇게 썬 감자를 따뜻한 물에 2시간 이상 담가두세요. 칼륨을 최대 50%까지 줄일 수 있습니다!",
    likes: 856,
    comments: 34,
    bookmarked: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: makeId(),
    authorName: "박준호",
    authorRole: "요리전문가",
    imageUri: null,
    title: "저염 콜리플라워 스테이크",
    description:
      "나트륨이 적은 저녁 대안이 필요할 때 딱 좋은 허브 콜리플라워 스테이크 레시피입니다.",
    likes: 1200,
    comments: 48,
    bookmarked: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
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
      "id" | "likes" | "comments" | "bookmarked" | "createdAt"
    >,
  ): CommunityMealPost {
    const newPost: CommunityMealPost = {
      ...post,
      id: makeId(),
      likes: 0,
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
      post.likes = post.likes > 0 ? post.likes - 1 : post.likes + 1
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
