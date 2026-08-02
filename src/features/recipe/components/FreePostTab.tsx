import { useCallback, useMemo, useRef, useState } from "react"
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useAppRouter } from "@/src/shared/navigation"
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { CommunityFeedSkeleton } from "./CommunityFeedSkeleton"
import { PopularPostCard } from "./PopularPostCard"
import { PostListItem } from "./PostListItem"
import { StoryRail } from "./StoryRail"
import { FREE_POST_CATEGORIES } from "../data/freePostCategories"
import { useCommunityPosts } from "../hooks/useCommunityPosts"
import { useBlockedUsers } from "../hooks/useBlockedUsers"
import { useRecentCommunitySearches } from "../hooks/useRecentCommunitySearches"
import { getHotScore, rankPopularPosts } from "../utils/postRanking"
import { useTranslation } from "react-i18next"

interface FreePostTabProps {
  tagFilter?: string | null
  onTagFilterChange?: (tag: string | null) => void
  /** 화면 하단 플로팅 버튼(글쓰기·AI 상담)에 가리지 않을 스크롤 여백. */
  contentBottomPadding?: number
}

const WITHDRAWN_AUTHOR_NAME = "탈퇴한 사용자"

function isWithdrawnAuthor(post: {
  authorId?: number | null
  authorName: string
}) {
  return post.authorId === null || post.authorName === WITHDRAWN_AUTHOR_NAME
}

const POST_CATEGORY_LABEL_KEYS = {
  diet: "category.post.diet",
  numbers: "category.post.numbers",
  symptoms: "category.post.symptoms",
  medicine: "category.post.medicine",
  "dining-out": "category.post.dining-out",
  daily: "category.post.daily",
} as const

