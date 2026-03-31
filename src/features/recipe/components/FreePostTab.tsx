import { useCallback, useMemo, useState } from "react"
import { ScrollView, useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"
import { useRouter } from "expo-router"
import { FilterChip } from "./FilterChip"
import { PopularPostCard } from "./PopularPostCard"
import { PostListItem } from "./PostListItem"
import { FREE_POST_CATEGORIES } from "../data/freePostCategories"
import { useCommunityPosts } from "../hooks/useCommunityPosts"
import { useBlockedUsers } from "../hooks/useBlockedUsers"

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

  const router = useRouter()
  const { posts } = useCommunityPosts()
  const { blockedNickNames, blockUser } = useBlockedUsers()

  const visiblePosts = useMemo(
    () => posts.filter((p) => !blockedNickNames.includes(p.authorName)),
    [posts, blockedNickNames],
  )

  const popularPosts = useMemo(
    () => [...visiblePosts].sort((a, b) => b.likes - a.likes).slice(0, 3),
    [visiblePosts],
  )

  const filteredPosts = useMemo(
    () => visiblePosts.filter((p) => p.category === selectedCategory),
    [visiblePosts, selectedCategory],
  )

  const handleCategoryPress = useCallback((key: string) => {
    setSelectedCategory(key)
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
          {popularPosts.map((post) => (
            <PopularPostCard
              key={post.id}
              category={
                FREE_POST_CATEGORIES.find((c) => c.key === post.category)
                  ?.label ?? ""
              }
              title={post.title}
              summary={post.description}
              authorName={post.authorName}
              viewCount={post.comments}
              likeCount={post.likes}
              commentCount={post.comments}
              onPress={() => router.push(`/post/${post.id}`)}
              onBlock={blockUser}
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
          {filteredPosts.map((post, index) => (
            <PostListItem
              key={post.id}
              title={post.title}
              summary={post.description}
              authorName={post.authorName}
              viewCount={post.comments}
              likeCount={post.likes}
              commentCount={post.comments}
              showDivider={index < filteredPosts.length - 1}
              onPress={() => router.push(`/post/${post.id}`)}
              onBlock={blockUser}
            />
          ))}
        </YStack>
      </YStack>
    </ScrollView>
  )
}
