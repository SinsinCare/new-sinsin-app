import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { type Href } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { Text } from "@/src/shared/components/AppText"
import { useAppRouter } from "@/src/shared/navigation"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import { resolveError } from "@/src/lib/errorMessage"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { FloatingWriteButton } from "@/src/shared/components/FloatingWriteButton"
import { useRefreshable, useRevalidateOnReturn } from "@/src/shared/refresh"
import {
  V2EmptyState,
  V2ErrorState,
  V2Skeleton,
  V2SkeletonGroup,
  type V2ErrorStateRetry,
} from "@/src/design-system-v2"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { useCommunityPopularPosts } from "../hooks/useCommunityPopularPosts"
import { isAuthorBlocked, useBlockedUsers } from "../hooks/useBlockedUsers"
import { COMMUNITY_POPULAR_REFRESH } from "../refresh/scopes"
import { FREE_POST_CATEGORIES } from "../data/freePostCategories"
import type { CommunityMealPost, CommunityPopularPeriod } from "../types"
import { isWithdrawnAuthor } from "../utils/contentOwnership"
import { formatCount } from "../utils/displayNumber"
import { formatTimeAgo } from "../utils/timeAgo"

const PERIODS: CommunityPopularPeriod[] = ["realtime", "week", "month"]
const PERIOD_LABEL_KEYS = {
  realtime: "community.popular.realtime",
  week: "community.popular.week",
  month: "community.popular.month",
} as const

/**
 * **더 넓은 창**. 목록이 비었을 때 이 화면이 스스로 줄 수 있는 유일한 탈출구가 기간을
 * 넓히는 것이라, 방향을 여기 한 벌로 못 박는다. `month` 는 마지막이라 다음이 없다.
 */
const WIDER_PERIOD: Record<
  CommunityPopularPeriod,
  CommunityPopularPeriod | null
> = {
  realtime: "week",
  week: "month",
  month: null,
}

/**
 * `V2EmptyState` 의 액션은 라벨과 콜백이 **함께** 있을 때만 그려진다. 삼항을 그대로
 * 스프레드하면 옵셔널이 `string | undefined` 로 넓어져 유니온이 무너진다
 * (`V2ErrorStateRetry` 와 같은 이유).
 */
type PopularEmptyAction =
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