export function FreePostTab({
  tagFilter = null,
  onTagFilterChange,
  contentBottomPadding = 88,
}: FreePostTabProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const router = useAppRouter()
  const categoryLabel = useCallback(
    (key: string) => {
      const translationKey =
        POST_CATEGORY_LABEL_KEYS[key as keyof typeof POST_CATEGORY_LABEL_KEYS]
      return translationKey ? t(translationKey) : key
    },
    [t],
  )
  const localizedCategories = useMemo(
    () =>
      FREE_POST_CATEGORIES.map((category) => ({
        key: category.key,
        label: categoryLabel(category.key),
      })),
    [categoryLabel],
  )

  /** null = 전체. */
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<"recent" | "hot">("recent")
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<TextInput>(null)

  const { posts, isLoading, refetch } = useCommunityPosts(tagFilter)
  const { blockedNickNames, blockUser } = useBlockedUsers()
  const { recentSearches, addRecentSearch, clearRecentSearches } =
    useRecentCommunitySearches()

  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (p) => isWithdrawnAuthor(p) || !blockedNickNames.includes(p.authorName),
      ),
    [posts, blockedNickNames],
  )

  const trimmedQuery = searchQuery.trim()
  const isSearching = trimmedQuery.length > 0

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    const q = trimmedQuery.toLowerCase()
    return visiblePosts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        categoryLabel(p.category).includes(trimmedQuery),
    )
  }, [categoryLabel, isSearching, trimmedQuery, visiblePosts])

  /** 좋아요 절대값이 아니라 시간 감쇠 핫 스코어로 "지금" 뜨거운 글을 고른다. */
  const popularPosts = useMemo(
    () => rankPopularPosts(visiblePosts, new Date(), 5),
    [visiblePosts],
  )

  const filteredPosts = useMemo(() => {
    const base = tagFilter
      ? visiblePosts
      : selectedCategory
        ? visiblePosts.filter((p) => p.category === selectedCategory)
        : visiblePosts
    if (sortMode === "recent") return base
    const now = new Date()
    return [...base].sort((a, b) => getHotScore(b, now) - getHotScore(a, now))
  }, [visiblePosts, selectedCategory, tagFilter, sortMode])

  const handleCategoryPress = useCallback(
    (key: string | null) => {
      hapticSelection()
      onTagFilterChange?.(null)
      setSelectedCategory(key)
    },
    [onTagFilterChange],
  )

  const handleTagPress = useCallback(
    (tag: string) => {
      onTagFilterChange?.(tag)
    },
    [onTagFilterChange],
  )

  const handleRefresh = useCallback(async () => {
    if (refreshing) {
      return
    }
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch, refreshing])

  const handleSubmitSearch = useCallback(() => {
    addRecentSearch(searchQuery)
  }, [addRecentSearch, searchQuery])

  const handleRecentPress = useCallback(
    (keyword: string) => {
      setSearchQuery(keyword)
      addRecentSearch(keyword)
    },
    [addRecentSearch],
  )

  const showRecent = searchFocused && !isSearching && recentSearches.length > 0

  const listPosts = isSearching ? searchResults : filteredPosts

  return (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      style={styles.flex}
      contentContainerStyle={{ paddingBottom: contentBottomPadding }}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={surface.textMuted}
          colors={[surface.brand]}
          progressBackgroundColor={surface.isDark ? surface.card : "#FFFFFF"}
        />
      }
    >
      {/* 검색 — 서버 검색 API가 없어 전량 로드된 피드를 클라이언트에서 거른다. */}
      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchField,
            {
              backgroundColor: surface.isDark ? surface.surface : surface.card,
            },
          ]}
        >
          <Ionicons name="search" size={17} color={surface.textWeak} />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onSubmitEditing={handleSubmitSearch}
            placeholder={t("feed.searchPlaceholder")}
            placeholderTextColor={surface.placeholder}
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.searchInput, { color: surface.textStrong }]}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("feed.clearSearch")}
            >
              <Ionicons
                name="close-circle"
                size={17}
                color={surface.textWeak}
              />
            </Pressable>
          )}
        </View>

        {showRecent && (
          <View style={styles.recentWrap}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentLabel, { color: surface.textMuted }]}>
                {t("feed.recentSearches")}
              </Text>
              <Pressable
                onPress={clearRecentSearches}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={[styles.recentClear, { color: surface.textWeak }]}>
                  {t("feed.clearAll")}
                </Text>
              </Pressable>
            </View>
            <View style={styles.recentChips}>
              {recentSearches.map((keyword) => (
                <SurfacePressable
                  key={keyword}
                  onPress={() => handleRecentPress(keyword)}
                  baseColor={surface.isDark ? surface.surface : surface.card}
                  pressScale={0.95}
                  style={styles.recentChip}
                >
                  <Text
                    style={[styles.recentChipText, { color: surface.text }]}
                  >
                    {keyword}
                  </Text>
                </SurfacePressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {isSearching ? (
        <>
          <Text style={[styles.sectionLabel, { color: surface.textMuted }]}>
            {t("feed.results", { count: searchResults.length })}
          </Text>
          <View style={styles.listWrap}>
            {searchResults.map((post) => (
              <PostListItem
                key={post.id}
                category={categoryLabel(post.category)}
                createdAt={post.createdAt}
                title={post.title}
                summary={post.description}
                imageUri={post.imageUri}
                authorName={post.authorName}
                likeCount={post.likes}
                commentCount={post.comments}
                tags={post.tags}
                onPress={() => router.push(`/post/${post.id}`)}
                onPressTag={handleTagPress}
                onBlock={blockUser}
                isWithdrawnAuthor={isWithdrawnAuthor(post)}
              />
            ))}
            {searchResults.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text
                  style={[styles.emptyTitle, { color: surface.textStrong }]}
                >
                  {t("feed.noResultsTitle")}
                </Text>
                <Text style={[styles.emptySub, { color: surface.textMuted }]}>
                  {t("feed.noResultsBody")}
                </Text>
              </View>
            )}
          </View>
        </>
      ) : isLoading && visiblePosts.length === 0 ? (
        // 스토리 · 인기글 · 목록이 한꺼번에 도착하면 화면이 크게 튄다. 세 자리를 미리 잡는다.
        <CommunityFeedSkeleton />
      ) : (
        /*
         * 첫 진입 한 번만 콘텐츠 전체가 부드럽게 올라온다.
         * 카드별 스태거는 필터·정렬 변경 때마다 재생돼 산만해서 걷어냈다.
         */
        <Animated.View
          entering={FadeInDown.duration(280).reduceMotion(ReduceMotion.System)}
        >
          {/* 스토리 — 오늘 하루만 남는 사진들이 맨 위에서 돈다. */}
          <StoryRail />

          {/* 인기글 — 공감을 받은 글만 올라온다. */}
          {popularPosts.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: surface.textMuted }]}>
                {t("feed.popular")}
              </Text>
              <ScrollView
                bounces={false}
                overScrollMode="never"
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularRow}
              >
                {popularPosts.map((post, index) => (
                  <PopularPostCard
                    key={post.id}
                    rank={index + 1}
                    category={categoryLabel(post.category)}
                    title={post.title}
                    imageUri={post.imageUri}
                    likeCount={post.likes}
                    commentCount={post.comments}
                    onPress={() => router.push(`/post/${post.id}`)}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* 카테고리 */}
          <ScrollView
            bounces={false}
            overScrollMode="never"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {tagFilter && (
              <SurfacePressable
                onPress={() => onTagFilterChange?.(null)}
                accessibilityLabel={t("feed.clearTagFilter", {
                  tag: tagFilter,
                })}
                baseColor={surface.isDark ? "#F4F4F6" : "#1D1E20"}
                pressedColor={surface.isDark ? "#DADAE0" : "#34363A"}
                pressScale={0.95}
                style={[styles.chip, styles.tagChipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    styles.chipTextSelected,
                    { color: surface.isDark ? "#17181C" : "#FFFFFF" },
                  ]}
                >
                  #{tagFilter}
                </Text>
                <Ionicons
                  name="close"
                  size={13}
                  color={surface.isDark ? "#17181C" : "#FFFFFF"}
                />
              </SurfacePressable>
            )}
            {[{ key: null as string | null, label: t("feed.all") }]
              .concat(localizedCategories)
              .map((cat) => {
                const selected = !tagFilter && selectedCategory === cat.key
                return (
                  <SurfacePressable
                    key={cat.key ?? "all"}
                    onPress={() => handleCategoryPress(cat.key)}
                    accessibilityState={{ selected }}
                    baseColor={
                      selected
                        ? surface.isDark
                          ? "#F4F4F6"
                          : "#1D1E20"
                        : surface.isDark
                          ? surface.surface
                          : surface.card
                    }
                    pressedColor={
                      selected
                        ? surface.isDark
                          ? "#DADAE0"
                          : "#34363A"
                        : surface.surfacePressed
                    }
                    pressScale={0.95}
                    haptic={false}
                    style={styles.chip}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                        {
                          color: selected
                            ? surface.isDark
                              ? "#17181C"
                              : "#FFFFFF"
                            : surface.text,
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </SurfacePressable>
                )
              })}
          </ScrollView>

          {/* 정렬 — 최신순이 기본, 인기순은 핫스코어. */}
          <View style={styles.sortRow}>
            {(
              [
                { key: "recent", label: t("feed.sortRecent") },
                { key: "hot", label: t("feed.sortPopular") },
              ] as const
            ).map((mode, index) => {
              const selected = sortMode === mode.key
              return (
                <Pressable
                  key={mode.key}
                  onPress={() => {
                    if (selected) return
                    hapticSelection()
                    setSortMode(mode.key)
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.sortItem, index > 0 && styles.sortItemGap]}
                >
                  {selected && (
                    <View
                      style={[
                        styles.sortDot,
                        { backgroundColor: surface.brand },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.sortLabel,
                      selected
                        ? [
                            styles.sortLabelSelected,
                            { color: surface.textStrong },
                          ]
                        : { color: surface.textWeak },
                    ]}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* 글 목록 */}
          <View style={styles.listWrap}>
            {listPosts.map((post) => (
              <PostListItem
                key={post.id}
                category={categoryLabel(post.category)}
                createdAt={post.createdAt}
                title={post.title}
                summary={post.description}
                imageUri={post.imageUri}
                authorName={post.authorName}
                likeCount={post.likes}
                commentCount={post.comments}
                tags={post.tags}
                onPress={() => router.push(`/post/${post.id}`)}
                onPressTag={handleTagPress}
                onBlock={blockUser}
                isWithdrawnAuthor={isWithdrawnAuthor(post)}
              />
            ))}
            {listPosts.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text
                  style={[styles.emptyTitle, { color: surface.textStrong }]}
                >
                  {t("feed.emptyTitle")}
                </Text>
                <Text style={[styles.emptySub, { color: surface.textMuted }]}>
                  {t("feed.emptyBody")}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  searchField: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    // iOS 커스텀 폰트 입력은 프레임 센터링이 포커스 사이클마다 어긋난다.
    // lineHeight(20) + 상하 패딩(12)으로 44 를 채워 기하학으로 고정한다.
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.3,
    fontFamily: "Pretendard-Regular",
    paddingVertical: 12,
  },

  recentWrap: {
    paddingTop: 14,
    gap: 8,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentLabel: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  recentClear: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  recentChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  recentChip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recentChipText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },

  sectionLabel: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },

  popularRow: {
    paddingHorizontal: 20,
    gap: 10,
  },

  chipRow: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 8,
  },
  chip: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tagChipSelected: {
    flexDirection: "row",
    gap: 4,
  },
  chipText: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  chipTextSelected: {
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  sortRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sortItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortItemGap: {
    marginLeft: 12,
  },
  sortDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  sortLabel: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  sortLabelSelected: {
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  listWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontFamily: "Pretendard-Regular",
  },
})
