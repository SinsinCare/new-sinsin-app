import { useMemo } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { resolveError } from "@/src/lib/errorMessage"
import {
  V2EmptyState,
  V2Skeleton,
  V2SkeletonGroup,
} from "@/src/design-system-v2"
import { SectionHeader } from "./community/SectionHeader"
import {
  isStoryExpired,
  useCommunityStories,
  useStoryNow,
} from "../hooks/useCommunityStories"
import { isAuthorBlocked, useBlockedUsers } from "../hooks/useBlockedUsers"
import { isWithdrawnAuthor } from "../utils/contentOwnership"
import { useTranslation } from "react-i18next"

const CARD_WIDTH = 112
const CARD_HEIGHT = 152

/**
 * 스토리 레일 — 오늘 하루만 남는 사진들. 추천 순서는 서버가 매번 섞어 주므로
 * 늦게 올린 사람도 맨 앞에 걸린다.
 *
 * 자리 하나에 상태 셋이 온다: **스켈레톤 → 오류 한 줄 → 조용한 빈 줄**. 예전에는
 * 셋을 다 "아직 스토리가 없어요 · 첫 스토리를 올려 보세요" 하나로 그렸는데, 비행기
 * 모드에서 그 문구가 뜨는 동안 **바로 아래 피드는 정직하게 오류를 그린다** — 같은
 * 화면의 두 목록이 같은 실패를 다르게 말했다. 레일은 화면의 주인공이 아니므로
 * 오류는 한 줄로 접고 재시도만 남긴다.
 *
 * 빈 상태도 같은 규칙을 뒤늦게 따라왔다(2026-08-21): 큰 카드 + 아이콘 원 + 두 번째
 * CTA 였던 자리가 `V2EmptyState tone="quiet"` 한 줄이 됐다. 자세한 것은 그 갈래의 주석.
 */
