/**
 * 커뮤니티 검색 화면 (`app/community/search.tsx` 가 감싼다).
 *
 * 입구는 둘 — 피드의 검색 바(눌러서 진입)와 인기글 화면의 검색 아이콘.
 * 예전에는 피드가 전량 로드된 목록을 클라이언트에서 걸렀지만, 피드가 커서
 * 페이지로 바뀌며 "전량" 이 사라졌다. 검색은 서버(`/community/posts/search`)가 한다.
 *
 * ## 제출 단위로 검색한다 (식당 검색과 같은 결)
 *
 * 글자마다 서버를 두드리지 않는다 — 검색 첫 페이지 요청은 서버 검색 로그에
 * 남는 부작용이 있어(인기 검색어의 원료), 타이핑 중간 문자열로 로그를 오염시키지
 * 않는다. 확정(리턴 키·최근 검색어·인기 검색어 탭)에만 실행하고 그때 최근
 * 검색어에도 기록한다.
 *
 * ## 빈 상태 = 검색을 시작하는 재료 세 가지
 *
 * 최근 검색어(기기에만 저장, 개별·전체 삭제) · 실시간 인기글 상위 5(제목 → 글) ·
 * 인기 검색어(서버 7일 집계, 탭 → 그 검색 실행).
 *
 * 셋이 **다 비면** 그 자리에 조용한 빈 상태 하나가 선다(아래 진입 패널 주석) —
 * 그러지 않으면 검색창 아래가 이유 없는 흰 판이다. 결과가 0인 자리도 같은 컴포넌트를
 * 쓴다: 손으로 그리면 `empty_state_viewed` 가 아무것도 안 나간다(**D15**).
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Text, TextInput } from "@/src/shared/components/AppText"
import { HeaderIconButton } from "@/src/shared/components/HeaderIconButton"
import { FlashList, type FlashListRef } from "@shopify/flash-list"
import Ionicons from "@expo/vector-icons/Ionicons"
import { type Href } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { useAppRouter } from "@/src/shared/navigation"
import { useSurface } from "@/src/hooks/useSurface"
import { singleLineInputText } from "@/src/theme/surface"
import { hapticSelection } from "@/src/lib/haptics"
import { resolveError } from "@/src/lib/errorMessage"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import {
  V2EmptyState,
  V2ErrorState,
  V2LoadingState,
  V2Skeleton,
  V2SkeletonGroup,
  type V2ErrorStateRetry,
} from "@/src/design-system-v2"
import { EndOfListRow } from "../components/EndOfListRow"
import { LoadMoreRow } from "../components/LoadMoreRow"
import { NextPageErrorRow } from "../components/NextPageErrorRow"
import { PostListItem } from "../components/PostListItem"
import {
  useCommunityPostSearch,
  useCommunityPopularKeywords,
} from "../hooks/useCommunityPostSearch"
import { useCommunityPopularPosts } from "../hooks/useCommunityPopularPosts"
import { useRecentCommunitySearches } from "../hooks/useRecentCommunitySearches"
import { isAuthorBlocked, useBlockedUsers } from "../hooks/useBlockedUsers"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { isMyContent, isWithdrawnAuthor } from "../utils/contentOwnership"
import { communityFeedSurfaces } from "../utils/communityFeedSurfaces"

/** 서버 계약(§2): q 는 1..100자. 입력 자체를 100자에서 끊는다. */
const MAX_QUERY_LENGTH = 100

/**
 * `V2EmptyState` 의 액션은 라벨과 콜백이 **함께** 있을 때만 그려진다. 삼항의 두 갈래를
 * 그냥 스프레드하면 옵셔널 프롭이 `string | undefined` 로 넓어져 유니온이 무너지므로
 * 타입을 붙여 둔다(`V2ErrorStateRetry` 와 같은 이유).
 */
type EmptyStateAction =
  | { actionLabel: string; onAction: () => void }
  | { actionLabel?: undefined; onAction?: undefined }

const CATEGORY_LABEL_KEYS = {
  diet: "community.categories.diet",
  numbers: "community.categories.numbers",
  symptoms: "community.categories.symptoms",
  medicine: "community.categories.medicine",
  "dining-out": "community.categories.diningOut",
  daily: "community.categories.daily",
} as const

