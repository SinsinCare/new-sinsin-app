import { Pressable, StyleSheet, View } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams, type Href } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { Text } from "@/src/shared/components/AppText"
import { useAppRouter } from "@/src/shared/navigation"
import { useSurface } from "@/src/hooks/useSurface"
import { resolveError } from "@/src/lib/errorMessage"
import {
  V2EmptyState,
  V2Skeleton,
  V2SkeletonGroup,
} from "@/src/design-system-v2"
import { ErrorMessage } from "@/src/shared/components"
import { useCommunityFollowList } from "../hooks/useCommunityAuthor"
import type { CommunityAuthorSummary } from "../types"

/**
 * 한 줄 = 목록 응답 한 칸. **행이 자기 몫의 요청을 내지 않는다.**
 *
 * 예전에는 여기서 `useCommunityAuthor(author.id)` 를 불러 팔로워 수·글 수·팔로우
 * 버튼을 그렸다. 그러면 행이 가상화되어 붙는 대로 `GET /community/authors/:id` 가
 * 하나씩 나가서, 팔로워 200명짜리 목록이 요청 200개가 된다 —
 * `/community/authors/*` 에는 레이트 리밋이 없어 서버가 막아 주지도 않는다.
 *
 * 그래서 **목록 엔드포인트가 준 것만** 그린다(`CommunityAuthorSummary` =
 * `id` · `nickName` · `profileImageUrl`). 부수 정보(`followerCount` · `postCount` ·
 * `isFollowing` · `isMine`)는 이 응답에 아예 없으므로 화면에서 뺐다 — 한 줄을
 * 채우려고 N 요청을 내는 것보다 그 줄이 없는 편이 낫다. 서버가 목록 항목에
 * 그 네 칸을 실어 주면(E2 "신신이웃 디렉터리" 과제) 요청 없이 되살아난다.
 */