export function StoryRail() {
  const { t } = useTranslation("recipe")
  // 재시도 라벨 같은 일반 동사는 `common` 에 산다(`fallbackNS` 를 안 켰다).
  const { t: tCommon } = useTranslation("common")
  const surface = useSurface()
  const router = useAppRouter()
  const { stories, isLoading, isError, error, refetch } =
    useCommunityStories("recommended")
  const { blockedAuthors } = useBlockedUsers()
  const failure = resolveError(error)
  /*
    **레일도 시계를 본다** — 뷰어와 같은 분 눈금(`useStoryNow`).
    없으면 탭을 열어 둔 채 2분 뒤 만료되는 타일이 그대로 서 있고, 아무것도 그것을
    다시 판단하지 않는다(레일은 재조회 없이 60초 staleTime 캐시를 그린다).
  */
  const now = useStoryNow()

  /*
    ─── 레일이 거르지 않으면 **뷰어가 남을 연다** (2026-08-21) ────────────────
    타일은 `?storyId=` 로 뷰어를 여는데, 뷰어는 자기 목록에서 그 id 를 못 찾으면
    맨 앞(0)으로 접는다(`resolveStoryIndex`). 레일이 만료·차단을 안 걸러 두면 그
    "못 찾는" 경우가 **레일을 누르는 것만으로** 만들어진다 — 만료된 타일을 눌렀는데
    전혀 다른 사람의 사진이 전체화면으로 열린다. `?storyId=` 로 옮긴 바로 그 결함이
    만료·차단이라는 다른 축으로 되돌아오는 자리다.

    그래서 뷰어와 **같은 두 필터**를 여기서도 건다(`app/stories.tsx` 의 `liveStories`):
     - **만료**: 서버가 지우기 전에도 내린다.
     - **차단·탈퇴**: 서버도 거르지만 그 응답 전 한 박자를 메운다. 탈퇴 글쓴이는
       면제다 — `"탈퇴한 사용자"` 는 라벨이라 그 이름을 차단하면 탈퇴자 전원이 접힌다
       (`contentOwnership.isWithdrawnAuthor`).
    순서는 섞지 않는다 — 레일은 서버가 섞어 준 순서 그대로 보이는 것이 기능이다.
  */
  const visibleStories = useMemo(
    () =>
      stories.filter(
        (story) =>
          !isStoryExpired(story, now) &&
          (isWithdrawnAuthor(story) || !isAuthorBlocked(blockedAuthors, story)),
      ),
    [stories, now, blockedAuthors],
  )

  return (
    <View style={styles.section}>
      {/*
        머리는 커뮤니티의 **한 가지 형태**를 쓴다 — 제목 + 후행 어포던스(`SectionHeader`).
        예전엔 여기만 `제목 + 부제 + 알약 버튼` 이라, 바로 아래 `요즘 이야기 중` 과 같은
        화면에서 서로 다른 두 머리가 나란히 섰다. 부제였던 온보딩 한 줄은 **비었을 때만**
        뜻이 있으므로 아래 빈 상태로 내려갔다(스토리가 있으면 그 문장은 없다).
      */}
      <SectionHeader
        title={t("story.title")}
        actionLabel={t("story.create")}
        accessibilityLabel={t("story.createAccessibility")}
        onPress={() => router.push("/story/new" as Href)}
      />

      {isLoading && stories.length === 0 ? (
        /* 카드가 온다는 것을 미리 말한다(링 스피너 금지 — 로딩 시스템 규칙). */
        <V2SkeletonGroup style={styles.skeletonRail}>
          {[0, 1, 2].map((index) => (
            <V2Skeleton
              key={index}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              radius="xl"
            />
          ))}
        </V2SkeletonGroup>
      ) : isError && stories.length === 0 ? (
        /* 오류는 한 줄. 재시도는 **다시 해서 될 때만** 그린다 — 눌러도 안 되는
           버튼은 사용자가 자기 잘못을 찾게 만든다. */
        <View style={styles.errorRow}>
          <Text
            style={[styles.errorText, { color: surface.text }]}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
          >
            {failure.title}
          </Text>
          {failure.retryable && (
            <SurfacePressable
              onPress={() => void refetch()}
              accessibilityLabel={tCommon("action.retry")}
              baseColor={surface.isDark ? surface.surface : surface.card}
              pressScale={0.95}
              style={styles.retryPill}
            >
              <Text style={[styles.retryLabel, { color: surface.textStrong }]}>
                {tCommon("action.retry")}
              </Text>
            </SurfacePressable>
          )}
        </View>
      ) : visibleStories.length === 0 ? (
        /*
          만료·차단으로 다 걸러진 경우도 여기로 온다 — 뷰어의 빈 상태와 같은 판정이다
          (`visibleStories.length === 0`). 원본으로 재면 눌러도 남의 스토리가 열리는
          썸네일들이 레일에 서 있는 채로 뷰어만 "아직 스토리가 없어요" 를 말한다.
          로딩·실패 갈래는 위에서 **원본**으로 잰다 — 그건 "못 받았다" 는 다른 사실이다.

          ─── 빈 스토리 자리는 **화면에서 제일 조용한 것**이다 (2026-08-21) ──────────
          여기 있던 것은 채워진 면 + 40 아이콘 원 + 두 줄 + 그 자체가 CTA 인 큰 카드였다.
          같은 화면의 나머지가 전부 조용한 목록인데 **아무것도 없는 자리가 제일 크게
          말했고**, 그 CTA 는 바로 위 머리의 `올리기` 와 같은 곳으로 가는 두 번째 버튼이었다.

          그래서 한 줄로 접는다. 손으로 만들지 않고 `V2EmptyState tone="quiet"` 를 쓰는
          것은 D15 다 — 손으로 그리면 화면은 멀쩡한데 `empty_state_viewed` 가 **아무것도
          안 나간다**. 높이는 레일과 같게 잡아(`CARD_HEIGHT`) 스토리가 도착하는 순간
          아래 피드가 위아래로 튀지 않게 한다.

          자리 이름은 `community_story` — 화면(피드)은 모든 행에 실리는 `screen_name` 이
          말하고 `surface` 는 **따로 로드되고 따로 실패하는 판**을 말한다. 이 판이 받는
          것은 스토리다(같은 판정: `TrendingPostsSection.TRENDING_SURFACE` 머리말).
        */
        <V2EmptyState
          surface="community_story"
          tone="quiet"
          description={t("story.emptyLine")}
          /*
            머리의 `올리기 ›` 와 **같은 곳으로 가는 두 번째 길**이다. 한때 그것을
            이유로 뺐지만(중복 진입점), 빈 자리는 레일과 같은 높이를 지키기로 했으므로
            그 152pt 는 어차피 거기 있다 — 문장 한 줄만 떠 있는 상자보다 무엇을 할 수
            있는지 말하는 상자가 낫다. 머리의 어포던스는 스토리가 **있을 때도** 있어야
            하고, 이 버튼은 **없을 때만** 선다. 둘은 같은 곳으로 가지만 서는 조건이 다르다.
          */
          actionLabel={t("story.emptyAction")}
          onAction={() => router.push("/story/new" as Href)}
          style={styles.emptyRail}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.rail}
        >
          {visibleStories.map((story) => (
            <SurfacePressable
              key={story.id}
              /*
                뷰어에는 **자리 번호가 아니라 id** 를 넘긴다. 추천 순서는 서버가 매번
                새로 섞어 주므로(`ORDER BY random()`), 60초 묵은 레일에서 세 번째
                타일을 누르고 넘긴 `index=2` 는 뷰어가 마운트하며 낸 재조회가 도착하는
                순간 **다른 사람의 스토리**를 가리킨다. id 는 셔플과 무관하다
                (`useCommunityStories` 의 "뷰어가 보는 순서" 머리말).
              */
              onPress={() =>
                router.push(
                  `/stories?storyId=${encodeURIComponent(story.id)}` as Href,
                )
              }
              accessibilityLabel={t("story.accessibility", {
                author: story.authorName,
              })}
              baseColor={surface.isDark ? surface.surface : surface.card}
              pressScale={0.96}
              style={styles.card}
            >
              <Image
                source={{ uri: story.imageUri }}
                style={styles.cardImage}
                contentFit="cover"
              />
              <View style={styles.cardScrim}>
                <Text style={styles.cardAuthor} numberOfLines={1}>
                  {story.isMine ? t("story.mine") : story.authorName}
                </Text>
              </View>
              {story.likes > 0 && (
                <View style={styles.cardLike}>
                  <Ionicons name="heart" size={11} color="#FFFFFF" />
                  <Text style={styles.cardLikeText}>{story.likes}</Text>
                </View>
              )}
            </SurfacePressable>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  /*
    머리(`SectionHeader`)는 높이 47 안에 pad-top 16 을 갖는다 — 예전 머리는 제 위 여백이
    22 였으므로 6 을 더해 **잉크가 서던 자리를 그대로** 둔다(6 + 16 = 22).
  */
  section: {
    paddingTop: 6,
  },

  rail: {
    paddingHorizontal: 20,
    gap: 8,
  },
  skeletonRail: {
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 8,
  },
  errorRow: {
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontFamily: "Pretendard-Medium",
    fontWeight: "500",
  },
  retryPill: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  retryLabel: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    // 그라디언트 없이 반투명 잉크 한 겹으로 글자만 살린다.
    backgroundColor: "rgba(23,24,28,0.55)",
  },
  cardAuthor: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    color: "#FFFFFF",
  },
  cardLike: {
    position: "absolute",
    top: 8,
    right: 8,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(23,24,28,0.55)",
  },
  cardLikeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    color: "#FFFFFF",
  },

  /**
   * 빈 자리도 **레일과 같은 높이**(`CARD_HEIGHT`)를 차지한다. 면도 테두리도 없고
   * 조용한 한 줄만 그 안에서 가운데 선다.
   *
   * 한 번 줄여 봤다가 되돌린 자리다(2026-08-21, 사용자 판정). 줄이면 첫 화면에
   * 글이 한 줄 더 들어오지만, **스토리가 있는 날과 없는 날의 화면이 서로 다른
   * 골격**이 된다 — 어제는 레일이 있던 자리에서 오늘은 피드가 시작한다. 자리가
   * 늘 같은 크기로 있는 쪽이 예측 가능하다는 것이 결론이다.
   *
   * 그러니 이 높이를 "빈 공간이 아깝다" 는 이유로 다시 줄이지 마라. 밀도가 정말
   * 문제라면 줄여야 하는 것은 이 상자가 아니라 **그 안에 무엇이 서는가** 다.
   */
  emptyRail: {
    height: CARD_HEIGHT,
    /*
      `V2EmptyState` 는 안쪽을 **수치상 가운데**로 놓는다(`justifyContent: center`,
      `padding: 24`). 그런데 이 자리 바로 위에는 `스토리 / 올리기 ›` 머리 줄이 있고,
      그 줄은 왼쪽 끝에 짧은 낱말 하나뿐이라 **나머지 폭이 통째로 여백처럼 읽힌다.**
      아래에는 그런 것이 없다. 그래서 수치가 대칭이어도 그림은 위로 쏠린다.

      아래 여백을 `V2EmptyState` 기본값(24)에 머리 줄만큼(24)을 더한 48 로 줘서
      덩어리를 위로 당긴다 — 댓글 빈
      상태(`app/post/[id].tsx` 의 `commentsEmpty`)와 **같은 이유, 같은 처방**이다.
      실기기에서 보고 정한 값이다.
    */
    paddingBottom: 48,
  },
})