export function CommunitySearchScreen() {
  const { t } = useTranslation("common")
  /*
    입력칸의 ✕ 문구(`feed.clearSearch`)만 recipe 네임스페이스에 있다 — 레시피
    검색창(`RecipeSearchField`)이 이미 그 열쇠를 쓰고 있어서, 같은 모양의 버튼이
    두 화면에서 다른 말을 하지 않도록 문구를 옮기지 않고 여기서 그 벌을 부른다.
    (`CommunityPopularScreen` 도 같은 방식으로 두 벌을 쥔다.)
  */
  const { t: tRecipe } = useTranslation("recipe")
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const surface = useSurface()

  // 라우트라 열릴 때마다 새로 마운트된다 — 초기값을 useState 초기화로 두는 것이 안전하다.
  const [draft, setDraft] = useState("")
  /** 확정된 검색어. null 이면 빈 상태(최근·인기)를 그린다. */
  const [submitted, setSubmitted] = useState<string | null>(null)

  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useRecentCommunitySearches()
  const { data: popularPosts = [] } = useCommunityPopularPosts(
    "realtime",
    null,
    5,
  )
  const { data: popularKeywords = [] } = useCommunityPopularKeywords(10)

  const search = useCommunityPostSearch(submitted ?? "")
  const { blockedAuthors, blockUser } = useBlockedUsers()
  const { data: myProfile } = useMyPageProfile()
  const myNickName = myProfile?.nickName ?? null

  const commit = useCallback(
    (keyword: string) => {
      const value = keyword.trim()
      if (!value) return
      addRecentSearch(value)
      setDraft(value)
      setSubmitted(value)
    },
    [addRecentSearch],
  )

  const handleChangeText = useCallback((text: string) => {
    setDraft(text)
    // 다 지우면 빈 상태로 돌아간다 — 지운 검색어의 결과가 남아 있으면 거짓말이다.
    if (text.trim().length === 0) setSubmitted(null)
  }, [])

  const categoryLabel = (key: string) => {
    const labelKey =
      CATEGORY_LABEL_KEYS[key as keyof typeof CATEGORY_LABEL_KEYS]
    return labelKey ? t(labelKey) : key
  }

  /*
    서버도 차단 작성자를 거른다(P0 계약 §2). 클라이언트 필터는 차단 직후
    재조회 전의 한 박자를 메운다 — 피드와 같은 규칙.
  */
  const visibleResults = search.posts.filter(
    (p) => isWithdrawnAuthor(p) || !isAuthorBlocked(blockedAuthors, p),
  )

  /**
   * 끝에 닿으면 다음 커서 페이지. **직전 페이지가 실패한 상태면 다시 쏘지 않는다** —
   * 끝에 닿을 때마다 같은 실패를 조용히 반복하던 자리다(피드와 같은 규칙).
   * 재시도는 꼬리의 실패 행에서 사용자가 고른다.
   */
  const handleEndReached = useCallback(() => {
    if (
      search.hasNextPage &&
      !search.isFetchingNextPage &&
      !search.isFetchNextPageError
    ) {
      void search.fetchNextPage()
    }
  }, [search])

  /*
    첫 페이지가 통째로 접힌 경우(결과 20개가 전부 차단한 작성자 글 등) 목록은 비었는데
    다음 커서는 살아 있다. `onEndReached` 는 그릴 줄이 없어 발화하지 않으므로 화면이
    "검색 결과가 없어요" 로 굳는다 — 빈 문구 대신 다음 페이지를 스스로 당긴다.

    **다만 예산이 있다**(`canAutoBackfill`, 검색어당 `MAX_AUTO_BACKFILL_PAGES` 장) —
    상한이 없으면 사람이 끼어들 자리 없이 커서가 끝날 때까지 자동으로 넘어간다.
    다 쓰면 자동 페이징을 멈추고 "더 보기" 를 세운다(피드와 같은 규칙).
  */
  const hasNoVisibleResults = visibleResults.length === 0
  /*
    의존성을 `search` 객체 하나로 두면 **매 렌더 새 참조**라 이펙트가 매번 돈다 —
    예산을 한 박자에 다 태우고("더 보기" 가 첫 장 만에 뜬다) 같은 요청이 겹친다.
    값 단위로 편다: 예산이 줄어도 `canAutoBackfill` 이 안 바뀌면 다시 돌지 않고,
    `isFetchingNextPage` 가 오르내릴 때만 다음 한 장을 판단한다.
  */
  const {
    isLoading: isSearchLoading,
    isError: isSearchError,
    hasNextPage: searchHasNextPage,
    isFetchingNextPage: isSearchFetchingNextPage,
    isFetchNextPageError: isSearchTailError,
    canAutoBackfill: canSearchAutoBackfill,
    noteAutoBackfill: noteSearchAutoBackfill,
    fetchNextPage: fetchNextSearchPage,
  } = search
  useEffect(() => {
    if (
      !isSearchLoading &&
      !isSearchError &&
      hasNoVisibleResults &&
      searchHasNextPage &&
      !isSearchFetchingNextPage &&
      !isSearchTailError &&
      canSearchAutoBackfill
    ) {
      noteSearchAutoBackfill()
      void fetchNextSearchPage()
    }
  }, [
    isSearchLoading,
    isSearchError,
    hasNoVisibleResults,
    searchHasNextPage,
    isSearchFetchingNextPage,
    isSearchTailError,
    canSearchAutoBackfill,
    noteSearchAutoBackfill,
    fetchNextSearchPage,
  ])

  /*
    ─── 빈 자리와 꼬리는 **한 함수가** 정한다 (2026-08-21) ────────────────────
    여기는 피드와 같은 조건을 JSX 안에 **손으로 두 벌** 적고 있었다. FlashList v2 는
    빈 컴포넌트와 꼬리를 형제로 내므로(`renderEmpty` 만 `data.length` 로 걸리고
    `renderFooter` 에는 아무 조건도 없다) 두 자리를 따로 쓰면 조합에 따라 **같이 선다**.
    실제로 넷이 겹쳤다: 보이는 결과 0 · 다음 커서 없음 · 다음 장 실패 —
    "검색 결과가 없어요" 와 꼬리의 "다시"(다음 페이지)가 나란히 섰다. 서로 다른 일을
    하는 두 버튼이 같은 실패를 말하는 화면이고, 이 화면에는 그 둘 말고 아무것도 없다.

    닿는 경로: 2페이지가 실패해 꼬리가 서 있는 상태에서 결과의 작성자를 차단하면
    `useBlockedUsers` 가 검색 키를 `active` 로 재조회하고(`invalidateFeedCaches`),
    서버가 거른 결과에는 커서도 줄도 없다 → 두 면이 동시에 선다.

    `postCount` 는 **원본**(`search.posts.length`)이다 — 전면 오류는 차단 필터로 접힌
    목록이 아니라 받아 둔 목록으로 잰다(그 함수 머리말 1). `isPlaceholderData` 는
    검색에 없다: 검색어가 바뀌면 옛 결과를 붙잡지 않고 새 키로 처음부터 받는다.
  */
  /*
    끝 표시의 `맨 위로` 가 쓰는 목록 ref. 스크롤은 **애니메이션**이다 — 순간이동시키면
    스크린리더 커서가 화면과 어긋난 채 남는다(포커스는 코드가 옮기지 않는다).
  */
  const listRef = useRef<FlashListRef<(typeof visibleResults)[number]>>(null)

  const {
    failed: searchFailed,
    empty: emptySurface,
    tail: tailSurface,
  } = communityFeedSurfaces({
    showSkeleton: isSearchLoading,
    isError: isSearchError,
    postCount: search.posts.length,
    visibleCount: visibleResults.length,
    isPlaceholderData: false,
    hasNextPage: searchHasNextPage,
    isFetchingNextPage: isSearchFetchingNextPage,
    isFetchNextPageError: isSearchTailError,
    isTailStalled: search.isTailStalled,
    canAutoBackfill: canSearchAutoBackfill,
  })

  /**
   * 결과 0 자리의 탈출구 — 검색어를 지우면 진입 패널(최근·인기)로 돌아간다.
   * **인기 검색어가 실제로 있을 때만** 그린다(위 빈 자리 주석).
   */
  const popularKeywordsAction: EmptyStateAction =
    popularKeywords.length > 0
      ? {
          actionLabel: t("community.search.emptyAction"),
          onAction: () => handleChangeText(""),
        }
      : {}

  const handleTagPress = useCallback(
    (tag: string) => {
      /*
        **`push` 가 아니다.** `(tabs)` 는 루트 Stack 의 화면 하나이고, 이 화면은 그
        Stack 위에 얹혀 있다. 그래서 expo-router 55 는 `/community` 로 가는 길이
        **루트에서 갈라진다**고 보고 `StackActions.push("(tabs)")` 를 쏜다 — 탭
        네비게이터가 통째로 한 벌 더 쌓인다. 글 → 태그 → 글 → 태그를 반복하면
        탭 바가 세 겹이 되고, 커뮤니티 탭 버튼이 먹지 않으며, 안드로이드는 뒤로가기를
        그 횟수만큼 눌러야 나간다.
        `navigate` 도 같다 — react-navigation 의 StackRouter 는 NAVIGATE 에서
        **지금 떠 있는 화면과 이름이 같을 때만** 기존 라우트를 재사용하고, 아니면
        그대로 밀어 넣는다(`@react-navigation/routers/StackRouter` NAVIGATE 갈래).
        `dismissTo`(POP_TO)만이 스택을 뒤로 훑어 이미 있는 `(tabs)` 로 되돌아간다.
      */
      router.dismissTo({ pathname: "/community", params: { tag } } as Href)
    },
    [router],
  )

  const renderResult = ({
    item: post,
  }: {
    item: (typeof search.posts)[number]
  }) => (
    <View style={styles.listItemWrap}>
      <PostListItem
        postId={post.id}
        category={categoryLabel(post.category)}
        createdAt={post.createdAt}
        title={post.title}
        summary={post.description}
        imageUri={post.imageUri}
        authorName={post.authorName}
        likeCount={post.likes}
        commentCount={post.comments}
        viewCount={post.views ?? 0}
        tags={post.tags}
        onPress={() => router.push(`/post/${post.id}` as Href)}
        onPressTag={handleTagPress}
        onPressAuthor={
          post.authorId == null
            ? undefined
            : () => router.push(`/community/author/${post.authorId}` as Href)
        }
        onBlock={blockUser}
        isWithdrawnAuthor={isWithdrawnAuthor(post)}
        isMine={isMyContent(post, myNickName)}
      />
    </View>
  )

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: surface.bed,
          paddingTop: insets.top,
        },
      ]}
    >
      {/* 헤더 — 뒤로가기 + 검색 인풋 한 줄. */}
      <View style={styles.header}>
        <HeaderIconButton
          onPress={() => router.back()}
          accessibilityLabel={t("action.back")}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </HeaderIconButton>
        <View
          style={[
            styles.searchField,
            {
              backgroundColor: surface.isDark ? surface.surface : surface.card,
            },
          ]}
        >
          <Ionicons name="search" size={17} color={surface.text} />
          <TextInput
            value={draft}
            onChangeText={handleChangeText}
            onSubmitEditing={() => commit(draft)}
            placeholder={t("community.search.placeholder")}
            placeholderTextColor={surface.placeholder}
            accessibilityLabel={t("community.search.title")}
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
            maxLength={MAX_QUERY_LENGTH}
            style={[styles.searchInput, { color: surface.textStrong }]}
          />
          {draft.length > 0 && (
            <Pressable
              onPress={() => handleChangeText("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tRecipe("feed.clearSearch")}
            >
              <Ionicons name="close-circle" size={17} color={surface.text} />
            </Pressable>
          )}
        </View>
      </View>

      {submitted === null ? (
        /* ── 빈 상태: 최근 검색어 · 실시간 인기글 · 인기 검색어 ─────────────── */
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: surface.text }]}>
                  {t("community.search.recentTitle")}
                </Text>
                <Pressable
                  onPress={clearRecentSearches}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={[styles.sectionAction, { color: surface.text }]}>
                    {t("community.search.clearAll")}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.recentChips}>
                {recentSearches.map((keyword) => (
                  <SurfacePressable
                    key={keyword}
                    onPress={() => commit(keyword)}
                    baseColor={surface.isDark ? surface.surface : surface.card}
                    pressScale={0.95}
                    style={styles.recentChip}
                  >
                    <Text
                      style={[styles.recentChipText, { color: surface.text }]}
                      numberOfLines={1}
                    >
                      {keyword}
                    </Text>
                    <Pressable
                      onPress={() => {
                        hapticSelection()
                        removeRecentSearch(keyword)
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t("community.search.removeOne", {
                        keyword,
                      })}
                    >
                      <Ionicons name="close" size={13} color={surface.text} />
                    </Pressable>
                  </SurfacePressable>
                ))}
              </View>
            </View>
          )}

          {popularPosts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: surface.text }]}>
                  {t("community.search.realtimePopular")}
                </Text>
              </View>
              {popularPosts.slice(0, 5).map((post, index) => (
                <Pressable
                  key={post.id}
                  onPress={() => router.push(`/post/${post.id}` as Href)}
                  accessibilityRole="button"
                  accessibilityLabel={post.title}
                  style={({ pressed }) => [
                    styles.rankRow,
                    pressed && styles.pressedRow,
                  ]}
                >
                  <Text style={[styles.rankNumber, { color: surface.brand }]}>
                    {index + 1}
                  </Text>
                  <Text
                    style={[styles.rankLabel, { color: surface.textStrong }]}
                    numberOfLines={1}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {post.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {popularKeywords.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: surface.text }]}>
                  {t("community.search.popularKeywords")}
                </Text>
              </View>
              {popularKeywords.map((item) => (
                <Pressable
                  key={item.keyword}
                  onPress={() => commit(item.keyword)}
                  accessibilityRole="button"
                  accessibilityLabel={item.keyword}
                  style={({ pressed }) => [
                    styles.rankRow,
                    pressed && styles.pressedRow,
                  ]}
                >
                  <Text style={[styles.rankNumber, { color: surface.brand }]}>
                    {item.rank}
                  </Text>
                  <Text
                    style={[styles.rankLabel, { color: surface.textStrong }]}
                    numberOfLines={1}
                  >
                    {item.keyword}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/*
            ─── 진입 패널이 **통째로** 비는 경우 (2026-08-21) ────────────────────
            셋(최근 검색어 · 실시간 인기글 · 인기 검색어)이 각자 자기 조건으로 접히므로,
            셋이 다 비면 검색창 아래가 **흰 판**이었다. 운영 템포(30일 3편)에서 이건
            드문 일이 아니다 — 인기 검색어는 서버 7일 집계이고 새 기기에는 최근 검색어가
            없다. 흰 판은 "고장"으로 읽히지 "아직 없다"로 읽히지 않는다.

            그래서 왜 빈지를 말한다. 버튼은 **없다** — 이 화면의 컨트롤은 위의 입력칸
            하나이고, 그건 이미 `autoFocus` 로 커서가 가 있다. 같은 일을 하는 두 번째
            버튼을 세우면 그게 곧 소음이다.
          */}
          {recentSearches.length === 0 &&
            popularPosts.length === 0 &&
            popularKeywords.length === 0 && (
              <V2EmptyState
                surface="community_search"
                tone="quiet"
                description={t("community.search.entryEmptyBody")}
                style={styles.emptyWrap}
              />
            )}
        </ScrollView>
      ) : search.isLoading ? (
        /* 결과 자리 스켈레톤 — 카드 목록이 온다는 것을 미리 말한다(링 스피너 금지). */
        <View style={styles.resultSkeletonWrap}>
          <V2SkeletonGroup>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={styles.resultSkeletonItem}>
                <V2Skeleton width="100%" height={104} radius="xl" />
              </View>
            ))}
          </V2SkeletonGroup>
        </View>
      ) : searchFailed ? (
        /*
          조회 실패에 "검색 결과가 없어요" 를 그리면 실패가 정상처럼 읽힌다 — 오류를
          말한다. 이미 받아 둔 결과가 있으면(다음 페이지 실패 등) 목록은 그대로 둔다.
          판정은 `communityFeedSurfaces` 가 한다(위 머리말).
        */
        <SearchErrorState
          error={search.error}
          onRetry={() => void search.refetch()}
        />
      ) : (
        /* ── 결과: 피드와 같은 카드, 같은 커서 페이지네이션 ──────────────────── */
        <FlashList
          ref={listRef}
          data={visibleResults}
          renderItem={renderResult}
          keyExtractor={(post) => String(post.id)}
          ItemSeparatorComponent={ListGap}
          ListHeaderComponent={<View style={styles.listTopGap} />}
          ListEmptyComponent={
            /*
              결과가 비었어도 **다음 커서가 살아 있으면** "결과가 없어요" 는 거짓말이다
              (차단 필터가 첫 페이지를 통째로 접은 경우). 그때는 꼬리(로더 · 실패 행)가
              상태를 말하고 여기서는 아무것도 그리지 않는다. 예산을 다 썼는데도 보일
              결과가 없으면 다음 장을 받을지 사용자가 고른다. 그리고 조회가 실패한 채로
              보일 결과가 없으면 — 스스로 나을 길이 없으므로 — 오류를 말한다.
              **이 우선순위는 `communityFeedSurfaces` 가 정한다**(꼬리와 같이 서지 않게).
            */
            emptySurface === "error" ? (
              <SearchErrorState
                error={search.error}
                onRetry={() => void search.refetch()}
              />
            ) : emptySurface === "loadMore" ? (
              <LoadMoreRow
                label={t("community.search.loadMore")}
                onPress={() => void search.fetchNextPage()}
              />
            ) : emptySurface === "empty" ? (
              /*
                ─── 결과 0 은 **왜 0 인지**와 **어디로 가면 되는지**를 같이 말한다 ─────
                손으로 두 줄을 그리던 자리다. 그러면 화면은 멀쩡한데 `empty_state_viewed`
                가 아무것도 안 나간다(D15) — 조용한 빈칸은 `V2EmptyState tone="quiet"` 다.
                문구는 있던 두 열쇠를 그대로 쓴다: 이유 한 줄("검색 결과가 없어요") +
                할 일 한 줄("단어나 태그를 바꿔 검색해 보세요"). 새 문장을 짓지 않는다.

                탈출구는 **인기 검색어**다 — 검색어를 지우면 진입 패널로 돌아가고 거기에
                남들이 실제로 찾는 말과 지금 읽히는 글이 서 있다. 아무 말이나 더 지어
                내라고 하는 것보다, 읽을 것이 있는 자리로 되돌리는 편이 낫다.
                **버튼은 그 목록이 실제로 있을 때만 그린다** — 비어 있으면 눌러도 빈
                패널이고, 아무 데도 데려다주지 않는 버튼은 안내가 아니다.
              */
              <V2EmptyState
                surface="community_search"
                tone="quiet"
                description={`${t("community.search.noResultsTitle")}\n${t(
                  "community.search.noResultsBody",
                )}`}
                style={styles.emptyWrap}
                {...popularKeywordsAction}
              />
            ) : null
          }
          ListFooterComponent={
            /*
              꼬리는 세 가지를 말한다 — 다음 페이지가 오는 중이거나, 실패했거나,
              **취소로 아무 것도 못 받고 끝났거나**(피드와 같은 규칙).
              셋 다 안 그리면 사용자에게는 결과가 그냥 거기서 끝난 것으로 보인다.
              빈 자리가 말할 때는 꼬리가 침묵한다 — 판정은 위와 **같은 함수**다.
            */
            tailSurface === "loading" ? (
              <V2LoadingState size="small" style={styles.footerLoading} />
            ) : tailSurface === "error" ? (
              /*
                꼬리의 재시도는 **다음 페이지**를 다시 받는다 — `errorRetry`
                ("다시 검색하기")는 검색을 처음부터 다시 한다는 말이라 여기서는
                무엇이 일어나는지 어긋난다. 전면 오류에서는 그 말이 맞다.

                문구는 **훅이 기억한 오류**로 고른다. 옵저버의 `error` 는 낙관 패치
                한 번에 null 이 되어(검색 결과도 좋아요 패치가 지나가는 계보다)
                구체적인 실패 문구가 일반 문구로 주저앉는다.
              */
              <NextPageErrorRow
                title={resolveError(search.nextPageError ?? search.error).title}
                retryLabel={t("community.search.loadMoreRetry")}
                onRetry={() => void search.fetchNextPage()}
              />
            ) : tailSurface === "loadMore" ? (
              /*
                좋아요·북마크·삭제의 취소가 진행 중이던 다음 장을 함께 접었다.
                실패가 아니라서 실패 행은 거짓말이고, `onEndReached` 는 새 스크롤
                델타 없이는 다시 안 쏜다 — 다음 장을 받을지 사용자가 다시 고른다.
              */
              <LoadMoreRow
                label={t("community.search.loadMore")}
                onPress={() => void search.fetchNextPage()}
              />
            ) : tailSurface === "end" ? (
              /*
                더 받을 것이 정말 없다. 여기까지는 아무 것도 안 그려서, 결과가 끝난
                것과 다음 장을 못 받은 것이 **같은 화면**이었다 — 사용자는 끝난 목록을
                계속 당겨 본다. 큰 카드가 아니라 가는 선 한 줄이고, 함께 주는 길은
                하나뿐이다(맨 위로). 이 자리가 다른 넷과 겹치지 않는다는 보장은
                `communityFeedSurfaces` 가 한다.
              */
              <EndOfListRow
                label={t("community.search.endOfList")}
                actionLabel={t("community.search.backToTop")}
                onPressAction={() =>
                  listRef.current?.scrollToOffset({
                    offset: 0,
                    animated: true,
                  })
                }
              />
            ) : null
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        />
      )}
    </View>
  )
}