export function CommunityPopularScreen() {
  const { t, i18n } = useTranslation("common")
  const { t: tRecipe } = useTranslation("recipe")
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const [period, setPeriod] = useState<CommunityPopularPeriod>("realtime")
  const [category, setCategory] = useState<string | null>(null)
  const {
    data: posts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCommunityPopularPosts(period, category)
  const { blockedAuthors } = useBlockedUsers()

  /*
    서버도 차단 작성자를 거르지만, 차단 직후 재조회가 오기 전까지의 한 박자를
    클라이언트 필터가 메운다 — 피드(`FreePostTab`)와 같은 규칙.
  */
  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (p) => isWithdrawnAuthor(p) || !isAuthorBlocked(blockedAuthors, p),
      ),
    [posts, blockedAuthors],
  )

  /* 당겨서 새로고침(인기글 + 차단 목록) · 화면 복귀 시 낡은 것만 조용히 재검증. */
  const refreshable = useRefreshable({
    queryKeys: COMMUNITY_POPULAR_REFRESH,
    scope: "community-popular",
  })
  useRevalidateOnReturn({ queryKeys: COMMUNITY_POPULAR_REFRESH })

  /*
    빈 목록의 **이유와 그에 맞는 탈출구**. 자세한 판정 이유는 아래 `ListEmptyComponent`
    주석. 좁은 축(분류)부터 본다 — 분류가 걸린 채로 기간만 넓히면 여전히 비어 있다.
  */
  const widerPeriod = WIDER_PERIOD[period]
  const emptyDescription =
    category !== null
      ? t("community.popular.emptyFiltered")
      : widerPeriod
        ? t("community.popular.emptyPeriod")
        : `${t("community.popular.empty")}\n${t("community.popular.emptyAllBody")}`
  const emptyAction: PopularEmptyAction =
    category !== null
      ? {
          actionLabel: t("community.popular.emptyClearCategory"),
          onAction: () => setCategory(null),
        }
      : widerPeriod
        ? {
            actionLabel: t("community.popular.emptyWiden", {
              period: t(PERIOD_LABEL_KEYS[widerPeriod]),
            }),
            onAction: () => setPeriod(widerPeriod),
          }
        : {}

  const categories = useMemo(
    () => [
      { key: null as string | null, label: t("community.popular.all") },
      ...FREE_POST_CATEGORIES.map((item) => ({
        key: item.key,
        label: t(
          CATEGORY_LABEL_KEYS[item.key as keyof typeof CATEGORY_LABEL_KEYS],
        ),
      })),
    ],
    [t],
  )

  /*
    ■ 순위 배지는 **서버 rank 가 아니라 목록 index** 다 (2026-08-20)

    서버는 차단 필터 뒤에 rank 를 1..n 으로 다시 매겨 구멍 없이 준다. 구멍은
    **클라이언트가 목록을 줄이는데 서버 번호를 그대로 찍을 때** 생긴다 —
    낙관 삭제(`removePostFromFeedCaches`)나 위의 한 박자 차단 필터가 행을 접으면
    배지가 1, 3, 4 로 남는다(둘 다 재조회 없이 캐시를 그대로 그리는 창이 있다).
    목록을 거르는 주체가 클라이언트면 번호도 클라이언트가 소유해야 한다 —
    피드의 인기 레일(`FreePostTab` 의 `rank={index + 1}`)과 같은 규칙이다.
    (캐시 헬퍼에서 재넘버링하는 대안은 차단 필터 경로를 못 덮는다.)
  */
  const renderPost = ({
    item,
    index,
  }: {
    item: CommunityMealPost
    index: number
  }) => (
    <Pressable
      onPress={() => router.push(`/post/${item.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [
        styles.rankRow,
        { backgroundColor: surface.card, opacity: pressed ? 0.66 : 1 },
      ]}
    >
      <View style={styles.rankLine}>
        <View
          style={[styles.rankBadge, { backgroundColor: surface.surfaceBrand }]}
        >
          <Text style={[styles.rankText, { color: surface.brand }]}>
            {index + 1}
          </Text>
        </View>
        <View
          style={[styles.categoryBadge, { backgroundColor: surface.textMuted }]}
        >
          <Text style={[styles.categoryBadgeText, { color: surface.onBrand }]}>
            {t(
              CATEGORY_LABEL_KEYS[
                item.category as keyof typeof CATEGORY_LABEL_KEYS
              ] ?? "community.popular.all",
            )}
          </Text>
        </View>
      </View>

      {item.tags.length > 0 && (
        <View style={styles.tags}>
          {item.tags.slice(0, 4).map((tag) => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: surface.surface }]}
            >
              <Text style={[styles.tagText, { color: surface.text }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.postBody}>
        <View style={styles.postCopy}>
          <Text
            style={[styles.title, { color: surface.textStrong }]}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
          >
            {item.title}
          </Text>
          <Text
            style={[styles.summary, { color: surface.text }]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
          <View style={styles.metrics}>
            <Text style={[styles.metric, { color: surface.text }]}>
              {t("community.postDetail.viewCount", { count: item.views ?? 0 })}
            </Text>
            <Ionicons name="heart" size={12} color={surface.text} />
            <Text style={[styles.metric, { color: surface.text }]}>
              {formatCount(item.likes, i18n.language)}
            </Text>
            <Ionicons name="chatbubble" size={11} color={surface.text} />
            <Text style={[styles.metric, { color: surface.text }]}>
              {formatCount(item.comments, i18n.language)}
            </Text>
            <Text style={[styles.metricTime, { color: surface.text }]}>
              {formatTimeAgo(item.createdAt, i18n.language)}
            </Text>
          </View>
        </View>
        {item.imageUri && (
          <Image
            source={remoteImageSource(item.imageUri)}
            style={[styles.thumbnail, { backgroundColor: surface.surface }]}
            contentFit="cover"
          />
        )}
      </View>
    </Pressable>
  )

  return (
    <View
      /*
        **바닥은 우물이다** (2026-08-22). 전에는 `surface.canvas`(흰색)라, 피드에서
        `전체 ›` 로 넘어오면 회색 바닥이 흰색으로 바뀌었다 — 같은 계보(피드 · 검색 ·
        인기글)인데 형태가 이 화면만 달랐다(사용자 지적: "라이트가 어색하다").
        층의 정본과 (i)/(ii) 형태 구분은 `community/SectionHeader` 머리말 §층의 정본.
        다크는 `bed` 가 곧 `canvas`(#1f1f21)라 **한 픽셀도 안 바뀐다.**
      */
      style={[
        styles.screen,
        { backgroundColor: surface.bed, paddingTop: insets.top },
      ]}
    >
      {/*
        고정층은 **한 면**이다 — 제목줄 · 기간 · 분류 레일 셋 다 스크롤하지 않는다.
        커뮤니티 피드의 `pinnedHeader` 와 같은 판정이고(§8), 그 면이 콘텐츠 면이어야
        하는 이유도 같다: 이 위에 앉는 미선택 칩(`surface.surface`)이 바닥과 같은 값이라
        고정층을 바닥색으로 칠하면 칩이 통째로 사라진다.
      */}
      <View style={{ backgroundColor: surface.card }}>
        <View style={[styles.header, { borderBottomColor: surface.hairline }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("action.back")}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={surface.textStrong}
            />
          </Pressable>
          <Text style={[styles.headerTitle, { color: surface.textStrong }]}>
            {t("community.popular.title")}
          </Text>
          <Pressable
            onPress={() => router.push("/community/search" as Href)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={tRecipe("feed.searchPlaceholder")}
          >
            <Ionicons name="search" size={22} color={surface.textStrong} />
          </Pressable>
        </View>

        <View
          style={[styles.periodRow, { borderBottomColor: surface.hairline }]}
        >
          {PERIODS.map((item) => {
            const selected = period === item
            return (
              <Pressable
                key={item}
                onPress={() => setPeriod(item)}
                accessibilityState={{ selected }}
                style={styles.periodButton}
              >
                <Text
                  style={[
                    styles.periodText,
                    { color: selected ? surface.textStrong : surface.text },
                  ]}
                >
                  {t(PERIOD_LABEL_KEYS[item])}
                </Text>
                {selected && (
                  <View
                    style={[
                      styles.periodIndicator,
                      { backgroundColor: surface.textStrong },
                    ]}
                  />
                )}
              </Pressable>
            )
          })}
        </View>

        <ScrollView
          horizontal
          style={styles.categoryRailScroll}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.categoryRail}
        >
          {categories.map((item) => {
            const selected = category === item.key
            return (
              <SurfacePressable
                key={item.key ?? "all"}
                onPress={() => setCategory(item.key)}
                accessibilityState={{ selected }}
                baseColor={selected ? surface.surfaceBrand : surface.surface}
                style={[
                  styles.categoryChip,
                  selected && { borderColor: surface.brand },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: selected ? surface.brand : surface.text },
                  ]}
                >
                  {item.label}
                </Text>
              </SurfacePressable>
            )
          })}
        </ScrollView>
      </View>

      <FlashList
        data={visiblePosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isLoading ? (
            /* 순위 행 자리 스켈레톤 — 목록이 온다는 것을 미리 말한다(링 스피너 금지). */
            <View style={styles.skeletonWrap}>
              <V2SkeletonGroup>
                {[0, 1, 2, 3, 4].map((index) => (
                  <View key={index} style={styles.skeletonItem}>
                    <V2Skeleton width="100%" height={104} radius="xl" />
                  </View>
                ))}
              </V2SkeletonGroup>
            </View>
          ) : isError ? (
            /*
              조회 실패에 "아직 인기글이 없어요" 를 그리면 실패가 정상처럼 읽힌다 —
              오류를 말한다. 이미 받아 둔 목록이 있으면(배경 재조회 실패) 그대로 둔다.
            */
            <PopularErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            /*
              "아직 인기글이 없어요" 한 줄은 **왜 없는지**를 말하지 않는다. 이 화면의
              목록은 축 둘로 좁혀져 있고(기간 · 분류) 둘의 처방이 정반대다 — 분류가
              걸렸으면 분류를 풀어야 하고, 기간이 좁으면 기간을 넓혀야 한다. 한 문장으로
              뭉치면 사용자는 둘 중 무엇을 눌러야 할지 알 수 없다.

              두 축을 아는 것은 이 화면뿐이므로(`period` · `category` 가 여기 상태다)
              여기서 갈라 각각에 **맞는** 컨트롤을 붙인다. 순서는 좁은 것부터 — 분류가
              걸린 채로 기간을 넓히면 여전히 빈 목록이다.

              셋째 갈래(월간 · 전체)에는 컨트롤이 **없다.** 더 넓힐 창도, 풀 필터도
              없어서 이 화면이 스스로 할 수 있는 일이 없기 때문이다. 없는 길을 버튼으로
              그리지 않는다. 글을 쓰라고도 하지 않는다 — 글쓰기는 이미 이 화면 오른쪽
              아래에 떠 있고(`FloatingWriteButton`), 빈칸이 그걸 한 번 더 조르면
              "아무도 없는 방에 먼저 말해 보라"가 된다.
            */
            <V2EmptyState
              surface="community_popular"
              tone="quiet"
              description={emptyDescription}
              style={styles.emptyWrap}
              {...emptyAction}
            />
          )
        }
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{ disabled: true }}
        contentContainerStyle={{
          paddingTop: LAYOUT.stickyHeaderGap,
          paddingBottom: 180 + insets.bottom,
        }}
        {...refreshable.scrollProps}
      />

      <FloatingWriteButton
        label={t("community.popular.write")}
        accessibilityLabel={t("community.writeAccessibility")}
        onPress={() => router.push("/free/new" as Href)}
      />
    </View>
  )
}

/** 조회 실패. 문구는 `resolveError` 가 코드로 고르고, 재시도는 가능할 때만 준다. */
function PopularErrorState({
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
    ? { onRetry, retryLabel: t("community.popular.errorRetry") }
    : {}
  return (
    <V2ErrorState
      surface="community_popular"
      tone="quiet"
      title={resolved.title}
      description={resolved.body}
      style={styles.errorWrap}
      {...retry}
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  periodRow: {
    height: 52,
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  periodButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  periodText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Pretendard-SemiBold",
    fontWeight: "600",
  },
  periodIndicator: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  categoryRailScroll: { flexGrow: 0 },
  categoryRail: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  /*
    ■ 상자가 자란다 — 글자에 상한을 걸지 않는다 (동적 타입)

    아래 셋(`categoryChip` 32 · `categoryBadge` 22 · `tag` 22)은 **고정 높이**였고
    안의 글자는 행간 14~17이었다. iOS 손쉬운 사용의 글자 크기를 1.6배쯤 올리면 글자가
    상자보다 커져 위아래가 잘렸다 — 화면이 사용자의 OS 설정을 그냥 무시한 셈이다.

    고르는 길은 둘이었다: `maxFontSizeMultiplier` 로 **상한을 걸기**, 또는 상자를
    **자라게 두기**. 상한은 마지막 수단이다("이 자리는 절대 안 늘어난다"고 화면이
    사용자에게 통보하는 것이라, 진짜로 못 늘어나는 자리에만 쓸 수 있다). 그런데 이
    셋은 그런 자리가 아니다 — 하나는 가로 레일, 둘은 줄바꿈되는 행 안이고 무엇도 이
    상자의 정확한 높이에 맞춰 정렬돼 있지 않다.

    그래서 `height` 를 `minHeight` + 대칭 세로 패딩으로 바꾼다. 1배에서는 픽셀이 그대로고
    (행간 + 패딩 = 예전 높이), 글자가 커지면 알약이 같이 자란다.
  */
  categoryChip: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 13,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: "Pretendard-Medium",
    fontWeight: "500",
  },
  /*
    **머리카락 선으로 나눈 전폭 행이었다 → 바닥 위에 뜬 낱개 카드다** (2026-08-22).
    바닥이 우물로 내려오면서 전폭 흰 행을 그대로 두면 화면이 다시 흰 한 장이 된다.
    치수는 지어내지 않았다 — 커뮤니티 피드의 글 카드(`PostListItem`: 인셋 20 · r16 ·
    padding 16)와 **이 화면 자신의 스켈레톤**(인셋 20 · 아래 10)이 이미 그 값이다.
    즉 로딩 중에 약속하던 모양을 도착한 뒤에도 지키게 됐을 뿐이다.
    선(`hairline`)은 뺀다 — 카드가 경계를 말하는데 선까지 그으면 표시가 둘이 된다.
  */
  rankRow: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  rankLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  rankBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  categoryBadge: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 4,
    justifyContent: "center",
  },
  // 색은 렌더에서 `surface.onBrand` 로 준다 — 여기 리터럴을 두면 죽은 값이 남는다.
  categoryBadgeText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontFamily: "Pretendard-SemiBold",
    fontWeight: "600",
  },
  tags: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  tag: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "center",
  },
  tagText: { fontSize: 10.5, lineHeight: 14, fontFamily: "Pretendard-Regular" },
  postBody: { flexDirection: "row", gap: 12 },
  postCopy: { flex: 1, gap: 4 },
  title: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontFamily: "Pretendard-SemiBold",
    fontWeight: "600",
  },
  summary: {
    fontSize: 12.5,
    lineHeight: 18,
    letterSpacing: -0.25,
    fontFamily: "Pretendard-Regular",
  },
  thumbnail: { width: 78, height: 78, borderRadius: 10 },
  metrics: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metric: { fontSize: 11.5, lineHeight: 16, fontFamily: "Pretendard-Regular" },
  metricTime: { marginLeft: "auto", fontSize: 11.5, lineHeight: 16 },
  /*
    가운데정렬·타이포·덩어리 간격은 `V2EmptyState` 가 소유한다 — 여기서 정하는 것은
    실패 자리(`errorWrap`)와 같은 높이에 서게 하는 세로 여백 하나뿐이다.
  */
  emptyWrap: { paddingVertical: 48 },
  skeletonWrap: { paddingTop: 4 },
  skeletonItem: { paddingHorizontal: 20, paddingBottom: 10 },
  errorWrap: { paddingVertical: 48 },
})
