import { useCallback, useState } from "react"
import { ScrollView, useColorScheme } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { FilterChip } from "./FilterChip"
import { PopularPostCard } from "./PopularPostCard"
import { PostListItem } from "./PostListItem"

const FREE_POST_CATEGORIES = [
  { key: "diet", label: "식단" },
  { key: "numbers", label: "수치 변화" },
  { key: "symptoms", label: "증상 상담" },
  { key: "medicine", label: "약물" },
  { key: "dining-out", label: "외식 후기" },
  { key: "daily", label: "일상 공감" },
] as const

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
    title: "칼륨 수치가 올라갔는데 어떤 음식 때문...",
    summary:
      "오늘 아침까지만 해도 칼륨 수치가 괜찮았었는데.. 저녁때 보니까 수치가 확 올라갔더라구요? 왜일까요.. 제가 먹은건..",
    viewCount: 6,
    likeCount: 32,
    commentCount: 24,
  },
  {
    id: "2",
    category: "식단",
    title: "칼륨 수치가 올라갔는데 어떤 음식 때문...",
    summary:
      "오늘 아침까지만 해도 칼륨 수치가 괜찮았었는데.. 저녁때 보니까 수치가 확 올라갔더라구요? 왜일까요.. 제가 먹은건..",
    viewCount: 6,
    likeCount: 32,
    commentCount: 24,
  },
  {
    id: "3",
    category: "식단",
    title: "칼륨 수치가 올라갔는데 어떤 음식 때문...",
    summary:
      "오늘 아침까지만 해도 칼륨 수치가 괜찮았었는데.. 저녁때 보니까 수치가 확 올라갔더라구요? 왜일까요.. 제가 먹은건..",
    viewCount: 6,
    likeCount: 32,
    commentCount: 24,
  },
]

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
    setSelectedCategory(key)
  }, [])

  const selectedLabel =
    FREE_POST_CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? ""

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* 전체 인기글 섹션 */}
      <YStack paddingHorizontal={16} paddingTop={16} paddingBottom={8} gap={12}>
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
      <YStack paddingHorizontal={16} paddingTop={20} gap={16}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {FREE_POST_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat.key}
              label={cat.label}
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