/** 목록 줄 사이 간격 — 피드와 같은 10. */
function ListGap() {
  return <View style={styles.listGap} />
}

/** 결과 조회 실패. 문구는 `resolveError` 가 코드로 고르고, 재시도는 가능할 때만 준다. */
function SearchErrorState({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  const { t } = useTranslation("common")
  const resolved = resolveError(error)
  // 타입을 붙여야 삼항의 두 갈래가 유니온으로 남는다(`V2ErrorStateRetry` 머리말).
  const retry: V2ErrorStateRetry = resolved.retryable
    ? { onRetry, retryLabel: t("community.search.errorRetry") }
    : {}
  return (
    <V2ErrorState
      surface="community_search"
      tone="quiet"
      title={resolved.title}
      description={resolved.body}
      style={styles.errorWrap}
      {...retry}
    />
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchField: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    // 단일행 인풋 규칙: lineHeight 를 주지 않는다(`surface.ts` 머리말).
    // 세로 정렬은 컨테이너(height 44 + alignItems center)가 맡는다.
    ...singleLineInputText({
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: -0.3,
      fontFamily: "Pretendard-Regular",
    }),
  },

  section: {
    paddingTop: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  sectionAction: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },

  recentChips: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  recentChip: {
    height: 32,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 220,
  },
  recentChipText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },

  rankRow: {
    paddingHorizontal: 20,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  // 행의 눌림 피드백은 0.6 (버튼/칩 0.85, 행 0.6 — 식당 검색과 같은 규칙).
  pressedRow: {
    opacity: 0.6,
  },
  rankNumber: {
    width: 18,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    textAlign: "center",
  },
  rankLabel: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },

  resultSkeletonWrap: {
    paddingTop: 12,
  },
  resultSkeletonItem: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  listItemWrap: {
    paddingHorizontal: 20,
  },
  listGap: {
    height: 10,
  },
  listTopGap: {
    height: 12,
  },
  footerLoading: {
    paddingVertical: 20,
  },

  /*
    가운데정렬·덩어리 간격·타이포는 `V2EmptyState` 가 소유한다 — 여기서 정하는 것은
    실패 자리와 **같은 높이**에 서게 하는 세로 여백 하나뿐이다.
  */
  emptyWrap: {
    paddingVertical: 64,
  },
  errorWrap: {
    paddingVertical: 64,
  },
})