function ConnectionRow({ author }: { author: CommunityAuthorSummary }) {
  const router = useAppRouter()
  const surface = useSurface()

  return (
    <Pressable
      onPress={() => router.push(`/community/author/${author.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={author.nickName}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.68 : 1 }]}
    >
      <View style={[styles.avatar, { backgroundColor: surface.surface }]}>
        {author.profileImageUrl ? (
          <Image
            source={{ uri: author.profileImageUrl }}
            style={styles.avatarImage}
          />
        ) : (
          <Ionicons name="person" size={21} color={surface.text} />
        )}
      </View>
      <View style={styles.rowCopy}>
        <Text
          style={[styles.name, { color: surface.textStrong }]}
          numberOfLines={1}
        >
          {author.nickName}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={surface.text} />
    </Pressable>
  )
}

export function CommunityConnectionsScreen() {
  const { t } = useTranslation("common")
  const router = useAppRouter()
  const surface = useSurface()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id?: string; mode?: string }>()
  const authorId = Number(params.id)
  /**
   * 딥링크가 `?id=abc` 처럼 오면 `NaN` 이다. 쿼리는 `enabled:false` 로 조용히
   * 안 도는데, 그러면 로딩도 오류도 아닌 채 **영영 빈 캔버스**가 남는다 —
   * "팔로워 0명" 으로 읽히는 화면이 사실은 주소가 깨진 것이다. 그래서 셋 중
   * 어느 갈래도 아닌 네 번째 상태로 먼저 가른다.
   */
  const hasValidAuthorId = Number.isInteger(authorId) && authorId > 0
  const mode = params.mode === "following" ? "following" : "followers"
  const modeLabelKey =
    mode === "following"
      ? "community.author.following"
      : "community.author.followers"
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCommunityFollowList(authorId, mode)

  const failure = resolveError(error)
  const showSkeleton = isLoading && data.length === 0
  const showError = isError && data.length === 0

  /*
    세 갈래를 한 자리에 둔다(`app/community-library.tsx` 와 같은 모양):
    스켈레톤 → 오류(+ 다시 해서 될 때만 재시도) → 정직한 비었음.
    예전에는 `const { data = [] }` 하나뿐이라 오프라인에서도 헤더 아래가 흰 판이었고,
    사용자에게는 재시도도 설명도 없었다.
  */
  const listEmpty = showSkeleton ? (
    <V2SkeletonGroup style={styles.skeletonWrap}>
      {[0, 1, 2, 3, 4].map((index) => (
        <View key={index} style={styles.skeletonRow}>
          <V2Skeleton width={48} height={48} radius="full" />
          <V2Skeleton width={132} height={16} radius="sm" />
        </View>
      ))}
    </V2SkeletonGroup>
  ) : showError ? (
    <View style={styles.stateWrap}>
      <ErrorMessage
        title={failure.title}
        message={failure.body ?? ""}
        onRetry={failure.retryable ? () => void refetch() : undefined}
        retryLabel={t("action.retry")}
      />
    </View>
  ) : (
    /*
      축마다 다른 문장을 쓴다 — "아직 팔로워가 없어요" 와 "아직 팔로우한 사람이
      없어요" 는 같은 말이 아니다. 예전에는 두 축 모두 `팔로워 0` 처럼 축 이름과
      수만 적었는데, 그건 문구가 아니라 자리 표시였다.

      손으로 그리던 한 줄을 `V2EmptyState tone="quiet"` 로 옮겼다 — 손으로 만들면
      화면은 멀쩡한데 `empty_state_viewed` 가 아무것도 안 나간다(**D15**).

      ─── 컨트롤이 **없는** 이유 (2026-08-21) ────────────────────────────────
      "팔로우할 사람 찾기" 가 맞는 탈출구인 것은 **내 팔로잉 목록**일 때뿐이다. 그런데
      이 화면은 자기가 누구의 목록인지 모른다 — 라우트가 주는 것은 `?id=`·`?mode=` 뿐이고,
      목록 응답(`CommunityAuthorSummary`)에도 `isMine` 이 없다(이 파일 머리말). 남의
      팔로잉 목록에서 "팔로우할 사람 찾기" 는 엉뚱한 말이다. 데려갈 목적지도 아직 없다 —
      신신이웃 디렉터리(`community_neighbors`)는 표면만 있고 라우트는 Phase 2 다.
      모르는 것을 아는 척하는 버튼보다 한 줄로 두는 편이 낫다.
    */
    <V2EmptyState
      surface="community_connections"
      tone="quiet"
      description={t(
        mode === "following"
          ? "community.author.emptyFollowing"
          : "community.author.emptyFollowers",
      )}
      style={styles.stateWrap}
    />
  )

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: surface.hairline }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </Pressable>
        <Text style={[styles.title, { color: surface.textStrong }]}>
          {t(modeLabelKey)}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      {hasValidAuthorId ? (
        <FlashList
          data={data}
          renderItem={({ item }) => <ConnectionRow author={item} />}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.divider, { backgroundColor: surface.hairline }]}
            />
          )}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      ) : (
        /* 주소가 가리키는 사람이 없다. 재시도는 그리지 않는다 — 같은 주소로
           다시 물어도 같은 답이고, 눌러도 안 되는 버튼은 안내가 아니다. */
        <View style={styles.stateWrap}>
          <ErrorMessage
            title={t("community.author.notFound")}
            message={t("notFound.description")}
          />
        </View>
      )}
    </View>
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
  title: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  headerSpacer: { width: 24 },
  row: {
    minHeight: 80,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  rowCopy: { flex: 1, gap: 3 },
  name: {
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: "Pretendard-SemiBold",
    fontWeight: "600",
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 80 },
  stateWrap: { paddingHorizontal: 20, paddingTop: 40 },
  skeletonWrap: { paddingTop: 8 },
  skeletonRow: {
    minHeight: 80,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
})
