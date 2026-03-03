import { useCallback, useState } from "react"
import { ScrollView, useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"
import { FilterChip } from "./FilterChip"
import { PopularPostCard } from "./PopularPostCard"
import { PostListItem } from "./PostListItem"
import { FREE_POST_CATEGORIES } from "../data/freePostCategories"

interface FreePost {
  id: string
  category: string
  title: string
  summary: string
  viewCount: number
  likeCount: number
  commentCount: number
}

const MOCK_POPULAR_POSTS: FreePost[] = [
  {
    id: "p1",
    category: "식단",
    title: "칼륨 수치가 올라갔는데 어떤 음식 때문인 걸까요?",
    summary: "오늘 아침까지만 해도 칼륨 수치가 괜찮았었는..",
    viewCount: 6,
    likeCount: 32,
    commentCount: 24,
  },
  {
    id: "p2",
    category: "수치 변화",
    title: "칼륨 수치가 올라갔는데 어떤 음식 때문인 걸까요?",
    summary: "오늘 아침까지만 해도 칼륨 수치가 괜찮았었는..",
    viewCount: 6,
    likeCount: 32,
    commentCount: 24,
  },
  {
    id: "p3",
    category: "증상 상담",
    title: "투석 후 어지러움이 계속되는데 괜찮을까요?",
    summary: "지난주 투석 받고 나서 계속 어지러움이..",
    viewCount: 12,
    likeCount: 45,
    commentCount: 18,
  },
]

const MOCK_POSTS: FreePost[] = [
  {
    id: "1",
    category: "식단",
    title: "칼륨 수치가 올라갔는데 어떤 음식 때문일까요?",
    summary:
      "오늘 아침까지는 괜찮았는데 저녁 수치가 올라서 걱정이에요. 어떤 음식이 문제였을까요?",
    viewCount: 6,
    likeCount: 32,
    commentCount: 24,
  },
  {
    id: "2",
    category: "수치 변화",
    title: "전해질 수치 변화 경험 공유해요",
    summary: "최근 혈액 검사에서 전해질 수치가 달라졌어요. 다들 어떤가요?",
    viewCount: 15,
    likeCount: 18,
    commentCount: 9,
  },
  {
    id: "3",
    category: "증상 상담",
    title: "투석 후 어지러움, 괜찮나요?",
    summary: "투석 받고난 뒤 어지럼증이 계속돼요. 비슷한 경험 있으신가요?",
    viewCount: 13,
    likeCount: 11,
    commentCount: 6,
  },
  {
    id: "4",
    category: "약물",
    title: "신장약 복용 시간",
    summary:
      "신장약은 공복에 먹어야 하나요? 저녁에 먹으면 효과가 다르신 분 계신가요?",
    viewCount: 9,
    likeCount: 12,
    commentCount: 5,
  },
  {
    id: "5",
    category: "외식 후기",
    title: "외식할 때 추천 레스토랑 있어요?",
    summary: "저염식 가능한 식당 추천 부탁드립니다!",
    viewCount: 21,
    likeCount: 19,
    commentCount: 7,
  },
  {
    id: "6",
    category: "일상 공감",
    title: "병원 갈 때마다 긴장돼요",
    summary: "정기 검진 갈 때마다 떨리네요. 다들 공감하시나요?",
    viewCount: 18,
    likeCount: 27,
    commentCount: 20,
  },
  {
    id: "7",
    category: "식단",
    title: "저염 김치 직접 만들어봤어요",
    summary: "집에서 저염 김치를 만들어 먹었는데 생각보다 쉽고 맛있어요!",
    viewCount: 7,
    likeCount: 25,
    commentCount: 3,
  },
  {
    id: "8",
    category: "수치 변화",
    title: "단백질 수치 관리 비법 공유",
    summary: "단백질 수치 어떻게 관리하시나요? 노하우 듣고 싶어요.",
    viewCount: 20,
    likeCount: 14,
    commentCount: 10,
  },
  {
    id: "9",
    category: "약물",
    title: "칼륨 조절 약 복용 팁",
    summary: "칼륨 조절 약을 효과적으로 복용하는 방법 있을까요?",
    viewCount: 5,
    likeCount: 8,
    commentCount: 2,
  },
  {
    id: "10",
    category: "증상 상담",
    title: "몸이 자주 붓는데 어떡하죠?",
    summary: "최근에 손발이 부어 고민이에요. 이유 아시는 분?",
    viewCount: 23,
    likeCount: 33,
    commentCount: 15,
  },
  {
    id: "11",
    category: "외식 후기",
    title: "샐러드바 최고의 메뉴 추천",
    summary: "샐러드바에서 저염으로 먹는 메뉴 추천해요!",
    viewCount: 11,
    likeCount: 9,
    commentCount: 1,
  },
  {
    id: "12",
    category: "일상 공감",
    title: "운동 꾸준히 하시나요?",
    summary: "CKD에도 도움이 된다고 해서 운동을 시작했어요.",
    viewCount: 14,
    likeCount: 22,
    commentCount: 8,
  },
  {
    id: "13",
    category: "약물",
    title: "약 부작용이 걱정돼요",
    summary: "새 약을 먹고 나서 속이 좀 쓰려요. 이런 분 계신가요?",
    viewCount: 8,
    likeCount: 6,
    commentCount: 2,
  },
  {
    id: "14",
    category: "일상 공감",
    title: "오늘 하루도 화이팅입니다",
    summary: "모두 건강관리 열심히 하고 계시죠? 힘냅시다!",
    viewCount: 25,
    likeCount: 40,
    commentCount: 18,
  },
  {
    id: "15",
    category: "증상 상담",
    title: "밤에 잘 때 근육경련...",
    summary: "자다가 종종 쥐가 나요. 어떻게 관리하시나요?",
    viewCount: 13,
    likeCount: 9,
    commentCount: 6,
  },
  {
    id: "16",
    category: "식단",
    title: "저칼륨 레시피 공유합니다",
    summary: "칼륨 낮은 식재료로 만든 반찬 소개할게요.",
    viewCount: 20,
    likeCount: 16,
    commentCount: 7,
  },
  {
    id: "17",
    category: "외식 후기",
    title: "뷔페에서 건강하게 먹는 방법",
    summary: "뷔페에서도 건강관리 어떻게 하시나요?",
    viewCount: 12,
    likeCount: 10,
    commentCount: 3,
  },
  {
    id: "18",
    category: "수치 변화",
    title: "최근 체중 변화 있으신가요?",
    summary: "약 복용 후 체중이 조금 줄었어요. 비슷한 분?",
    viewCount: 17,
    likeCount: 13,
    commentCount: 4,
  },
  {
    id: "19",
    category: "식단",
    title: "외식 시 조심해야 할 음식",
    summary: "외식할 때 피해야 하는 음식이 궁금해요.",
    viewCount: 16,
    likeCount: 12,
    commentCount: 7,
  },
  {
    id: "20",
    category: "일상 공감",
    title: "주변인의 응원에 감사해요",
    summary: "가끔 힘들지만 가족, 친구 덕분에 버팁니다!",
    viewCount: 28,
    likeCount: 39,
    commentCount: 22,
  },
]

const POPULAR_POST_SECTION_BG_COLOR = {
  light: "#F1F1F3",
  dark: "#2A2A30",
} as const

const SECTION_TITLE_COLORS = {
  light: "#2A2A37",
  dark: "#E7E7EE",
} as const

const CATEGORY_TITLE_COLORS = {
  light: "#2A2A37",
  dark: "#E7E7EE",
} as const

export function FreePostTab() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const sectionTitleColor = isDark
    ? SECTION_TITLE_COLORS.dark
    : SECTION_TITLE_COLORS.light
  const categoryTitleColor = isDark
    ? CATEGORY_TITLE_COLORS.dark
    : CATEGORY_TITLE_COLORS.light

  const [selectedCategory, setSelectedCategory] = useState(
    FREE_POST_CATEGORIES[0].key,
  )

  const handleCategoryPress = useCallback((key: string) => {
    // TODO: Fix this type error
    setSelectedCategory(key as any)
  }, [])

  const selectedLabel =
    FREE_POST_CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? ""

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* 전체 인기글 섹션 */}
      <YStack
        paddingHorizontal={16}
        paddingVertical={18}
        gap={12}
        backgroundColor={
          POPULAR_POST_SECTION_BG_COLOR[isDark ? "dark" : "light"]
        }
      >
        <Text
          fontSize={18}
          fontWeight="700"
          fontFamily="$body"
          color={sectionTitleColor}
        >
          전체 인기글
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {MOCK_POPULAR_POSTS.map((post) => (
            <PopularPostCard
              key={post.id}
              category={post.category}
              title={post.title}
              summary={post.summary}
              viewCount={post.viewCount}
              likeCount={post.likeCount}
              commentCount={post.commentCount}
              onPress={() => console.log("popular post pressed", post.id)}
            />
          ))}
        </ScrollView>
      </YStack>

      {/* 카테고리 필터 + 글 목록 */}
      <YStack paddingHorizontal={20} paddingTop={20} gap={18}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {FREE_POST_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat.key}
              label={cat.label}
              theme="category"
              selected={selectedCategory === cat.key}
              onPress={() => handleCategoryPress(cat.key)}
            />
          ))}
        </ScrollView>

        <Text
          fontSize={18}
          fontWeight="700"
          fontFamily="$body"
          color={categoryTitleColor}
        >
          {selectedLabel}
        </Text>

        <YStack>
          {MOCK_POSTS.map((post, index) => (
            <PostListItem
              key={post.id}
              title={post.title}
              summary={post.summary}
              viewCount={post.viewCount}
              likeCount={post.likeCount}
              commentCount={post.commentCount}
              showDivider={index < MOCK_POSTS.length - 1}
              onPress={() => console.log("post pressed", post.id)}
            />
          ))}
        </YStack>
      </YStack>
    </ScrollView>
  )
}
